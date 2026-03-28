/**
 * Pantalla para crear promociones.
 * Ref: assets/docs/upload_promo.md
 * Si falta algo (error, validación), se ofrece redirigir al sitio web.
 */
import React, { useState, useMemo } from 'react';
import { ScrollView, Alert, Linking, Platform, ActionSheetIOS, Pressable as RNPressable, Image } from 'react-native';

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
} from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useSettings } from '../context/SettingsContext';
import { useWalletBalance } from '../context/WalletBalanceContext';
import { TOKEN_SYMBOL } from '../constants/luxToken';
import {
  postPromotion,
  analyzePromotionImage,
  PromotionPayload,
  PromotionStoreLocation,
  SITE_PROMO_URLS,
  AnalyzeImageData,
} from '../services/promotionsApi';

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  });
  const [pricesFromIa, setPricesFromIa] = useState(false);
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
      pricesInUsd: language === 'es' ? '(precios IA en USD)' : '(AI prices in USD)',
    }),
    [language]
  );

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
    const storeLocation: PromotionStoreLocation = {
      address: (currentForm.address ?? '').trim() || undefined,
      city: (currentForm.city ?? '').trim() || undefined,
      state: (currentForm.state ?? '').trim() || undefined,
      country: (currentForm.country ?? '').trim() || undefined,
      coordinates: null,
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
      currency: currency,
      discountPercentage: discount,
      offerType,
      cashbackValue: !isNaN(cashback) ? cashback : undefined,
      termsAndConditions: (currentForm.termsAndConditions ?? '').trim() || undefined,
      storeName: (currentForm.storeName ?? '').trim() || '',
      storeLocation: storeLocation,
      isPhysicalStore: false,
      validFrom,
      validUntil,
      status: 'active',
    };
  };

  const handleSubmit = async () => {
    setError(null);
    const payload = buildPayload(form);
    if (!payload) return;
    setLoading(true);
    const result = await postPromotion(
      payload,
      images.length > 0 ? images : undefined
    );
    setLoading(false);
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
      });
      setIsPermanent(false);
      setImages([]);
      const detailUrl = promoId ? SITE_PROMO_URLS.promotionDetail(promoId) : null;
      Alert.alert(
        t.success,
        t.earnedTokens + (detailUrl ? `\n\n${language === 'es' ? '¿Ver la promoción?' : 'View promotion?'}` : ''),
        detailUrl
          ? [
              { text: t.ok, style: 'cancel' },
              { text: language === 'es' ? 'Ver detalle' : 'View detail', onPress: () => Linking.openURL(detailUrl) },
            ]
          : [{ text: t.ok }]
      );
    } else {
      const errMsg = result.error ?? 'Error';
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
          <HStack space="md">
            <FormControl flex={1}>
              <FormControlLabel><FormControlLabelText>{t.fieldOriginalPrice}</FormControlLabelText></FormControlLabel>
              <Input><InputField keyboardType="numeric" value={form.originalPrice} onChangeText={(v) => setForm((f) => ({ ...f, originalPrice: v }))} placeholder="0" /></Input>
            </FormControl>
            <FormControl flex={1}>
              <FormControlLabel><FormControlLabelText>{t.fieldCurrentPrice}</FormControlLabelText></FormControlLabel>
              <Input><InputField keyboardType="numeric" value={form.currentPrice} onChangeText={(v) => setForm((f) => ({ ...f, currentPrice: v }))} placeholder="0" /></Input>
            </FormControl>
          </HStack>
          <HStack space="md">
            <FormControl flex={1}>
              <FormControlLabel><FormControlLabelText>{t.fieldOfferType}</FormControlLabelText></FormControlLabel>
              <Input><InputField value={form.offerType} onChangeText={(v) => setForm((f) => ({ ...f, offerType: v }))} placeholder="percentage" /></Input>
            </FormControl>
            <FormControl flex={1}>
              <FormControlLabel><FormControlLabelText>{t.fieldCashback}</FormControlLabelText></FormControlLabel>
              <Input><InputField keyboardType="numeric" value={form.cashbackValue} onChangeText={(v) => setForm((f) => ({ ...f, cashbackValue: v }))} placeholder="0" /></Input>
            </FormControl>
          </HStack>
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
          )}
          </FormControl>
          <Button size="md" variant={isPermanent ? 'solid' : 'outline'} bg={isPermanent ? '#00704A' : undefined} borderColor="#00704A" onPress={() => setIsPermanent((p) => !p)}>
            <ButtonText color={isPermanent ? '$white' : '#00704A'}>∞ {t.permanentPromo}</ButtonText>
          </Button>

            {error ? <Text color="$error600">{error}</Text> : null}

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
