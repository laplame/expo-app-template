/**
 * Pantalla para crear promociones.
 * Ref: assets/docs/upload_promo.md
 * Si falta algo (error, validación), se ofrece redirigir al sitio web.
 */
import React, { useState, useMemo } from 'react';
import { ScrollView, Alert, Linking, Platform, ActionSheetIOS, Pressable as RNPressable, Image, Switch, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';

let DateTimePicker: React.ComponentType<any> | null = null;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch {
  DateTimePicker = null;
}
const hasDatePicker = DateTimePicker != null && Platform.OS !== 'web';
import {
  Box,
  Text,
  VStack,
  Input,
  InputField,
  Button,
  ButtonText,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  HStack,
  Pressable,
} from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useSettings } from '../context/SettingsContext';
import { useWalletBalance, USD_TO_MXN } from '../context/WalletBalanceContext';
import { TOKEN_SYMBOL } from '../constants/luxToken';
import {
  postPromotion,
  analyzePromotionImage,
  PromotionPayload,
  PromotionStoreLocation,
  SITE_PROMO_URLS,
  AnalyzeImageData,
} from '../services/promotionsApi';
import { logPromotionDebug, logPromotionWarn } from '../utils/uploadPromotionLog';

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toUsd(amount: number, c: 'USD' | 'MXN'): number {
  if (!Number.isFinite(amount)) return 0;
  return c === 'MXN' ? amount / USD_TO_MXN : amount;
}

/** Valor promocional en USD para vista previa (1 token ≈ 1 USD). */
function computeTokenValueUsd(
  offerType: string,
  orig: number,
  curr: number,
  cashbackRaw: number,
  c: 'USD' | 'MXN'
): number {
  const o = toUsd(orig, c);
  const cur = toUsd(curr, c);
  switch (offerType) {
    case 'cashback_fixed':
      return Math.max(0, toUsd(cashbackRaw, c));
    case 'cashback_percentage':
      return Math.max(0, cur * ((Number.isFinite(cashbackRaw) ? cashbackRaw : 0) / 100));
    case 'bogo':
      return Math.max(0, o - cur);
    case 'percentage':
    default:
      return Math.max(0, o - cur);
  }
}

/** Categorías según upload_promo.md §4 (enum Gemini) */
const CATEGORIES = [
  'electronics',
  'fashion',
  'home',
  'beauty',
  'sports',
  'books',
  'food',
  'other',
];

/** Plantillas rápidas (web: Electrónica, Moda, Deportes, Belleza) */
const QUICK_TEMPLATES = [
  { key: 'electronics', es: 'Electrónica', en: 'Electronics' },
  { key: 'fashion', es: 'Moda', en: 'Fashion' },
  { key: 'sports', es: 'Deportes', en: 'Sports' },
  { key: 'beauty', es: 'Belleza', en: 'Beauty' },
];

export default function UploadPromotionsScreen() {
  const navigation = useNavigation();
  const { language, currency, userName } = useSettings();
  const { addLuxaeBalance } = useWalletBalance();
  const isRegistered = !!(userName?.trim());
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<{ uri: string; name?: string; type?: string }[]>([]);

  const today = useMemo(() => new Date(), []);
  const defaultUntil = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  }, []);

  const [form, setForm] = useState({
    title: '',
    description: '',
    productName: '',
    brand: '',
    category: 'other',
    originalPrice: '',
    currentPrice: '',
    offerType: 'percentage' as string,
    cashbackValue: '',
    termsAndConditions: '',
    storeName: '',
    city: '',
    state: '',
    country: language === 'es' ? 'México' : 'Mexico',
    address: '',
    validFrom: formatDateYMD(today),
    validUntil: formatDateYMD(defaultUntil),
    gpsActivation: false,
    storeLatitude: '',
    storeLongitude: '',
    locationRadiusMeters: '500',
    promoCurrency: (currency === 'MXN' ? 'MXN' : 'USD') as 'USD' | 'MXN',
    promotionMode: 'qr' as 'qr' | 'redirect',
    redirectToUrl: '',
  });
  const [pricesFromIa, setPricesFromIa] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [isPermanent, setIsPermanent] = useState(false);
  const [showPickerFrom, setShowPickerFrom] = useState(false);
  const [showPickerUntil, setShowPickerUntil] = useState(false);

  const t = useMemo(
    () => ({
      title: language === 'es' ? 'Agregar Promoción Rápida' : 'Add Quick Promotion',
      subtitle: language === 'es' ? 'Crea una promoción en minutos.' : 'Create a promotion in minutes.',
      step1Title: language === 'es' ? 'Paso 1: Foto primero (opcional)' : 'Step 1: Photo first (optional)',
      step1Subtitle: language === 'es' 
        ? 'Sube 1-5 imágenes de la promoción. La app llama a Gemini para rellenar título, precios, marca y términos. Luego completa lo que falte.'
        : 'Upload 1-5 images of the promotion. The app will analyze with Gemini to fill title, prices, brand and terms. Then complete the rest.',
      step1AnalyzeNote: language === 'es' ? 'Se analizará con IA (Gemini) al subir' : 'Will be analyzed with AI (Gemini) on upload',
      step2Title: language === 'es' ? 'Paso 2: Datos mínimos' : 'Step 2: Minimum data',
      step2Subtitle: language === 'es' ? 'Revisa lo que la IA completó y completa lo que falte.' : 'Review what the AI filled in and complete the rest.',
      quickTemplates: language === 'es' ? 'Plantillas rápidas' : 'Quick templates',
      fieldTitle: language === 'es' ? 'Título' : 'Title',
      fieldDescription: language === 'es' ? 'Descripción' : 'Description',
      fieldProductName: language === 'es' ? 'Nombre del producto' : 'Product name',
      fieldBrand: language === 'es' ? 'Marca' : 'Brand',
      fieldCategory: language === 'es' ? 'Categoría' : 'Category',
      fieldOriginalPrice: language === 'es' ? 'Precio original' : 'Original price',
      fieldCurrentPrice: language === 'es' ? 'Precio actual' : 'Current price',
      fieldStoreName: language === 'es' ? 'Nombre de tienda' : 'Store name',
      fieldCity: language === 'es' ? 'Ciudad' : 'City',
      fieldState: language === 'es' ? 'Estado' : 'State',
      fieldCountry: language === 'es' ? 'País' : 'Country',
      fieldAddress: language === 'es' ? 'Dirección' : 'Address',
      fieldValidFrom: language === 'es' ? 'Inicio de la promoción' : 'Promotion start',
      fieldValidUntil: language === 'es' ? 'Fin de la promoción' : 'Promotion end',
      permanentPromo: language === 'es' ? 'Promoción permanente' : 'Permanent promotion',
      permanentLabel: language === 'es' ? 'Permanente' : 'Permanent',
      addImage: language === 'es' ? 'Añadir imagen (máx. 5)' : 'Add image (max 5)',
      takePhoto: language === 'es' ? 'Tomar foto' : 'Take photo',
      chooseGallery: language === 'es' ? 'Elegir de galería' : 'Choose from gallery',
      reAnalyze: language === 'es' ? 'Volver a analizar con IA' : 'Re-analyze with AI',
      analyzing: language === 'es' ? 'Analizando imágenes...' : 'Analyzing images...',
      photoPermission: language === 'es' ? 'Se necesita permiso para usar la cámara.' : 'Permission to use the camera is required.',
      galleryPermission: language === 'es' ? 'Se necesita permiso para acceder a las fotos.' : 'Permission to access photos is required.',
      cancel: language === 'es' ? 'Cancelar' : 'Cancel',
      submit: language === 'es' ? 'Publicar promoción' : 'Publish promotion',
      success: language === 'es' ? 'Promoción publicada correctamente.' : 'Promotion published successfully.',
      ok: language === 'es' ? 'Aceptar' : 'OK',
      errorFallback: language === 'es' ? '¿Abrir el formulario en la web para enviar la promoción?' : 'Open the form on the website to submit the promotion?',
      openWebForm: language === 'es' ? 'Abrir formulario en la web' : 'Open form on website',
      submitFromWeb: language === 'es' ? 'Enviar desde la web (si falla la app)' : 'Submit from website (if app fails)',
      advancedMode: language === 'es' ? 'Modo Avanzado' : 'Advanced Mode',
      mustSignUp: language === 'es' ? 'Debes darte de alta (KYC) para crear promociones.' : 'You must sign up (KYC) to create promotions.',
      goToSignUp: language === 'es' ? 'Ir a registro (KYC)' : 'Go to sign up (KYC)',
      fieldTerms: language === 'es' ? 'Términos y condiciones' : 'Terms and conditions',
      fieldOfferType: language === 'es' ? 'Tipo oferta' : 'Offer type',
      fieldCashback: language === 'es' ? 'Valor cashback' : 'Cashback value',
      missingFields: language === 'es' ? 'Campos requeridos faltantes' : 'Missing required fields',
      earnedTokens:
        language === 'es' ? `Has ganado 10 ${TOKEN_SYMBOL}.` : `You've earned 10 ${TOKEN_SYMBOL}.`,
      promotionSubmittedTitle: language === 'es' ? 'Promoción enviada' : 'Promotion submitted',
      pendingVerificationNotice:
        language === 'es'
          ? 'Tu promoción quedó registrada y debe ser verificada antes de mostrarse como activa a los usuarios. Te avisaremos o revisa el estado en el detalle cuando esté aprobada.'
          : 'Your promotion was saved and must be verified before it appears as active to users. You will be notified, or check the detail page for approval status.',
      reviewBeforePublish:
        language === 'es'
          ? 'Al publicar, la promoción se envía al servidor en estado borrador y queda pendiente de verificación del equipo.'
          : 'When you publish, the promotion is sent to the server as draft and stays pending team review.',
      pricesInUsd: language === 'es' ? '(precios IA en USD)' : '(AI prices in USD)',
      gpsSectionTitle: language === 'es' ? 'Activación por ubicación (GPS)' : 'Location activation (GPS)',
      gpsSectionHint:
        language === 'es'
          ? 'El usuario deberá estar cerca del punto de la tienda para obtener el cupón (validación al solicitar el cupón).'
          : 'The user must be near the store point to get the coupon (validated when requesting the coupon).',
      fieldLatitude: language === 'es' ? 'Latitud (WGS84)' : 'Latitude (WGS84)',
      fieldLongitude: language === 'es' ? 'Longitud (WGS84)' : 'Longitude (WGS84)',
      fieldRadiusM: language === 'es' ? 'Radio permitido (metros)' : 'Allowed radius (meters)',
      radiusHint: language === 'es' ? 'Entre 50 m y 50 km.' : 'Between 50 m and 50 km.',
      getLocationFromDevice: language === 'es' ? 'Obtener del dispositivo' : 'Use device location',
      locationDenied: language === 'es' ? 'Ubicación denegada. Activa el permiso en ajustes.' : 'Location denied. Enable permission in settings.',
      locationError: language === 'es' ? 'No se pudo obtener la ubicación.' : 'Could not get location.',
      gpsValidationError:
        language === 'es'
          ? 'Con GPS activado, indica latitud, longitud válidas y un radio entre 50 y 50000 m.'
          : 'With GPS on, enter valid latitude, longitude and a radius between 50 and 50000 m.',
      sectionPromoKind: language === 'es' ? 'Tipo de promoción' : 'Promotion type',
      sectionPromoKindHint:
        language === 'es'
          ? 'Cupón con QR: código para canjear en tienda. Quick promotion: redirige a comprar (ej. Amazon).'
          : 'QR coupon: code to redeem in store. Quick promotion: redirects to buy (e.g. Amazon).',
      modeQr: language === 'es' ? 'Cupón con QR' : 'QR coupon',
      modeRedirect: language === 'es' ? 'Quick promotion (redirección)' : 'Quick promotion (redirect)',
      fieldRedirectUrl: language === 'es' ? 'URL de destino (opcional)' : 'Destination URL (optional)',
      sectionPrices: language === 'es' ? 'Precios' : 'Prices',
      fieldProductCurrency: language === 'es' ? 'Moneda del producto' : 'Product currency',
      currencyUsd: language === 'es' ? 'USD (dólares)' : 'USD',
      currencyMxn: language === 'es' ? 'MXN (pesos)' : 'MXN',
      tokensUsdNote:
        language === 'es'
          ? `Los ${TOKEN_SYMBOL} se expresan en USD (1 ${TOKEN_SYMBOL} ≈ 1 USD). Si eliges MXN, el servidor convierte al guardar.`
          : `${TOKEN_SYMBOL} are expressed in USD (1 ${TOKEN_SYMBOL} ≈ 1 USD). If you choose MXN, the server converts on save.`,
      discountLabel: language === 'es' ? 'Descuento' : 'Discount',
      sectionOfferTokens: language === 'es' ? 'Tipo de promoción y valor en tokens' : 'Offer type and token value',
      sectionOfferTokensHint:
        language === 'es'
          ? `El tipo define el valor promocional en USD. X ${TOKEN_SYMBOL} ≈ X USD (pasivo medible).`
          : `The type defines promotional value in USD. X ${TOKEN_SYMBOL} ≈ X USD.`,
      tokenPreviewTitle: language === 'es' ? 'Vista previa de valor en tokens' : 'Token value preview',
      tokenPreviewFoot:
        language === 'es'
          ? 'Unidad del contrato (pasivo medible). Siempre referida a USD.'
          : 'Contract unit (measurable liability). Always in USD terms.',
      offerPct: language === 'es' ? 'Descuento %' : 'Discount %',
      offerBogo: language === 'es' ? '2x1 (BOGO)' : 'BOGO',
      offerCbFixed: language === 'es' ? 'Cashback fijo' : 'Fixed cashback',
      offerCbPct: language === 'es' ? 'Cashback % sobre oferta' : 'Cashback % on deal',
    }),
    [language]
  );

  const pricePreview = useMemo(() => {
    const orig = parseFloat(String(form.originalPrice).replace(',', '.'));
    const curr = parseFloat(String(form.currentPrice).replace(',', '.'));
    const cb = parseFloat(String(form.cashbackValue).replace(',', '.'));
    const discountPct =
      orig > 0 && Number.isFinite(orig) && Number.isFinite(curr)
        ? Math.round(((orig - curr) / orig) * 100)
        : 0;
    const tokenUsd = computeTokenValueUsd(
      form.offerType,
      Number.isFinite(orig) ? orig : 0,
      Number.isFinite(curr) ? curr : 0,
      Number.isFinite(cb) ? cb : 0,
      form.promoCurrency
    );
    return { discountPct, tokenUsd };
  }, [form.originalPrice, form.currentPrice, form.offerType, form.cashbackValue, form.promoCurrency]);

  /** Redirige al sitio cuando falta algo (ref: upload_promo.md) */
  const openWebForm = () => {
    Linking.openURL(SITE_PROMO_URLS.quickPromotion).catch(() => {});
  };

  /** Mapeo data Gemini → formulario (upload_promo.md §5, Quick promotion) */
  const applyAnalyzeData = (d: AnalyzeImageData) => {
    const validCategories = CATEGORIES;
    const validOfferTypes = ['percentage', 'bogo', 'cashback_fixed', 'cashback_percentage'];
    const offer = validOfferTypes.includes(d.offerType ?? '') ? (d.offerType as string) : 'percentage';
    setForm((f) => ({
      ...f,
      title: (d.title ?? f.title).trim() || f.title,
      description: d.description ?? f.description,
      productName: d.productName ?? f.productName,
      brand: d.brand ?? f.brand,
      category: validCategories.includes(d.category ?? '') ? (d.category as string) : f.category,
      originalPrice: d.originalPrice != null ? String(d.originalPrice) : f.originalPrice,
      currentPrice: d.currentPrice != null ? String(d.currentPrice) : f.currentPrice,
      offerType: offer,
      cashbackValue: d.cashbackValue != null ? String(d.cashbackValue) : f.cashbackValue,
      termsAndConditions: d.termsAndConditions ?? f.termsAndConditions,
    }));
    setPricesFromIa(true);
  };

  const runAnalyze = async (imgs: { uri: string; name?: string; type?: string }[]) => {
    if (!imgs.length || imgs.length > 5) return;
    setAnalyzeError(null);
    setAnalyzing(true);
    const result = await analyzePromotionImage(imgs);
    setAnalyzing(false);
    if (result.ok && result.data) {
      applyAnalyzeData(result.data);
    } else {
      setAnalyzeError(result.error ?? (language === 'es' ? 'No se pudo analizar. Completa manualmente.' : 'Could not analyze. Fill manually.'));
    }
  };

  const addImageFromAssets = (assets: { uri: string; fileName?: string }[]) => {
    if (!assets.length) return;
    const mapped = assets.map((a) => ({
      uri: a.uri,
      name: a.fileName ?? `image-${Date.now()}.jpg`,
      type: 'image/jpeg',
    }));
    setImages((prev) => {
      const next = [...prev, ...mapped].slice(0, 5);
      if (next.length >= 1 && next.length <= 5) runAnalyze(next);
      return next;
    });
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.ok, t.photoPermission);
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: (ImagePicker as any).MediaTypeOptions?.Images ?? ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        addImageFromAssets(result.assets);
      }
    } catch (e) {
      Alert.alert(t.ok, (e as Error)?.message ?? (language === 'es' ? 'No se pudo abrir la cámara.' : 'Could not open camera.'));
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.ok, t.galleryPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: (ImagePicker as any).MediaTypeOptions?.Images ?? ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      addImageFromAssets(result.assets);
    }
  };

  const fetchLocationFromDevice = async () => {
    setFetchingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t.ok, t.locationDenied);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setForm((f) => ({
        ...f,
        storeLatitude: lat.toFixed(6),
        storeLongitude: lng.toFixed(6),
        gpsActivation: true,
      }));
    } catch (e) {
      Alert.alert(t.ok, (e as Error)?.message ?? t.locationError);
    } finally {
      setFetchingGps(false);
    }
  };

  const showImageSourcePicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t.cancel, t.takePhoto, t.chooseGallery],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) takePhoto();
          else if (buttonIndex === 2) pickFromGallery();
        }
      );
      return;
    }
    Alert.alert(
      t.addImage,
      language === 'es' ? '¿Tomar foto o elegir de galería?' : 'Take photo or choose from gallery?',
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.takePhoto, onPress: takePhoto },
        { text: t.chooseGallery, onPress: pickFromGallery },
      ]
    );
  };

  const MIN_GPS_RADIUS_M = 50;
  const MAX_GPS_RADIUS_M = 50_000;

  /** Validación según upload_promo.md §7: solo title obligatorio */
  const buildPayload = (currentForm: typeof form): PromotionPayload | null => {
    const title = (currentForm.title ?? '').trim();
    if (!title) {
      setError(language === 'es' ? 'El título es obligatorio.' : 'Title is required.');
      return null;
    }
    const description = (currentForm.description ?? '').trim();
    const productName = (currentForm.productName ?? '').trim();
    const orig = Number(currentForm.originalPrice);
    const curr = Number(currentForm.currentPrice);
    const discount =
      orig > 0 ? Math.round(((orig - curr) / orig) * 100) : 0;

    const gpsOn = !!currentForm.gpsActivation;
    const latStr = String(currentForm.storeLatitude ?? '').trim().replace(',', '.');
    const lngStr = String(currentForm.storeLongitude ?? '').trim().replace(',', '.');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    const radiusParsed = parseInt(String(currentForm.locationRadiusMeters ?? '').trim(), 10);

    let coordinates: { lat: number; lng: number } | null = null;
    let locationRadiusMeters: number | undefined;

    if (gpsOn) {
      const latOk = Number.isFinite(lat) && lat >= -90 && lat <= 90;
      const lngOk = Number.isFinite(lng) && lng >= -180 && lng <= 180;
      const radiusOk =
        Number.isFinite(radiusParsed) && radiusParsed >= MIN_GPS_RADIUS_M && radiusParsed <= MAX_GPS_RADIUS_M;
      if (!latOk || !lngOk || !radiusOk) {
        setError(t.gpsValidationError);
        return null;
      }
      coordinates = { lat, lng };
      locationRadiusMeters = radiusParsed;
    }

    const storeLocation: PromotionStoreLocation = {
      address: (currentForm.address ?? '').trim() || undefined,
      city: (currentForm.city ?? '').trim() || undefined,
      state: (currentForm.state ?? '').trim() || undefined,
      country: (currentForm.country ?? '').trim() || undefined,
      coordinates,
    };
    const validFromStr = (currentForm.validFrom ?? '').trim();
    const validUntilStr = (currentForm.validUntil ?? '').trim();
    const validFrom = validFromStr
      ? new Date(validFromStr).toISOString()
      : new Date().toISOString();
    const validUntil = isPermanent
      ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
      : validUntilStr
        ? new Date(validUntilStr).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const validOfferTypes = ['percentage', 'bogo', 'cashback_fixed', 'cashback_percentage'];
    const offerType = validOfferTypes.includes((currentForm.offerType ?? '').trim())
      ? (currentForm.offerType as string).trim()
      : 'percentage';
    const cashback = Number((currentForm.cashbackValue ?? '').trim());

    return {
      title,
      description: description || undefined,
      productName: productName || undefined,
      brand: (currentForm.brand ?? '').trim() || 'N/A',
      category: (currentForm.category ?? '').trim() || 'other',
      originalPrice: isNaN(orig) ? 0 : orig,
      currentPrice: isNaN(curr) ? 0 : curr,
      currency: currentForm.promoCurrency,
      discountPercentage: discount,
      offerType,
      cashbackValue: !isNaN(cashback) ? cashback : undefined,
      termsAndConditions: (currentForm.termsAndConditions ?? '').trim() || undefined,
      storeName: (currentForm.storeName ?? '').trim() || '',
      storeLocation: storeLocation,
      isPhysicalStore: false,
      validFrom,
      validUntil,
      /** Recibida en servidor; visible en listados públicos tras revisión (draft / moderación). */
      status: 'draft',
      gpsActivationEnabled: gpsOn,
      locationRadiusMeters,
      redirectInsteadOfQr: currentForm.promotionMode === 'redirect',
      redirectToUrl:
        currentForm.promotionMode === 'redirect'
          ? (currentForm.redirectToUrl ?? '').trim() || undefined
          : undefined,
    };
  };

  const handleSubmit = async () => {
    setError(null);
    logPromotionDebug('UploadPromotionsScreen:submit start', {
      imageCount: images.length,
      promotionMode: form.promotionMode,
      gpsActivation: form.gpsActivation,
    });
    const payload = buildPayload(form);
    if (!payload) {
      logPromotionWarn('UploadPromotionsScreen:buildPayload returned null (validation)');
      return;
    }
    setLoading(true);
    try {
      const result = await postPromotion(
        payload,
        images.length > 0 ? images : undefined
      );
      logPromotionDebug('UploadPromotionsScreen:postPromotion result', {
        ok: result.ok,
        error: result.ok ? undefined : result.error,
        hasData: result.ok && result.data != null,
      });
      if (result.ok) {
        setSuccess(true);
        setPricesFromIa(false);
        await addLuxaeBalance(10);
        const promoId = (result.data as any)?.id as string | undefined;
        setForm({
          title: '',
          description: '',
          productName: '',
          brand: '',
          category: 'other',
          originalPrice: '',
          currentPrice: '',
          offerType: 'percentage',
          cashbackValue: '',
          termsAndConditions: '',
          storeName: '',
          city: '',
          state: '',
          country: language === 'es' ? 'México' : 'Mexico',
          address: '',
          validFrom: formatDateYMD(new Date()),
          validUntil: formatDateYMD(defaultUntil),
          gpsActivation: false,
          storeLatitude: '',
          storeLongitude: '',
          locationRadiusMeters: '500',
          promoCurrency: (currency === 'MXN' ? 'MXN' : 'USD') as 'USD' | 'MXN',
          promotionMode: 'qr',
          redirectToUrl: '',
        });
        setIsPermanent(false);
        setImages([]);
        const detailUrl = promoId ? SITE_PROMO_URLS.promotionDetail(promoId) : null;
        const bodyMessage =
          `${t.earnedTokens}\n\n${t.pendingVerificationNotice}` +
          (detailUrl ? `\n\n${language === 'es' ? '¿Abrir el detalle de la promoción?' : 'Open promotion details?'}` : '');
        Alert.alert(
          t.promotionSubmittedTitle,
          bodyMessage,
          detailUrl
            ? [
                { text: t.ok, style: 'cancel' },
                { text: language === 'es' ? 'Ver detalle' : 'View detail', onPress: () => Linking.openURL(detailUrl) },
              ]
            : [{ text: t.ok }]
        );
      } else {
        const errMsg = result.error ?? 'Error';
        logPromotionWarn('UploadPromotionsScreen:submit failed', { errMsg });
        setError(errMsg);
        Alert.alert(
          t.missingFields,
          `${errMsg}\n\n${t.errorFallback}`,
          [
            { text: t.ok, style: 'cancel' },
            { text: t.openWebForm, onPress: openWebForm },
          ]
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logPromotionWarn('UploadPromotionsScreen:submit exception', { message: msg });
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isRegistered) {
    return (
      <Box flex={1} bg="$white">
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80, flexGrow: 1, justifyContent: 'center', minHeight: 400 }}>
          <VStack space="lg" alignItems="center">
            <Box bg="#00704A" borderRadius="$xl" p="$5" width="100%">
              <Text fontSize="$xl" fontWeight="$bold" color="$white">
                {t.title}
              </Text>
              <Text fontSize="$sm" color="$white" opacity={0.9} mt="$1">
                {t.subtitle}
              </Text>
            </Box>
            <Box bg="$backgroundLight100" borderRadius="$xl" p="$6" width="100%" alignItems="center">
              <Text fontSize="$md" color="$textLight700" textAlign="center" mb="$4">
                {t.mustSignUp}
              </Text>
              <Button size="lg" bg="#00704A" onPress={() => (navigation as any).navigate('NYC')}>
                <ButtonText>{t.goToSignUp}</ButtonText>
              </Button>
            </Box>
          </VStack>
        </ScrollView>
      </Box>
    );
  }

  const applyTemplate = (key: string) => {
    setForm((f) => ({ ...f, category: key }));
  };

  return (
    <Box flex={1} bg="$white">
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 80, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <VStack space="md">
          <Box bg="#00704A" borderRadius="$xl" p="$4">
            <HStack justifyContent="space-between" alignItems="flex-start">
              <VStack flex={1}>
                <Text fontSize="$xl" fontWeight="$bold" color="$white">
                  {t.title}
                </Text>
                <Text fontSize="$sm" color="$white" opacity={0.9} mt="$1">
                  {t.subtitle}
                </Text>
              </VStack>
              <Button size="xs" variant="link" onPress={openWebForm}>
                <ButtonText color="$white" fontSize="$sm" textDecorationLine="underline">{t.advancedMode}</ButtonText>
              </Button>
            </HStack>
          </Box>

          {/* Plantillas rápidas */}
          <VStack space="xs">
            <Text fontSize="$sm" fontWeight="$semibold" color="$textLight700">{t.quickTemplates}</Text>
            <HStack space="sm" flexWrap="wrap">
              {QUICK_TEMPLATES.map((tmpl) => (
                <Button key={tmpl.key} size="sm" variant="outline" borderColor="#00704A" onPress={() => applyTemplate(tmpl.key)}>
                  <ButtonText color="#00704A">{language === 'es' ? tmpl.es : tmpl.en}</ButtonText>
                </Button>
              ))}
            </HStack>
          </VStack>

          {/* Paso 1: Foto primero */}
          <VStack space="xs">
            <Text fontSize="$md" fontWeight="$bold" color="$textLight900">{t.step1Title}</Text>
            <Text fontSize="$sm" color="$textLight600">{t.step1Subtitle}</Text>
            <RNPressable
              onPress={images.length >= 5 ? undefined : showImageSourcePicker}
              style={({ pressed }) => ({
                minHeight: 140,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: pressed ? '#00704A' : '#CBD5E0',
                borderRadius: 12,
                backgroundColor: pressed ? 'rgba(0,112,74,0.05)' : '#F8FAFC',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
              })}
            >
              <VStack space="xs" alignItems="center">
                <Text fontSize="$3xl">📷</Text>
                <Text fontSize="$sm" color="$textLight600" textAlign="center">
                  {images.length ? `${images.length} ${language === 'es' ? 'imagen(es)' : 'image(s)'}` : (language === 'es' ? 'Toca para subir fotos' : 'Tap to upload photos')}
                </Text>
                <Text fontSize="$xs" color="$textLight500">{t.step1AnalyzeNote}</Text>
              </VStack>
            </RNPressable>
            {images.length > 0 && (
              <HStack flexWrap="wrap" space="sm" mt="$2">
                {images.slice(0, 5).map((img, i) => (
                  <Box key={i} width={56} height={56} borderRadius="$md" overflow="hidden" bg="$backgroundLight200">
                    <Image source={{ uri: img.uri }} style={{ width: 56, height: 56 }} resizeMode="cover" />
                  </Box>
                ))}
              </HStack>
            )}
            {images.length >= 1 && images.length <= 5 && (
              <Button size="sm" variant="outline" onPress={() => runAnalyze(images)} isDisabled={analyzing}>
                <ButtonText>{analyzing ? t.analyzing : `🤖 ${t.reAnalyze}`}</ButtonText>
              </Button>
            )}
            {analyzeError ? (
              <VStack space="xs">
                <Text color="$error600" fontSize="$sm">{analyzeError}</Text>
                <Button size="sm" variant="link" alignSelf="flex-start" onPress={openWebForm}>
                  <ButtonText color="#00704A">{t.openWebForm}</ButtonText>
                </Button>
              </VStack>
            ) : null}
          </VStack>

          {/* Paso 2: Datos mínimos */}
          <VStack space="md">
            <VStack space="xs">
              <Text fontSize="$md" fontWeight="$bold" color="$textLight900">{t.step2Title}</Text>
              <Text fontSize="$sm" color="$textLight600">{t.step2Subtitle}</Text>
            </VStack>

            {/* Tipo de promoción: QR vs redirección (como en web) */}
            <Box borderWidth={1} borderColor="$borderLight300" borderRadius="$lg" p="$4" bg="$backgroundLight50">
              <HStack space="sm" alignItems="center" mb="$2">
                <Text fontSize="$lg">🏷️</Text>
                <Text fontSize="$md" fontWeight="$bold" color="$textLight900">
                  {t.sectionPromoKind}
                </Text>
              </HStack>
              <Text fontSize="$xs" color="$textLight600" mb="$3">
                {t.sectionPromoKindHint}
              </Text>
              <VStack space="sm">
                <Pressable
                  onPress={() => setForm((f) => ({ ...f, promotionMode: 'qr' }))}
                  borderWidth={2}
                  borderColor={form.promotionMode === 'qr' ? '#00704A' : '$borderLight300'}
                  borderRadius="$md"
                  p="$3"
                  bg={form.promotionMode === 'qr' ? 'rgba(0,112,74,0.08)' : '$white'}
                >
                  <HStack space="md" alignItems="center">
                    <Text fontSize="$xl">📱</Text>
                    <Text fontSize="$sm" fontWeight="$semibold" color="$textLight900" flex={1}>
                      {t.modeQr}
                    </Text>
                    {form.promotionMode === 'qr' ? <Text color="#00704A">✓</Text> : null}
                  </HStack>
                </Pressable>
                <Pressable
                  onPress={() => setForm((f) => ({ ...f, promotionMode: 'redirect' }))}
                  borderWidth={2}
                  borderColor={form.promotionMode === 'redirect' ? '#00704A' : '$borderLight300'}
                  borderRadius="$md"
                  p="$3"
                  bg={form.promotionMode === 'redirect' ? 'rgba(0,112,74,0.08)' : '$white'}
                >
                  <HStack space="md" alignItems="center">
                    <Text fontSize="$xl">🔗</Text>
                    <Text fontSize="$sm" fontWeight="$semibold" color="$textLight900" flex={1}>
                      {t.modeRedirect}
                    </Text>
                    {form.promotionMode === 'redirect' ? <Text color="#00704A">✓</Text> : null}
                  </HStack>
                </Pressable>
              </VStack>
              {form.promotionMode === 'redirect' ? (
                <FormControl mt="$3">
                  <FormControlLabel>
                    <FormControlLabelText>{t.fieldRedirectUrl}</FormControlLabelText>
                  </FormControlLabel>
                  <Input>
                    <InputField
                      value={form.redirectToUrl}
                      onChangeText={(v) => setForm((f) => ({ ...f, redirectToUrl: v }))}
                      placeholder="https://"
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </Input>
                </FormControl>
              ) : null}
            </Box>

            {/* Precios + descuento */}
            <Box borderWidth={1} borderColor="$borderLight300" borderRadius="$lg" p="$4" bg="$white">
              <HStack space="sm" alignItems="center" mb="$2">
                <Text fontSize="$lg">💵</Text>
                <Text fontSize="$md" fontWeight="$bold" color="$textLight900">
                  {t.sectionPrices}
                </Text>
              </HStack>
              <FormControl mb="$3">
                <FormControlLabel>
                  <FormControlLabelText>{t.fieldProductCurrency}</FormControlLabelText>
                </FormControlLabel>
                <HStack space="sm">
                  {(['USD', 'MXN'] as const).map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setForm((f) => ({ ...f, promoCurrency: c }))}
                      flex={1}
                      borderWidth={2}
                      borderColor={form.promoCurrency === c ? '#00704A' : '$borderLight300'}
                      borderRadius="$md"
                      p="$3"
                      bg={form.promoCurrency === c ? 'rgba(0,112,74,0.08)' : '$backgroundLight50'}
                    >
                      <Text textAlign="center" fontWeight="$semibold" color={form.promoCurrency === c ? '#00704A' : '$textLight700'}>
                        {c === 'USD' ? t.currencyUsd : t.currencyMxn}
                      </Text>
                    </Pressable>
                  ))}
                </HStack>
              </FormControl>
              <Text fontSize="$xs" color="$textLight500" mb="$3">
                {t.tokensUsdNote}
              </Text>
              <HStack space="md" alignItems="flex-end">
                <FormControl flex={1}>
                  <FormControlLabel>
                    <FormControlLabelText>{t.fieldOriginalPrice} *</FormControlLabelText>
                  </FormControlLabel>
                  <Input>
                    <InputField
                      keyboardType="decimal-pad"
                      value={form.originalPrice}
                      onChangeText={(v) => setForm((f) => ({ ...f, originalPrice: v }))}
                      placeholder="0.00"
                    />
                  </Input>
                </FormControl>
                <FormControl flex={1}>
                  <FormControlLabel>
                    <FormControlLabelText>{t.fieldCurrentPrice} *</FormControlLabelText>
                  </FormControlLabel>
                  <Input>
                    <InputField
                      keyboardType="decimal-pad"
                      value={form.currentPrice}
                      onChangeText={(v) => setForm((f) => ({ ...f, currentPrice: v }))}
                      placeholder="0.00"
                    />
                  </Input>
                </FormControl>
                <Box minWidth={72} bg="rgba(0,112,74,0.12)" borderRadius="$md" p="$3" borderWidth={1} borderColor="rgba(0,112,74,0.35)">
                  <Text fontSize="$xs" color="#00704A" fontWeight="$semibold">
                    {t.discountLabel}
                  </Text>
                  <Text fontSize="$md" fontWeight="$bold" color="#00704A">
                    {pricePreview.discountPct}%
                  </Text>
                </Box>
              </HStack>
            </Box>

            {/* Tipo de oferta y vista previa en tokens */}
            <Box borderWidth={1} borderColor="$borderLight300" borderRadius="$lg" p="$4" bg="rgba(59,130,246,0.06)">
              <HStack space="sm" alignItems="center" mb="$2">
                <Text fontSize="$lg">🏷️</Text>
                <Text fontSize="$md" fontWeight="$bold" color="$textLight900">
                  {t.sectionOfferTokens}
                </Text>
              </HStack>
              <Text fontSize="$xs" color="$textLight600" mb="$3">
                {t.sectionOfferTokensHint}
              </Text>
              <VStack space="xs" mb="$3">
                {(
                  [
                    ['percentage', t.offerPct],
                    ['bogo', t.offerBogo],
                    ['cashback_fixed', t.offerCbFixed],
                    ['cashback_percentage', t.offerCbPct],
                  ] as const
                ).map(([value, label]) => (
                  <Pressable
                    key={value}
                    onPress={() => setForm((f) => ({ ...f, offerType: value }))}
                    borderWidth={1}
                    borderColor={form.offerType === value ? '#00704A' : '$borderLight300'}
                    borderRadius="$md"
                    px="$3"
                    py="$2"
                    bg={form.offerType === value ? 'rgba(0,112,74,0.1)' : '$white'}
                  >
                    <Text
                      fontSize="$sm"
                      color={form.offerType === value ? '#00704A' : '$textLight800'}
                      fontWeight={form.offerType === value ? '$semibold' : '$normal'}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </VStack>
              {(form.offerType === 'cashback_fixed' || form.offerType === 'cashback_percentage') && (
                <FormControl mb="$3">
                  <FormControlLabel>
                    <FormControlLabelText>{t.fieldCashback}</FormControlLabelText>
                  </FormControlLabel>
                  <Input>
                    <InputField
                      keyboardType="decimal-pad"
                      value={form.cashbackValue}
                      onChangeText={(v) => setForm((f) => ({ ...f, cashbackValue: v }))}
                      placeholder={form.offerType === 'cashback_percentage' ? '0-100' : '0'}
                    />
                  </Input>
                </FormControl>
              )}
              <Box bg="rgba(59,130,246,0.12)" borderRadius="$md" p="$4" borderWidth={1} borderColor="rgba(59,130,246,0.35)">
                <Text fontSize="$xs" color="$textLight600" fontWeight="$semibold" mb="$1">
                  {t.tokenPreviewTitle}
                </Text>
                <Text fontSize="$lg" fontWeight="$bold" color="#1d4ed8">
                  {pricePreview.tokenUsd.toFixed(2)} USD = {pricePreview.tokenUsd.toFixed(2)} {TOKEN_SYMBOL}
                </Text>
                <Text fontSize="$xs" color="$textLight500" mt="$2">
                  {t.tokenPreviewFoot}
                </Text>
              </Box>
            </Box>

            <FormControl>
            <FormControlLabel><FormControlLabelText>{t.fieldTitle} *</FormControlLabelText></FormControlLabel>
            <Input><InputField value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} placeholder={language === 'es' ? 'Ej: Oferta Especial de Electrónica' : 'e.g. Special Electronics Offer'} /></Input>
          </FormControl>
          <FormControl>
            <FormControlLabel><FormControlLabelText>{t.fieldDescription}</FormControlLabelText></FormControlLabel>
            <Input><InputField value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} placeholder={language === 'es' ? 'Condiciones o beneficios adicionales' : 'Additional conditions or benefits'} multiline numberOfLines={3} /></Input>
          </FormControl>
          <FormControl>
            <FormControlLabel><FormControlLabelText>{t.fieldBrand} *</FormControlLabelText></FormControlLabel>
            <Input><InputField value={form.brand} onChangeText={(v) => setForm((f) => ({ ...f, brand: v }))} placeholder={language === 'es' ? 'Ej: Apple, Nike, Samsung' : 'e.g. Apple, Nike, Samsung'} /></Input>
          </FormControl>
          <FormControl>
            <FormControlLabel><FormControlLabelText>{t.fieldCategory} *</FormControlLabelText></FormControlLabel>
            <Input><InputField value={form.category} onChangeText={(v) => setForm((f) => ({ ...f, category: v }))} placeholder={t.fieldCategory} /></Input>
          </FormControl>
          <FormControl>
            <FormControlLabel><FormControlLabelText>{t.fieldProductName}</FormControlLabelText></FormControlLabel>
            <Input><InputField value={form.productName} onChangeText={(v) => setForm((f) => ({ ...f, productName: v }))} placeholder={t.fieldProductName} /></Input>
          </FormControl>
          <FormControl>
            <FormControlLabel><FormControlLabelText>{t.fieldTerms}</FormControlLabelText></FormControlLabel>
            <Input><InputField value={form.termsAndConditions} onChangeText={(v) => setForm((f) => ({ ...f, termsAndConditions: v }))} placeholder={t.fieldTerms} multiline numberOfLines={2} /></Input>
          </FormControl>
          {pricesFromIa ? (
            <Text fontSize="$xs" color="$textLight500">{t.pricesInUsd}</Text>
          ) : null}
          <FormControl>
            <FormControlLabel><FormControlLabelText>{t.fieldStoreName}</FormControlLabelText></FormControlLabel>
            <Input><InputField value={form.storeName} onChangeText={(v) => setForm((f) => ({ ...f, storeName: v }))} placeholder={t.fieldStoreName} /></Input>
          </FormControl>
          <FormControl>
            <FormControlLabel><FormControlLabelText>{t.fieldAddress}</FormControlLabelText></FormControlLabel>
            <Input><InputField value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} placeholder={t.fieldAddress} /></Input>
          </FormControl>
          <HStack space="md">
            <FormControl flex={1}>
              <FormControlLabel><FormControlLabelText>{t.fieldCity}</FormControlLabelText></FormControlLabel>
              <Input><InputField value={form.city} onChangeText={(v) => setForm((f) => ({ ...f, city: v }))} placeholder={t.fieldCity} /></Input>
            </FormControl>
            <FormControl flex={1}>
              <FormControlLabel><FormControlLabelText>{t.fieldState}</FormControlLabelText></FormControlLabel>
              <Input><InputField value={form.state} onChangeText={(v) => setForm((f) => ({ ...f, state: v }))} placeholder={t.fieldState} /></Input>
            </FormControl>
          </HStack>
          <FormControl>
            <FormControlLabel><FormControlLabelText>{t.fieldCountry}</FormControlLabelText></FormControlLabel>
            <Input><InputField value={form.country} onChangeText={(v) => setForm((f) => ({ ...f, country: v }))} placeholder={t.fieldCountry} /></Input>
          </FormControl>

          <Box borderWidth={1} borderColor="$borderLight300" borderRadius="$lg" p="$4" bg="$backgroundLight50">
            <HStack justifyContent="space-between" alignItems="center" mb="$2" space="md">
              <Text fontSize="$md" fontWeight="$semibold" color="$textLight900" flex={1}>
                {t.gpsSectionTitle}
              </Text>
              <Switch
                value={form.gpsActivation}
                onValueChange={(v) => setForm((f) => ({ ...f, gpsActivation: v }))}
                trackColor={{ false: '#CBD5E0', true: '#a8d4c4' }}
                thumbColor={form.gpsActivation ? '#00704A' : '#f4f4f5'}
              />
            </HStack>
            <Text fontSize="$xs" color="$textLight600" mb="$3">
              {t.gpsSectionHint}
            </Text>
            {form.gpsActivation ? (
              <VStack space="md">
                <Button
                  size="md"
                  variant="outline"
                  borderColor="#00704A"
                  onPress={fetchLocationFromDevice}
                  isDisabled={fetchingGps}
                >
                  {fetchingGps ? (
                    <ActivityIndicator color="#00704A" />
                  ) : (
                    <ButtonText color="#00704A">{t.getLocationFromDevice}</ButtonText>
                  )}
                </Button>
                <HStack space="md">
                  <FormControl flex={1}>
                    <FormControlLabel>
                      <FormControlLabelText>{t.fieldLatitude}</FormControlLabelText>
                    </FormControlLabel>
                    <Input>
                      <InputField
                        keyboardType="decimal-pad"
                        value={form.storeLatitude}
                        onChangeText={(v) => setForm((f) => ({ ...f, storeLatitude: v }))}
                        placeholder={language === 'es' ? 'ej. 19.432608' : 'e.g. 19.432608'}
                      />
                    </Input>
                  </FormControl>
                  <FormControl flex={1}>
                    <FormControlLabel>
                      <FormControlLabelText>{t.fieldLongitude}</FormControlLabelText>
                    </FormControlLabel>
                    <Input>
                      <InputField
                        keyboardType="decimal-pad"
                        value={form.storeLongitude}
                        onChangeText={(v) => setForm((f) => ({ ...f, storeLongitude: v }))}
                        placeholder={language === 'es' ? 'ej. -99.133209' : 'e.g. -99.133209'}
                      />
                    </Input>
                  </FormControl>
                </HStack>
                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText>{t.fieldRadiusM}</FormControlLabelText>
                  </FormControlLabel>
                  <Input>
                    <InputField
                      keyboardType="number-pad"
                      value={form.locationRadiusMeters}
                      onChangeText={(v) => setForm((f) => ({ ...f, locationRadiusMeters: v }))}
                      placeholder="500"
                    />
                  </Input>
                  <Text fontSize="$xs" color="$textLight500" mt="$1">
                    {t.radiusHint}
                  </Text>
                </FormControl>
              </VStack>
            ) : null}
          </Box>

          <FormControl>
            <FormControlLabel><FormControlLabelText>{t.fieldValidFrom}</FormControlLabelText></FormControlLabel>
            {hasDatePicker && DateTimePicker ? (
              <>
                <RNPressable onPress={() => setShowPickerFrom(true)}>
                  <Box bg="$backgroundLight0" borderWidth={1} borderColor="$borderLight300" borderRadius="$md" px="$4" py="$3" minHeight={44} justifyContent="center">
                    <Text color="$textLight900">{form.validFrom || '—'}</Text>
                  </Box>
                </RNPressable>
                {showPickerFrom && (
                  <DateTimePicker
                    value={form.validFrom ? new Date(form.validFrom) : today}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={today}
                    onChange={(_, date) => {
                      if (Platform.OS === 'android') setShowPickerFrom(false);
                      if (date) setForm((f) => ({ ...f, validFrom: formatDateYMD(date) }));
                    }}
                    onTouchCancel={() => setShowPickerFrom(false)}
                  />
                )}
              </>
            ) : (
              <Input><InputField value={form.validFrom} onChangeText={(v) => setForm((f) => ({ ...f, validFrom: v }))} placeholder="YYYY-MM-DD" /></Input>
            )}
          </FormControl>
          <FormControl>
            <FormControlLabel><FormControlLabelText>{t.fieldValidUntil}</FormControlLabelText></FormControlLabel>
            {isPermanent ? (
              <Box bg="rgba(0, 112, 74, 0.1)" borderRadius="$md" px="$4" py="$3" minHeight={44} justifyContent="center" borderWidth={1} borderColor="#00704A">
                <Text color="#00704A" fontWeight="$semibold">{t.permanentLabel}</Text>
              </Box>
            ) : hasDatePicker && DateTimePicker ? (
              <>
                <RNPressable onPress={() => setShowPickerUntil(true)}>
                  <Box bg="$backgroundLight0" borderWidth={1} borderColor="$borderLight300" borderRadius="$md" px="$4" py="$3" minHeight={44} justifyContent="center">
                    <Text color="$textLight900">{form.validUntil || '—'}</Text>
                  </Box>
                </RNPressable>
                {showPickerUntil && (
                  <DateTimePicker
                    value={form.validUntil ? new Date(form.validUntil) : defaultUntil}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={form.validFrom ? new Date(form.validFrom) : today}
                    onChange={(_, date) => {
                      if (Platform.OS === 'android') setShowPickerUntil(false);
                      if (date) setForm((f) => ({ ...f, validUntil: formatDateYMD(date) }));
                    }}
                    onTouchCancel={() => setShowPickerUntil(false)}
                  />
                )}
              </>
            ) : (
              <Input><InputField value={form.validUntil} onChangeText={(v) => setForm((f) => ({ ...f, validUntil: v }))} placeholder="YYYY-MM-DD" /></Input>
            )}
          </FormControl>
          <Button size="md" variant={isPermanent ? 'solid' : 'outline'} bg={isPermanent ? '#00704A' : undefined} borderColor="#00704A" onPress={() => setIsPermanent((p) => !p)}>
            <ButtonText color={isPermanent ? '$white' : '#00704A'}>∞ {t.permanentPromo}</ButtonText>
          </Button>

            {error ? <Text color="$error600">{error}</Text> : null}

            <Box
              bg="rgba(245, 158, 11, 0.14)"
              borderRadius="$md"
              p="$3"
              borderWidth={1}
              borderColor="rgba(217, 119, 6, 0.45)"
            >
              <Text fontSize="$xs" color="$textLight800" lineHeight="$sm">
                {t.reviewBeforePublish}
              </Text>
            </Box>

            <Button size="lg" bg="#00704A" onPress={handleSubmit} isDisabled={loading}>
              <ButtonText>{loading ? (language === 'es' ? 'Enviando...' : 'Sending...') : t.submit}</ButtonText>
            </Button>

            <Button size="sm" variant="link" onPress={openWebForm}>
              <ButtonText color="#00704A" fontSize="$sm">🔗 {t.submitFromWeb}</ButtonText>
            </Button>
          </VStack>
        </VStack>
      </ScrollView>
    </Box>
  );
}
