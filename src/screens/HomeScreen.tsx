import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  Box,
  Text,
  ScrollView,
  VStack,
  HStack,
  Pressable,
  Button,
  ButtonText,
  Input,
  InputField,
} from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { Modal, View, Pressable as RNPressable, Linking, Alert, ImageBackground, Share, Image, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import * as Location from 'expo-location';
import { haversineMeters } from '../utils/geo';
import QRCode from 'react-native-qrcode-svg';
import { useSettings } from '../context/SettingsContext';
import { useVerificationAccess } from '../context/VerificationAccessContext';
import { useWalletBalance, USD_TO_MXN, WELCOME_BONUS_LUXAE } from '../context/WalletBalanceContext';
import { TOKEN_SYMBOL } from '../constants/luxToken';
import PromoSignupPopUp from '../components/PromoSignupPopUp';
import PromotionCard from '../components/PromotionCard';
import {
  getPromotions,
  ApiPromotionDoc,
  promotionImageUrl,
  getStoreCoordinatesFromDoc,
  isGpsCouponRequired,
  getLocationRadiusFromDoc,
} from '../services/promotionsApi';
import {
  getCoffeePunches,
  setCoffeePunches,
  getKycForm,
  getPreferredMall,
  getCachedPromotions,
  setCachedPromotions,
  getWalletAddresses,
} from '../services/storage';
import type { PreferredMall } from '../services/storage';
import { sendLoyaltyToServer, COFFEE_THRESHOLD } from '../services/loyaltyApi';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { getOrCreateDeviceId } from '../services/deviceIdentity';
import { createDiscountQrToken } from '../services/discountQrApi';
import { pickDefaultWalletAddress } from '../utils/walletQr';
import { formatAddressForUi } from '../utils/addressDisplay';
import AddressPayReceiveModal from '../components/AddressPayReceiveModal';

export type InfluencerPlatform = 'youtube' | 'tiktok' | 'instagram';


const PLATFORM_OPTIONS: { id: InfluencerPlatform; label: string; short: string; selectedBg: string }[] = [
  { id: 'youtube', label: 'YouTube', short: 'YT', selectedBg: '#FF0000' },
  { id: 'tiktok', label: 'TikTok', short: 'TikTok', selectedBg: '#000000' },
  { id: 'instagram', label: 'Instagram', short: 'IG', selectedBg: '#E4405F' },
];

function getIndexTranslations(language: 'en' | 'es') {
  if (language === 'es') {
    return {
      greetingMorning: 'Buenos días',
      greetingAfternoon: 'Buenas tardes',
      greetingEvening: 'Buenas noches',
      noRegistration: 'Sin registro',
      rewards: 'Recompensas',
      rewardsTitle: 'L4D Recompensas',
      balance: 'Saldo',
      tapForCard: 'toca para tarjeta',
      luxae: TOKEN_SYMBOL,
      toNextReward: `${TOKEN_SYMBOL} para la próxima recompensa`,
      order: 'Pedir',
      relax: 'relájate, ya estamos procesando tu pedido',
      specialToday: 'Especial para hoy',
      recommendations: 'Recomendaciones para ti',
      home: 'Inicio',
      wallet: 'Billetera',
      favorite: 'Favoritos',
      profile: 'Perfil',
      storeName: 'Centro Comercial Principal',
      storeAddress: 'Calle Principal No. 123, Ciudad...',
      banner1Title: 'FIN DE SEMANA BIEN PASADO',
      banner1Offer: 'Compra 1 Bebida y 1 Comida, Obtén Bebida Gratis',
      banner2Title: 'OFERTA ESPECIAL',
      banner2Offer: 'Descuento del 20% en todos los productos',
      termsApply: 'Términos y condiciones aplican',
      productChocolate: 'Bebida Chocolate',
      productGreen: 'Bebida Verde',
      productSandwich: 'Sandwich Especial',
      productPink: 'Bebida Rosa',
      noRecommendations: 'No hay recomendaciones disponibles en este momento',
      currencySymbol: 'COP',
      redeemed: 'Canjeado',
      showAtShop: 'Muestra este QR en la tienda',
      close: 'Cerrar',
      discountQr: 'QR de descuento',
      showDiscountQr: 'Muestra este QR en la tienda para aplicar el descuento',
      off: 'de descuento',
      smartContractLink: 'Ver smart contract',
      coffeeCardTitle: '10 cafés = 1 gratis',
      coffeeCardSubtitle: 'Llevas %d cafés. Con %s más tienes uno gratis.',
      coffeeQr: 'QR',
      coffeeHistoryTitle: 'Cafés en tu historial',
      coffeeShowAtShop: 'Muestra este QR en la tienda',
      coffeeOnlyAtPreferred: 'Solo disponible en tu café preferido. Elige uno en Ajustes.',
      coffeeSetPreferred: 'Elige tu café preferido en Ajustes para usar el contador.',
      goToSettings: 'Ir a Ajustes',
      kycProgress: 'Datos KYC',
      registerDrinkTitle: 'Registrar consumo',
      registerDrinkSubtitle: 'Muestra este QR en la tienda para registrar tu bebida.',
      done: 'Listo',
      ok: 'Aceptar',
      statusSynced: 'Estado sincronizado',
      statusSyncedMessage: 'Tu energía cafetera de la semana es increíble. Tienes un cupón extra para compartir.',
      searchInfluencers: 'Buscar influencers...',
      searchInfluencersByPlatform: 'Influencers en',
      searchEmpty: 'Escribe un nombre o tema para buscar',
      openingSearch: 'Abriendo búsqueda en',
      uploadScreenshot: 'Subir screenshot',
      screenshotSuggestion: 'Sube aquí tu screenshot del influencer, ¡qué quieres ver si tiene cupones activos!',
      screenshotPermission: 'Se necesita permiso para acceder a las fotos.',
      openGallery: 'Subir',
      cancel: 'Cancelar',
      qrGenerating: 'Generando cupón...',
      qrOneTime: 'Este cupón se puede redimir una sola vez.',
      qrExpiresIn: 'Expira en',
      qrExpired: 'Cupón expirado. Vuelve a generarlo.',
      qrCreateFailed: 'No se pudo generar el cupón QR.',
      couponErrorTitle: 'No se pudo generar el cupón',
      couponErrorMessage: 'Revisa tu conexión a internet y vuelve a intentar. Si el problema continúa, inténtalo más tarde.',
      couponRetry: 'Reintentar',
      promotionLabel: 'Promoción',
      discountLabel: 'de descuento',
      couponGeneratedTitle: '¡Cupón Generado!',
      couponSuccessMessage: 'Tu cupón ha sido creado exitosamente. Escanea el código QR o usa el código manual.',
      couponCodeLabel: 'Código del cupón',
      tokenQrLabel: 'Token QR',
      validFor: 'Válido por',
      smartContractAddress: 'Smart contract',
      sendToMyApp: 'Envíame este cupón a mi app',
      contactWhatsApp: 'Contactar por WhatsApp',
      sendCouponToWhatsApp: 'Enviarme el cupón a mi WhatsApp',
      goToBuyTitle: '¡Ir a comprar!',
      goToBuyTitleAmazon: '¡Comprar en Amazon!',
      goToBuyButton: 'Ir a comprar',
      goToBuyButtonAmazon: 'Comprar en Amazon',
      redeemCoupon: 'Redimir cupón',
      welcomeBonusCta: `Recibe 25 ${TOKEN_SYMBOL} (≈ %s MXN) al completar tu registro.`,
      luxaeRateUsd: `25 ${TOKEN_SYMBOL} = 25 USD`,
      luxaeRateMxn: '≈ %s MXN',
      yourMall: 'Tu tienda',
      viewOffers: 'Ver ofertas',
      geoStoreMissing:
        'Esta promoción no tiene coordenadas de tienda. No se puede validar por GPS.',
      geoPermissionDenied: 'Activa el permiso de ubicación para obtener el cupón en tienda.',
      geoTooFar: (d: number, r: number) =>
        `Estás a ${Math.round(d)} m del punto. Debes estar a máximo ${r} m para este cupón.`,
      geoLocationError: 'No se pudo leer tu ubicación. Intenta de nuevo.',
    };
  }
  return {
    greetingMorning: 'Good Morning',
    greetingAfternoon: 'Good Afternoon',
    greetingEvening: 'Good Evening',
    noRegistration: 'Unregistered',
    rewards: 'Rewards',
    rewardsTitle: 'L4D Rewards',
    balance: 'Balance',
    tapForCard: 'tap for card',
    luxae: TOKEN_SYMBOL,
    toNextReward: `${TOKEN_SYMBOL} to next reward`,
    order: 'Order',
    relax: 'relax we are already process your order',
    specialToday: 'Special for today',
    recommendations: 'Recommendations for you',
    home: 'Home',
    wallet: 'Wallet',
    favorite: 'Favorite',
    profile: 'Profile',
    storeName: 'Main Shopping Center',
    storeAddress: 'Main Street No. 123, City...',
    banner1Title: 'WEEKEND WELL SPENT',
    banner1Offer: 'Buy 1 Beverage & 1 Food, Get Free Beverage',
    banner2Title: 'SPECIAL OFFER',
    banner2Offer: '20% off on all products',
    termsApply: 'Terms & conditions apply',
    productChocolate: 'Chocolate Drink',
    productGreen: 'Green Drink',
    productSandwich: 'Special Sandwich',
    productPink: 'Pink Drink',
    noRecommendations: 'No recommendations available at this time',
    currencySymbol: '$',
    redeemed: 'Redeemed',
    showAtShop: 'Show this QR at the shop',
    close: 'Close',
    discountQr: 'Discount QR',
    showDiscountQr: 'Show this QR at the shop to apply the discount',
    off: 'off',
    smartContractLink: 'View smart contract',
    coffeeCardTitle: '10 coffees = 1 free',
    coffeeCardSubtitle: "You've had %d coffees. %s more and you get one free.",
    coffeeQr: 'QR',
    coffeeHistoryTitle: 'Coffees in your history',
    coffeeShowAtShop: 'Show this QR at the shop',
    coffeeOnlyAtPreferred: 'Only valid at your preferred café. Set one in Settings.',
    coffeeSetPreferred: 'Choose your preferred café in Settings to use the counter.',
    goToSettings: 'Go to Settings',
    kycProgress: 'KYC data',
    registerDrinkTitle: 'Register drink',
    registerDrinkSubtitle: 'Show this QR at the shop to register your drink.',
    done: 'Done',
    ok: 'OK',
    statusSynced: 'Status synced',
    statusSyncedMessage: "Your weekly coffee energy is amazing. You've got an extra coupon to share.",
    yourMall: 'Your Mall',
    viewOffers: 'View offers',
    geoStoreMissing: 'This promotion has no store coordinates. GPS validation is not possible.',
    geoPermissionDenied: 'Enable location permission to get the in-store coupon.',
    geoTooFar: (d: number, r: number) =>
      `You are ${Math.round(d)} m from the point. You must be within ${r} m for this coupon.`,
    geoLocationError: 'Could not read your location. Try again.',
    searchInfluencers: 'Search influencers...',
    searchInfluencersByPlatform: 'Influencers on',
    searchEmpty: 'Enter a name or topic to search',
    openingSearch: 'Opening search on',
    uploadScreenshot: 'Upload screenshot',
    screenshotSuggestion: 'Upload here your influencer screenshot to see if they have active coupons!',
    screenshotPermission: 'Permission to access photos is required.',
    openGallery: 'Upload',
    cancel: 'Cancel',
    qrGenerating: 'Generating coupon...',
    qrOneTime: 'This coupon can be redeemed only once.',
    qrExpiresIn: 'Expires in',
    qrExpired: 'Coupon expired. Generate a new one.',
    qrCreateFailed: 'Could not generate QR coupon.',
    couponErrorTitle: 'Could not generate coupon',
    couponErrorMessage: 'Check your internet connection and try again. If the problem continues, try again later.',
    couponRetry: 'Retry',
    promotionLabel: 'Promotion',
    discountLabel: 'off',
    couponGeneratedTitle: 'Coupon generated!',
    couponSuccessMessage: 'Your coupon was created successfully. Scan the QR code or use the manual code.',
    couponCodeLabel: 'Coupon code',
    tokenQrLabel: 'QR token',
    validFor: 'Valid for',
    smartContractAddress: 'Smart contract',
    sendToMyApp: 'Send this coupon to my app',
    contactWhatsApp: 'Contact via WhatsApp',
    sendCouponToWhatsApp: 'Send me the coupon to my WhatsApp',
    goToBuyTitle: 'Go to buy!',
    goToBuyTitleAmazon: 'Buy on Amazon!',
    goToBuyButton: 'Go to buy',
    goToBuyButtonAmazon: 'Buy on Amazon',
    redeemCoupon: 'Redeem coupon',
    welcomeBonusCta: `Get 25 ${TOKEN_SYMBOL} (25 USD) when you complete sign-up.`,
    luxaeRateUsd: `25 ${TOKEN_SYMBOL} = 25 USD`,
    luxaeRateMxn: '≈ %s MXN',
  };
}

// Mockup URL; replace with your blockchain contract explorer later
const SMART_CONTRACT_MOCKUP_URL = 'https://damecodigo.com/smart-contract';

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function deriveSmartContractAddress(qrValue: string): string {
  const hex = qrValue
    .slice(0, 20)
    .split('')
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 40);
  return '0x' + hex;
}

const SMART_CONTRACT_NETWORKS = ['Solana', 'XRP', 'Ethereum', 'Avalanche'] as const;

const KYC_FIELD_KEYS = ['fullName', 'idType', 'idNumber', 'dateOfBirth', 'address', 'city', 'country', 'email', 'phone'];
const KYC_TOTAL_FIELDS = KYC_FIELD_KEYS.length;

export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Home'>>();
  const currentRoute = route.name ?? 'Home';
  const mainScrollRef = useRef<import('react-native').ScrollView | null>(null);
  const [promoSectionY, setPromoSectionY] = useState(0);
  const { language, userName } = useSettings();
  const { revealWalletAddresses, refreshVerificationAccess } = useVerificationAccess();
  const { formattedBalance, formattedLuxaeBalance, luxaeBalance, currency } = useWalletBalance();
  const [redeemedProduct, setRedeemedProduct] = useState<{
    id: string;
    name: string;
    discountPercentage?: number;
    influencerId: string;
    referralCode: string;
    walletAddress: string;
    imageUrl?: string | null;
    /** Cupón con validación por ubicación (cerca del punto de tienda). */
    gpsGate?: boolean;
    storeLat?: number;
    storeLng?: number;
    radiusMeters?: number;
  } | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [secureRedeemCode, setSecureRedeemCode] = useState('');
  const [qrIssueState, setQrIssueState] = useState<'idle' | 'issuing' | 'ready' | 'error'>('idle');
  const [qrSecondsLeft, setQrSecondsLeft] = useState<number | null>(null);
  const [qrIssueError, setQrIssueError] = useState<string | null>(null);
  const [qrWarning, setQrWarning] = useState<string | null>(null);
  const [redirectToUrl, setRedirectToUrl] = useState<string | null>(null);
  const [specialProducts, setSpecialProducts] = useState<ApiPromotionDoc[]>([]);
  const [promosLoading, setPromosLoading] = useState(true);
  const [promosError, setPromosError] = useState<string | null>(null);
  const [coffeePunches, setCoffeePunchesState] = useState(4);
  const [coffeeSyncing, setCoffeeSyncing] = useState(false);
  const [showRewardsQRModal, setShowRewardsQRModal] = useState(false);
  const [showCoffeeQRModal, setShowCoffeeQRModal] = useState(false);
  const [kycPercent, setKycPercent] = useState(0);
  const [preferredMall, setPreferredMall] = useState<PreferredMall | null>(null);
  const [influencerPlatform, setInfluencerPlatform] = useState<InfluencerPlatform>('youtube');
  const [influencerSearchQuery, setInfluencerSearchQuery] = useState('');
  const [showUserQRModal, setShowUserQRModal] = useState(false);
  const [homeWalletAddress, setHomeWalletAddress] = useState<string | null>(null);

  const t = useMemo(() => getIndexTranslations(language), [language]);

  const openScreenshotPicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.ok, t.screenshotPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: (ImagePicker as any).MediaTypeOptions?.Images ?? ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      const uri = result.assets[0].uri;
      (navigation as any).navigate('InfluencerSearch', {
        imageUri: uri,
        platform: influencerPlatform,
      });
    }
  };

  const pickScreenshot = () => {
    Alert.alert(
      t.uploadScreenshot,
      t.screenshotSuggestion,
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.openGallery, onPress: openScreenshotPicker },
      ]
    );
  };

  const openInfluencerSearch = useCallback(() => {
    const query = influencerSearchQuery.trim();
    if (!query) {
      Alert.alert(t.searchEmpty, undefined, [{ text: t.ok }]);
      return;
    }
    (navigation as any).navigate('InfluencerSearch', {
      initialQuery: query,
      platform: influencerPlatform,
    });
  }, [influencerSearchQuery, influencerPlatform, navigation, t]);

  useFocusEffect(
    React.useCallback(() => {
      refreshVerificationAccess();
      getKycForm().then((data) => {
        const filled = KYC_FIELD_KEYS.filter((k) => (data[k] ?? '').trim().length > 0).length;
        setKycPercent(Math.round((filled / KYC_TOTAL_FIELDS) * 100));
      });
      getPreferredMall().then(setPreferredMall);
      getWalletAddresses().then((list) => {
        setHomeWalletAddress(pickDefaultWalletAddress(list));
      });
    }, [refreshVerificationAccess])
  );

  const loadPromotions = React.useCallback(() => {
    setPromosError(null);
    setPromosLoading(true);
    getCachedPromotions().then((cached) => {
      if (Array.isArray(cached) && cached.length > 0) {
        setSpecialProducts(cached as ApiPromotionDoc[]);
      }
    });
    getPromotions({ limit: 12, page: 1, status: 'active' })
      .then((res) => {
        if (res.ok) {
          const docs = res.docs ?? [];
          setSpecialProducts(docs);
          setCachedPromotions(docs);
        } else {
          setPromosError(res.error ?? 'Error');
        }
      })
      .finally(() => setPromosLoading(false));
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadPromotions();
    }, [loadPromotions])
  );

  useFocusEffect(
    React.useCallback(() => {
      const wantScroll = route.params?.scrollToPromotions;
      if (!wantScroll || promoSectionY <= 0) return undefined;
      const id = setTimeout(() => {
        mainScrollRef.current?.scrollTo({ y: Math.max(0, promoSectionY - 12), animated: true });
        navigation.setParams({ scrollToPromotions: undefined } as RootStackParamList['Home']);
      }, 350);
      return () => clearTimeout(id);
    }, [route.params?.scrollToPromotions, promoSectionY, navigation])
  );

  React.useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId).catch(() => setDeviceId('dev_unknown'));
  }, []);

  React.useEffect(() => {
    if (qrIssueState !== 'ready' || qrSecondsLeft == null) return;
    const id = setInterval(() => {
      setQrSecondsLeft((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          setQrIssueState('error');
          setQrIssueError('expired');
          setSecureRedeemCode('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [qrIssueState, qrSecondsLeft]);

  React.useEffect(() => {
    getCoffeePunches().then(setCoffeePunchesState);
  }, []);

  const syncCoffeeToServer = React.useCallback(async () => {
    setCoffeeSyncing(true);
    const payload = {
      programId: 'coffee',
      punches: coffeePunches,
      threshold: COFFEE_THRESHOLD,
      userId: deviceId || undefined,
      userName: userName ?? undefined,
      locationId: preferredMall?.id,
    };
    const res = await sendLoyaltyToServer(payload);
    setCoffeeSyncing(false);
    if (res.ok) {
      await setCoffeePunches(coffeePunches);
    }
  }, [coffeePunches, userName, deviceId, preferredMall?.id]);

  const rewardsQRValue = useMemo(
    () => `LINK4DEAL-CONSUME-${(userName || 'user').replace(/\s/g, '_')}-${Date.now()}`,
    [userName, showRewardsQRModal]
  );

  const [coffeeQRMinuteSlot, setCoffeeQRMinuteSlot] = useState(() => Math.floor(Date.now() / 60000));
  React.useEffect(() => {
    if (!showCoffeeQRModal) return;
    setCoffeeQRMinuteSlot(Math.floor(Date.now() / 60000));
    const interval = setInterval(() => {
      setCoffeeQRMinuteSlot(Math.floor(Date.now() / 60000));
    }, 60000);
    return () => clearInterval(interval);
  }, [showCoffeeQRModal]);

  const coffeeQRValue = useMemo(() => {
    const userId = deviceId || 'anonymous';
    const locationId = preferredMall?.id || 'none';
    const userSlug = (userName || 'user').replace(/\s/g, '_');
    return `LINK4DEAL-COFFEE-${userId}-${locationId}-${coffeeQRMinuteSlot}-${userSlug}-${coffeePunches}`;
  }, [deviceId, preferredMall?.id, coffeeQRMinuteSlot, userName, coffeePunches]);

  const runIssueCouponQr = React.useCallback(async () => {
    if (!redeemedProduct || !deviceId) return;
    setQrIssueState('issuing');
    setQrIssueError(null);
    setQrWarning(null);
    setQrSecondsLeft(null);
    setRedirectToUrl(null);

    let clientLatitude: number | undefined;
    let clientLongitude: number | undefined;

    if (redeemedProduct.gpsGate) {
      if (redeemedProduct.storeLat == null || redeemedProduct.storeLng == null) {
        setSecureRedeemCode('');
        setQrIssueState('error');
        setQrIssueError(t.geoStoreMissing);
        return;
      }
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setSecureRedeemCode('');
          setQrIssueState('error');
          setQrIssueError(t.geoPermissionDenied);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const user = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        const store = { lat: redeemedProduct.storeLat, lng: redeemedProduct.storeLng };
        const d = haversineMeters(user, store);
        const r = redeemedProduct.radiusMeters ?? 500;
        if (d > r) {
          setSecureRedeemCode('');
          setQrIssueState('error');
          setQrIssueError(t.geoTooFar(d, r));
          return;
        }
        clientLatitude = user.lat;
        clientLongitude = user.lng;
      } catch {
        setSecureRedeemCode('');
        setQrIssueState('error');
        setQrIssueError(t.geoLocationError);
        return;
      }
    }

    try {
      const res = await createDiscountQrToken({
        deviceId,
        influencerId: redeemedProduct.influencerId,
        promotionId: redeemedProduct.id,
        referralCode: redeemedProduct.referralCode,
        discountPercentage: redeemedProduct.discountPercentage ?? 0,
        walletAddress: redeemedProduct.walletAddress,
        clientLatitude,
        clientLongitude,
      });
      if (res.ok && res.noQr && res.redirectToUrl) {
        setRedirectToUrl(res.redirectToUrl);
        setQrIssueState('redirect');
        setSecureRedeemCode('');
        return;
      }
      if (res.ok && res.qrValue) {
        setSecureRedeemCode(res.qrValue);
        setQrIssueState('ready');
        setQrSecondsLeft(res.ttlSeconds ?? 300);
        setQrWarning(res.fallback ? (res.message ?? null) : null);
        return;
      }
      setSecureRedeemCode('');
      setQrIssueState('error');
      setQrIssueError(res.message ?? null);
    } catch {
      setSecureRedeemCode('');
      setQrIssueState('error');
      setQrIssueError('Network error');
      setQrWarning(null);
    }
  }, [redeemedProduct, deviceId, t]);

  React.useEffect(() => {
    if (!redeemedProduct || !deviceId) {
      setSecureRedeemCode('');
      setQrIssueState('idle');
      setQrSecondsLeft(null);
      setQrIssueError(null);
      setQrWarning(null);
      setRedirectToUrl(null);
      return;
    }
    runIssueCouponQr();
  }, [redeemedProduct, deviceId, runIssueCouponQr]);

  const handleRetryCoupon = React.useCallback(() => {
    if (!redeemedProduct || !deviceId) return;
    runIssueCouponQr();
  }, [redeemedProduct, deviceId, runIssueCouponQr]);

  const appName = language === 'es' ? 'damecodigo' : 'link4deal';
  const displayName = (userName?.trim() || t.noRegistration);

  const closeRewardsQRAndShowSynced = React.useCallback(() => {
    setShowRewardsQRModal(false);
    syncCoffeeToServer().then(() => {
      Alert.alert(t.statusSynced, t.statusSyncedMessage, [{ text: t.ok }]);
    });
  }, [syncCoffeeToServer, t]);

  const rewardsData = {
    current: luxaeBalance,
    target: 100,
  };
  const luxaeRateMxnValue = (WELCOME_BONUS_LUXAE * USD_TO_MXN).toLocaleString('es-MX', { maximumFractionDigits: 0 });

  // Greeting by time of day: morning (< 12), afternoon (12–17), evening (18+)
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t.greetingMorning;   // "Good Morning" / "Buenos días"
    if (hour < 18) return t.greetingAfternoon; // "Good Afternoon" / "Buenas tardes"
    return t.greetingEvening;                   // "Good Evening" / "Buenas noches"
  }, [t.greetingMorning, t.greetingAfternoon, t.greetingEvening]);

  const hasActiveOrder = true;

  const formatDateTimeInternational = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
  };

  const [currentDateTime, setCurrentDateTime] = useState(() => formatDateTimeInternational(new Date()));
  React.useEffect(() => {
    const interval = setInterval(() => setCurrentDateTime(formatDateTimeInternational(new Date())), 60000);
    return () => clearInterval(interval);
  }, []);

  const bgImageSource = { uri: 'https://images.unsplash.com/photo-1770576568718-6747e3d85de8?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' };

  return (
    <Box flex={1} bg="$white">
      <StatusBar style="light" />
      {/* Barra superior: menú, app name, y guía parcial KYC */}
      <Box bg="#00704A" pt="$12" pb="$2" px="$4">
        <Box flexDirection="row" alignItems="center" justifyContent="space-between">
          <Pressable
            onPress={() => (navigation as any).openDrawer()}
            p="$2"
            hitSlop={8}
            _pressed={{ opacity: 0.8 }}
          >
            <Text fontSize="$2xl" color="$white" fontWeight="$bold">☰</Text>
          </Pressable>
          <Text fontSize="$lg" fontWeight="$bold" color="$white">
            {appName.toUpperCase()}
          </Text>
          <Box width={36} />
        </Box>
        <Box mt="$2">
          <HStack alignItems="center" justifyContent="space-between" mb="$1">
            <Text fontSize="$xs" color="$white" opacity={0.9}>
              {t.kycProgress}
            </Text>
            <Text fontSize="$xs" color="$white" fontWeight="$semibold">
              {kycPercent}%
            </Text>
          </HStack>
          <Box h={4} bg="rgba(255,255,255,0.3)" borderRadius="$full" overflow="hidden">
            <Box h="100%" bg="$white" width={`${Math.min(100, kycPercent)}%`} borderRadius="$full" />
          </Box>
        </Box>
      </Box>
      <ImageBackground
        source={bgImageSource}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <ScrollView 
          ref={mainScrollRef}
          flex={1} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
        >
          <VStack space="md" px="$4" pt="$4">
          <VStack space="xs">
            <Text fontSize="$3xl" fontWeight="$bold" color="#00704A">
              {greeting},
            </Text>
            {!(userName?.trim()) ? (
              <Pressable
                onPress={() => (navigation as any).navigate('NYC')}
                bg="$white"
                borderRadius="$lg"
                px="$4"
                py="$3"
                alignSelf="flex-start"
                borderWidth={1}
                borderColor="$borderLight200"
                _pressed={{ opacity: 0.85 }}
              >
                <Text fontSize="$xl" fontWeight="$semibold" color="#00704A" textDecorationLine="underline">
                  {displayName}
                </Text>
                <Text fontSize="$xs" color="$textLight500" mt="$1">
                  {language === 'es' ? 'Toca para ir al registro (KYC)' : 'Tap to go to sign up (KYC)'}
                </Text>
                <Text fontSize="$xs" color="#00704A" fontWeight="$medium" mt="$1">
                  {language === 'es' ? t.welcomeBonusCta.replace('%s', luxaeRateMxnValue) : t.welcomeBonusCta}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setShowUserQRModal(true)}
                bg="$white"
                borderRadius="$lg"
                px="$4"
                py="$3"
                alignSelf="flex-start"
                borderWidth={1}
                borderColor="$borderLight200"
                _pressed={{ opacity: 0.85 }}
              >
                <Text fontSize="$xl" fontWeight="$semibold" color="#00704A">
                  {displayName}
                </Text>
                {homeWalletAddress ? (
                  <VStack space="xs" mt="$1">
                    <Text fontSize="$xs" color="$textLight500" numberOfLines={1}>
                      {formatAddressForUi(homeWalletAddress, revealWalletAddresses)}
                    </Text>
                    {!revealWalletAddresses ? (
                      <Text fontSize="$xs" color="$textLight400">
                        {language === 'es'
                          ? 'Completa verificación KYC o KYB para ver la dirección completa.'
                          : 'Complete KYC or KYB verification to see your full address.'}
                      </Text>
                    ) : null}
                  </VStack>
                ) : (
                  <Text fontSize="$xs" color="$textLight400" mt="$1">
                    {language === 'es' ? 'Sin dirección en Billetera' : 'No Wallet address'}
                  </Text>
                )}
                <Text fontSize="$xs" color="$textLight500" mt="$1">
                  {language === 'es'
                    ? 'Toca para ver tu QR (identificación, pago y cobro con tu dirección de Billetera)'
                    : 'Tap for your QR (ID, pay & receive with your Wallet address)'}
                </Text>
              </Pressable>
            )}
            <Text fontSize="$sm" color="$textLight500">
              {currentDateTime}
            </Text>
          </VStack>

          {/* Buscador de influencers: debajo del nombre del usuario */}
          <Box bg="$white" borderRadius="$lg" px="$3" py="$2" borderWidth={1} borderColor="$borderLight200">
            <HStack alignItems="center" space="sm">
              <HStack space="xs" alignItems="center" flex={0}>
                {PLATFORM_OPTIONS.map((p) => {
                  const isSelected = influencerPlatform === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setInfluencerPlatform(p.id)}
                      bg={isSelected ? p.selectedBg : '$backgroundLight100'}
                      borderRadius="$full"
                      px="$2.5"
                      py="$1.5"
                      _pressed={{ opacity: 0.85 }}
                    >
                      <Text fontSize="$xs" fontWeight="$semibold" color={isSelected ? '$white' : '$textLight700'}>
                        {p.short}
                      </Text>
                    </Pressable>
                  );
                })}
              </HStack>
              <Input flex={1} size="sm" borderRadius="$lg" borderColor="$borderLight300" minHeight={36}>
                <InputField
                  placeholder={t.searchInfluencers}
                  value={influencerSearchQuery}
                  onChangeText={setInfluencerSearchQuery}
                  returnKeyType="search"
                  onSubmitEditing={openInfluencerSearch}
                />
              </Input>
              <Pressable
                onPress={openInfluencerSearch}
                bg="#1a73e8"
                borderRadius="$lg"
                px="$3"
                py="$2"
                alignItems="center"
                justifyContent="center"
                _pressed={{ opacity: 0.9 }}
                accessibilityLabel={t.searchInfluencers}
              >
                <Text fontSize="$xl">🔍</Text>
              </Pressable>
              <Pressable
                onPress={pickScreenshot}
                bg="#00704A"
                borderRadius="$lg"
                p="$2"
                minWidth={40}
                alignItems="center"
                justifyContent="center"
                _pressed={{ opacity: 0.9 }}
                accessibilityLabel={t.uploadScreenshot}
              >
                <Text fontSize="$xl">🖼️</Text>
              </Pressable>
            </HStack>
          </Box>

          {/* Preferred mall - Ver ofertas */}
          {preferredMall && (
            <Pressable
              onPress={() => (navigation as any).navigate('PromotionsMap')}
              bg="$backgroundLight100"
              borderRadius="$xl"
              p="$4"
              borderWidth={1}
              borderColor="$borderLight200"
              _pressed={{ opacity: 0.9 }}
            >
              <HStack justifyContent="space-between" alignItems="center">
                <VStack space="xs">
                  <Text fontSize="$sm" color="$textLight600">{t.yourMall}</Text>
                  <Text fontSize="$lg" fontWeight="$bold" color="#00704A">{language === 'es' ? (preferredMall.nameEs ?? preferredMall.name) : preferredMall.name}</Text>
                </VStack>
                <Text fontSize="$md" fontWeight="$semibold" color="#00704A">{t.viewOffers} →</Text>
              </HStack>
            </Pressable>
          )}

          {/* Rewards Card - tap to open QR para registrar consumo */}
          <Pressable
            onPress={() => setShowRewardsQRModal(true)}
            bg="#00704A"
            borderRadius="$xl"
            p="$4"
            mt="$4"
            _pressed={{ opacity: 0.95 }}
          >
            <VStack space="md">
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$lg" fontWeight="$bold" color="$white">
                  {t.rewardsTitle}
                </Text>
                <Text fontSize="$4xl">💵</Text>
              </HStack>
              <HStack space="md" alignItems="center">
                <VStack flex={1} space="xs">
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="$sm" color="$white" opacity={0.9}>
                      {rewardsData.current} {t.luxae}
                    </Text>
                  </HStack>
                  <Box
                    bg="rgba(255,255,255,0.3)"
                    h="$2"
                    borderRadius="$full"
                    overflow="hidden"
                  >
                    <Box
                      bg="$white"
                      h="100%"
                      width={`${Math.min(100, (rewardsData.current / rewardsData.target) * 100)}%`}
                    />
                  </Box>
                  <Text fontSize="$xs" color="$white" opacity={0.8}>
                    {language === 'es'
                      ? `${t.luxaeRateMxn.replace('%s', luxaeRateMxnValue)} · ${t.luxaeRateUsd}`
                      : `${t.luxaeRateUsd} · ${t.luxaeRateMxn.replace('%s', luxaeRateMxnValue)}`}
                  </Text>
                </VStack>
                <Box
                  bg="$white"
                  borderRadius="$lg"
                  p="$3"
                  minWidth={100}
                  alignItems="center"
                >
                  <Text fontSize="$xs" color="#00704A" fontWeight="$medium">
                    {t.balance}
                  </Text>
                  <Text fontSize="$lg" fontWeight="$bold" color="#00704A">
                    {formattedLuxaeBalance}
                  </Text>
                  <Text fontSize="$xs" color="#00704A" opacity={0.7}>
                    {t.tapForCard}
                  </Text>
                </Box>
              </HStack>
            </VStack>
          </Pressable>

          {/* Café: 10 cafés = 1 gratis; solo disponible en café preferido; QR rota cada 1 min */}
          <Box
            bg="$backgroundLight50"
            borderRadius="$xl"
            p="$4"
            borderLeftWidth={4}
            borderLeftColor="#00704A"
          >
            <Text fontSize="$md" fontWeight="$bold" color="#00704A" mb="$1">
              ☕ {t.coffeeCardTitle}
            </Text>
            {preferredMall ? (
              <>
                <Text fontSize="$xs" color="$textLight500" mb="$1">
                  {t.coffeeOnlyAtPreferred}
                </Text>
                <Text fontSize="$sm" color="$textLight700" mb="$2">
                  {t.coffeeCardSubtitle.replace('%d', String(coffeePunches)).replace('%s', String(Math.max(0, COFFEE_THRESHOLD - coffeePunches)))}
                </Text>
                <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap">
                  <HStack space="xs" alignItems="center">
                    {Array.from({ length: COFFEE_THRESHOLD }).map((_, i) => (
                      <Box
                        key={i}
                        w={8}
                        h={8}
                        borderRadius="$full"
                        bg={i < coffeePunches ? '#00704A' : '$borderLight300'}
                      />
                    ))}
                  </HStack>
                  <Pressable
                    onPress={() => setShowCoffeeQRModal(true)}
                    bg="#00704A"
                    borderRadius="$md"
                    px="$3"
                    py="$2"
                  >
                    <Text fontSize="$xs" color="$white" fontWeight="$medium">
                      {t.coffeeQr}
                    </Text>
                  </Pressable>
                </HStack>
              </>
            ) : (
              <>
                <Text fontSize="$sm" color="$textLight600" mb="$3">
                  {t.coffeeSetPreferred}
                </Text>
                <Pressable
                  onPress={() => (navigation as any).navigate('Settings')}
                  bg="#00704A"
                  borderRadius="$md"
                  px="$3"
                  py="$2"
                  alignSelf="flex-start"
                >
                  <Text fontSize="$xs" color="$white" fontWeight="$medium">
                    {t.goToSettings}
                  </Text>
                </Pressable>
              </>
            )}
          </Box>

          {/* Active Order Banner */}
          {hasActiveOrder && (
            <Box
              bg="#00704A"
              borderRadius="$lg"
              p="$3"
              mt="$2"
            >
              <HStack space="sm" alignItems="center">
                <Text fontSize="$xl">⚡</Text>
                <Text fontSize="$sm" color="$white" flex={1}>
                  {t.relax}
                </Text>
              </HStack>
            </Box>
          )}

          {/* Promociones activas (API): listado y QR de descuento */}
          <View
            onLayout={(e) => setPromoSectionY(e.nativeEvent.layout.y)}
            collapsable={false}
          >
          <VStack space="md" mt="$4">
            <VStack space="xs">
              <Text fontSize="$xl" fontWeight="$bold" color="$textLight900">
                {t.specialToday}
              </Text>
              {!promosLoading && specialProducts.length > 0 && (
                <Text fontSize="$sm" color="$textLight500">
                  {specialProducts.length} {language === 'es' ? 'promociones activas · Toca una y muestra el QR en la tienda' : 'active promotions · Tap one and show the QR at the shop'}
                </Text>
              )}
            </VStack>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              <HStack space="md">
                {promosLoading ? (
                  <Box width={160} height={180} bg="$backgroundLight100" borderRadius="$xl" justifyContent="center" alignItems="center">
                    <Text color="$textLight500">{language === 'es' ? 'Cargando...' : 'Loading...'}</Text>
                  </Box>
                ) : specialProducts.length === 0 ? (
                  <Box width={280} minHeight={140} bg="$backgroundLight100" borderRadius="$xl" justifyContent="center" alignItems="center" p="$4">
                    <Text fontSize="$sm" color="$textLight500" textAlign="center" mb="$2">
                      {promosError
                        ? (language === 'es' ? 'No se pudieron cargar las promociones.' : 'Could not load promotions.')
                        : (language === 'es' ? 'Sin promociones activas' : 'No active promotions')}
                    </Text>
                    {promosError ? (
                      <Text fontSize="$xs" color="$textLight400" textAlign="center" mb="$2">{promosError}</Text>
                    ) : null}
                    <Button size="sm" bg="#00704A" onPress={loadPromotions}>
                      <ButtonText>{language === 'es' ? 'Reintentar' : 'Retry'}</ButtonText>
                    </Button>
                  </Box>
                ) : (
                  specialProducts.map((doc) => (
                    <PromotionCard
                      key={doc._id}
                      doc={doc}
                      language={language}
                      compact
                      onPress={() => {
                        const rawInfluencer = (doc as any).influencerId ?? (doc as any).creatorId ?? 'guest';
                        const rawWallet = (doc as any).walletAddress ?? (doc as any).storeWalletAddress ?? 'not-provided';
                        const referralCode = `L4D-${doc._id}-${Date.now().toString(36).toUpperCase()}`;
                        const storePt = getStoreCoordinatesFromDoc(doc);
                        const gpsReq = isGpsCouponRequired(doc);
                        const radiusM = getLocationRadiusFromDoc(doc);
                        setRedeemedProduct({
                          id: doc._id,
                          name: doc.title || doc.productName || '',
                          discountPercentage: doc.discountPercentage,
                          influencerId: String(rawInfluencer),
                          referralCode,
                          walletAddress: String(rawWallet),
                          imageUrl: promotionImageUrl(doc) ?? undefined,
                          gpsGate: gpsReq,
                          storeLat: storePt?.lat,
                          storeLng: storePt?.lng,
                          radiusMeters: radiusM,
                        });
                      }}
                    />
                  ))
                )}
              </HStack>
            </ScrollView>
            </VStack>
          </View>

          {/* Recommendations for You */}
          <VStack space="md" mt="$4" pb="$4">
            <Text fontSize="$xl" fontWeight="$bold" color="$textLight900">
              {t.recommendations}
            </Text>
            <Box
              bg="$backgroundLight100"
              borderRadius="$lg"
              p="$8"
              alignItems="center"
            >
              <Text fontSize="$sm" color="$textLight500" textAlign="center">
                {t.noRecommendations}
            </Text>
          </Box>
          </VStack>
        </VStack>
      </ScrollView>
      </ImageBackground>

      {/* Bottom Navigation Bar */}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        bg="$white"
        borderTopWidth={1}
        borderTopColor="$borderLight200"
        px="$4"
        py="$2"
        safeAreaBottom
      >
        <HStack justifyContent="space-around" alignItems="center">
          <Pressable onPress={() => (navigation as any).navigate('Home')} _pressed={{ opacity: 0.7 }}>
            <VStack alignItems="center" space="xs">
              <Text fontSize="$xl">🏠</Text>
              <Text fontSize="$xs" color={currentRoute === 'Home' ? '#00704A' : '$textLight500'} fontWeight={currentRoute === 'Home' ? '$semibold' : '$normal'}>
                {t.home}
              </Text>
            </VStack>
          </Pressable>
          <Pressable onPress={() => (navigation as any).navigate('Home')} _pressed={{ opacity: 0.7 }}>
            <VStack alignItems="center" space="xs">
              <Text fontSize="$xl" opacity={currentRoute === 'Home' ? 1 : 0.5}>☕</Text>
              <Text fontSize="$xs" color={currentRoute === 'Home' ? '#00704A' : '$textLight500'}>
                {t.order}
              </Text>
            </VStack>
          </Pressable>
          <Pressable onPress={() => (navigation as any).navigate('Wallet')} _pressed={{ opacity: 0.7 }}>
            <VStack alignItems="center" space="xs">
              <Text fontSize="$xl" opacity={currentRoute === 'Wallet' ? 1 : 0.5}>💳</Text>
              <Text fontSize="$xs" color={currentRoute === 'Wallet' ? '#00704A' : '$textLight500'}>
                {t.wallet}
              </Text>
            </VStack>
          </Pressable>
          <Pressable onPress={() => (navigation as any).navigate('PromotionsMap')} _pressed={{ opacity: 0.7 }}>
            <VStack alignItems="center" space="xs">
              <Text fontSize="$xl" opacity={currentRoute === 'PromotionsMap' ? 1 : 0.5}>❤️</Text>
              <Text fontSize="$xs" color={currentRoute === 'PromotionsMap' ? '#00704A' : '$textLight500'}>
                {t.favorite}
              </Text>
            </VStack>
          </Pressable>
          <Pressable onPress={() => (navigation as any).navigate('Settings')} _pressed={{ opacity: 0.7 }}>
            <VStack alignItems="center" space="xs">
              <Text fontSize="$xl" opacity={currentRoute === 'Settings' ? 1 : 0.5}>👤</Text>
              <Text fontSize="$xs" color={currentRoute === 'Settings' ? '#00704A' : '$textLight500'}>
                {t.profile}
              </Text>
            </VStack>
          </Pressable>
        </HStack>
      </Box>

      {/* Discount QR modal: título y mensaje según estado; detalles de la promoción siempre visibles */}
      <Modal
        visible={!!redeemedProduct}
        transparent
        animationType="fade"
        onRequestClose={() => setRedeemedProduct(null)}
      >
        <RNPressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
          onPress={() => setRedeemedProduct(null)}
        >
          <RNPressable style={{ width: '100%', maxWidth: 360 }} onPress={(e) => e.stopPropagation()}>
            <Box bg="$white" borderRadius="$2xl" p="$5" alignItems="center" maxHeight="90%">
              {/* Detalles de la promoción: foto + nombre + descuento */}
              {redeemedProduct ? (
                <Box width="100%" mb="$3" p="$3" bg="$backgroundLight50" borderRadius="$lg" borderLeftWidth={4} borderLeftColor="#00704A">
                  {redeemedProduct.imageUrl ? (
                    <Box width="100%" height={120} borderRadius="$md" overflow="hidden" mb="$2" bg="$backgroundLight200">
                      <Image
                        source={{ uri: redeemedProduct.imageUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </Box>
                  ) : null}
                  <Text fontSize="$xs" color="$textLight500" mb="$1">{t.promotionLabel}</Text>
                  <Text fontSize="$md" fontWeight="$semibold" color="$textLight900" numberOfLines={2}>
                    {redeemedProduct.name}
                  </Text>
                  {redeemedProduct.discountPercentage != null && redeemedProduct.discountPercentage > 0 ? (
                    <Text fontSize="$sm" color="#00704A" fontWeight="$medium" mt="$1">
                      {redeemedProduct.discountPercentage}% {t.discountLabel}
                    </Text>
                  ) : null}
                </Box>
              ) : null}

              {/* Título según estado: error vs redirect vs éxito vs generando */}
              <Text fontSize="$xl" fontWeight="$bold" color={qrIssueState === 'error' ? '$error600' : '#00704A'} mb="$1">
                {qrIssueState === 'error'
                  ? t.couponErrorTitle
                  : qrIssueState === 'issuing'
                    ? t.qrGenerating
                    : qrIssueState === 'redirect' && redirectToUrl
                      ? (/amazon|amzn\.to/i.test(redirectToUrl) ? t.goToBuyTitleAmazon : t.goToBuyTitle)
                      : t.couponGeneratedTitle}
              </Text>
              {qrIssueState === 'ready' ? (
                <Text fontSize="$sm" color="$textLight600" mb="$3" textAlign="center" numberOfLines={3}>
                  {t.couponSuccessMessage}
                </Text>
              ) : qrIssueState === 'error' ? (
                <Text fontSize="$sm" color="$textLight600" mb="$3" textAlign="center" numberOfLines={4}>
                  {qrIssueError === 'expired' ? t.qrExpired : t.couponErrorMessage}
                </Text>
              ) : qrIssueState === 'redirect' ? (
                <Text fontSize="$sm" color="$textLight600" mb="$3" textAlign="center">
                  {language === 'es' ? 'Serás redirigido a la tienda para completar tu compra.' : 'You will be redirected to the store to complete your purchase.'}
                </Text>
              ) : null}
              {qrWarning && qrIssueState === 'ready' ? (
                <Text fontSize="$xs" color="#A16207" mb="$2" textAlign="center">
                  {qrWarning}
                </Text>
              ) : null}
              {qrIssueState === 'redirect' && redirectToUrl ? (
                <>
                  <Button size="lg" bg="#00704A" mb="$2" width="100%" onPress={() => Linking.openURL(redirectToUrl).catch(() => {})}>
                    <ButtonText>
                      {/amazon|amzn\.to/i.test(redirectToUrl) ? t.goToBuyButtonAmazon : t.goToBuyButton}
                    </ButtonText>
                  </Button>
                  <Button size="md" variant="outline" borderColor="#00704A" onPress={() => setRedeemedProduct(null)}>
                    <ButtonText color="#00704A">{t.close}</ButtonText>
                  </Button>
                </>
              ) : redeemedProduct && secureRedeemCode && qrIssueState === 'ready' ? (
                <>
                  <Box bg="$white" p="$4" borderRadius="$lg" borderWidth={1} borderColor="$borderLight200" mb="$3">
                    <QRCode value={secureRedeemCode} size={200} color="#00704A" backgroundColor="white" />
                  </Box>
                  {qrSecondsLeft != null && qrSecondsLeft > 0 ? (
                    <Text fontSize="$xs" color="$textLight500" mb="$2">
                      {t.validFor} {formatCountdown(qrSecondsLeft)}
                    </Text>
                  ) : null}
                  <Box width="100%" mb="$2">
                    <Text fontSize="$xs" color="$textLight500" mb="$1">{t.couponCodeLabel}</Text>
                    <Text fontSize="$sm" fontWeight="$medium" color="$textLight900" numberOfLines={1} selectable>
                      {redeemedProduct.referralCode}
                    </Text>
                  </Box>
                  <Box width="100%" mb="$3">
                    <Text fontSize="$xs" color="$textLight500" mb="$1">{t.tokenQrLabel}</Text>
                    <Text fontSize="$2xs" color="$textLight700" numberOfLines={2} selectable>
                      {secureRedeemCode}
                    </Text>
                  </Box>
                  <Box width="100%" mb="$3" p="$2" bg="$backgroundLight50" borderRadius="$md">
                    <Text fontSize="$xs" color="$textLight500" mb="$1">{t.smartContractAddress}</Text>
                    <Text fontSize="$2xs" color="$textLight700" numberOfLines={1} selectable>
                      {deriveSmartContractAddress(secureRedeemCode)}
                    </Text>
                    <HStack flexWrap="wrap" gap="$1" mt="$1">
                      {SMART_CONTRACT_NETWORKS.map((net) => (
                        <Box key={net} bg="$white" px="$2" py="$1" borderRadius="$sm" borderWidth={1} borderColor="$borderLight200">
                          <Text fontSize="$2xs" color="$textLight600">{net}</Text>
                        </Box>
                      ))}
                    </HStack>
                    <Pressable
                      mt="$2"
                      onPress={() => redeemedProduct && Linking.openURL(`https://damecodigo.com/promocion/${redeemedProduct.id}/smart-contract`).catch(() => {})}
                    >
                      <Text fontSize="$xs" color="#00704A" fontWeight="$medium" textDecorationLine="underline">
                        🔗 {t.smartContractLink}
                      </Text>
                    </Pressable>
                  </Box>
                  <Button size="sm" bg="#25D366" mb="$2" width="100%" onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(secureRedeemCode)}`).catch(() => {})}>
                    <ButtonText>{t.sendCouponToWhatsApp}</ButtonText>
                  </Button>
                  <Button size="sm" variant="outline" borderColor="#00704A" mb="$2" width="100%" onPress={() => Alert.alert(t.redeemCoupon, language === 'es' ? 'Presenta este QR en la tienda para redimir el cupón.' : 'Show this QR at the store to redeem the coupon.')}>
                    <ButtonText color="#00704A">{t.redeemCoupon}</ButtonText>
                  </Button>
                  <Pressable onPress={() => Share.share({ message: secureRedeemCode, title: t.couponCodeLabel }).catch(() => {})}>
                    <Text fontSize="$xs" color="$textLight500">{t.sendToMyApp}</Text>
                  </Pressable>
                  <Button mt="$4" size="md" bg="#00704A" onPress={() => setRedeemedProduct(null)}>
                    <ButtonText>{t.close}</ButtonText>
                  </Button>
                </>
              ) : qrIssueState === 'issuing' ? (
                <Text fontSize="$sm" color="$textLight500" py="$6">
                  {language === 'es' ? 'Creando tu cupón…' : 'Creating your coupon…'}
                </Text>
              ) : qrIssueState === 'error' ? (
                <>
                  <Button size="md" bg="#00704A" mb="$2" onPress={handleRetryCoupon}>
                    <ButtonText>{t.couponRetry}</ButtonText>
                  </Button>
                  <Button size="md" variant="outline" borderColor="#00704A" onPress={() => setRedeemedProduct(null)}>
                    <ButtonText color="#00704A">{t.close}</ButtonText>
                  </Button>
                </>
              ) : null}
            </Box>
          </RNPressable>
        </RNPressable>
      </Modal>

      {/* Rewards QR modal: registrar consumo de bebida en tienda */}
      <Modal
        visible={showRewardsQRModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRewardsQRModal(false)}
      >
        <RNPressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
          onPress={() => setShowRewardsQRModal(false)}
        >
          <View style={{ width: '100%', maxWidth: 320 }}>
            <Box bg="$white" borderRadius="$2xl" p="$6" alignItems="center">
              <Text fontSize="$xl" fontWeight="$bold" color="#00704A" mb="$1">
                {t.registerDrinkTitle}
              </Text>
              <Text fontSize="$sm" color="$textLight500" mb="$4" textAlign="center">
                {t.registerDrinkSubtitle}
              </Text>
              <Box bg="$white" p="$4" borderRadius="$lg" borderWidth={1} borderColor="$borderLight200">
                <QRCode value={rewardsQRValue} size={200} color="#00704A" backgroundColor="white" />
              </Box>
              <Button mt="$5" size="md" bg="#00704A" onPress={closeRewardsQRAndShowSynced}>
                <ButtonText>{t.done}</ButtonText>
              </Button>
              <Button mt="$2" size="sm" variant="link" onPress={() => setShowRewardsQRModal(false)}>
                <ButtonText color="$textLight500">{t.close}</ButtonText>
              </Button>
            </Box>
          </View>
        </RNPressable>
      </Modal>

      {/* Coffee QR modal: QR cambia cada 1 min; incluye userId, ubicación (café preferido) */}
      <Modal
        visible={showCoffeeQRModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCoffeeQRModal(false)}
      >
        <RNPressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
          onPress={() => setShowCoffeeQRModal(false)}
        >
          <View style={{ width: '100%', maxWidth: 320 }}>
            <Box bg="$white" borderRadius="$2xl" p="$6" alignItems="center">
              <Text fontSize="$lg" fontWeight="$bold" color="#00704A" mb="$1">
                ☕ {t.coffeeCardTitle}
              </Text>
              <Text fontSize="$md" color="$textLight700" mb="$1">
                {t.coffeeHistoryTitle}: <Text fontWeight="$bold" color="#00704A">{coffeePunches}</Text>
              </Text>
              {preferredMall && (
                <>
                  <Text fontSize="$xs" color="$textLight500" mb="$1">
                    {language === 'es' ? 'ID usuario' : 'User ID'}: <Text fontWeight="$medium">{deviceId ? `${deviceId.slice(0, 14)}…` : '—'}</Text>
                  </Text>
                  <Text fontSize="$xs" color="$textLight500" mb="$2">
                    {language === 'es' ? 'Ubicación' : 'Location'}: <Text fontWeight="$medium">{language === 'es' ? (preferredMall.nameEs ?? preferredMall.name) : preferredMall.name}</Text>
                  </Text>
                </>
              )}
              <Text fontSize="$xs" color="$textLight400" mb="$2">
                {language === 'es' ? 'El QR cambia cada 1 minuto.' : 'QR updates every 1 minute.'}
              </Text>
              <Text fontSize="$sm" color="$textLight500" mb="$4" textAlign="center">
                {t.coffeeShowAtShop}
              </Text>
              <Box bg="$white" p="$4" borderRadius="$lg" borderWidth={1} borderColor="$borderLight200">
                <QRCode value={coffeeQRValue} size={200} color="#00704A" backgroundColor="white" />
              </Box>
              <Button mt="$5" size="md" bg="#00704A" onPress={() => setShowCoffeeQRModal(false)}>
                <ButtonText>{t.close}</ButtonText>
              </Button>
            </Box>
          </View>
        </RNPressable>
      </Modal>

      <AddressPayReceiveModal
        visible={showUserQRModal}
        onClose={() => setShowUserQRModal(false)}
        initialIntent="receive"
      />

      <PromoSignupPopUp />
    </Box>
  );
}
