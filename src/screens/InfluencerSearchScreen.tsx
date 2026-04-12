/**
 * Búsqueda y creación de influencers con Gemini.
 * Ref: assets/docs/buscarInfluencers.md
 * Flujo: buscar → si existe mostrar tarjeta; si no, formulario para crear y redirigir.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Text,
  ScrollView,
  VStack,
  HStack,
  Input,
  InputField,
  Button,
  ButtonText,
  Pressable,
} from '@gluestack-ui/themed';
import { Alert, Image, Linking, Modal, Pressable as RNPressable } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import * as ImagePicker from 'expo-image-picker';
import { useSettings } from '../context/SettingsContext';
import { useWalletBalance, USD_TO_MXN } from '../context/WalletBalanceContext';
import InfluencerCard from '../components/InfluencerCard';
import { TOKEN_SYMBOL } from '../constants/luxToken';
import {
  searchInfluencers,
  analyzeProfileImage,
  createInfluencer,
  uploadInfluencerAvatar,
  type InfluencerDoc,
  type InfluencerPlatform,
  type CreateInfluencerPayload,
} from '../services/influencersApi';

const PLATFORM_OPTIONS: { id: InfluencerPlatform; label: string; short: string }[] = [
  { id: 'youtube', label: 'YouTube', short: 'YT' },
  { id: 'tiktok', label: 'TikTok', short: 'TikTok' },
  { id: 'instagram', label: 'Instagram', short: 'IG' },
];

const CATEGORIES: { id: string; labelEs: string; labelEn: string }[] = [
  { id: 'fashion', labelEs: 'Moda', labelEn: 'Fashion' },
  { id: 'beauty', labelEs: 'Belleza', labelEn: 'Beauty' },
  { id: 'lifestyle', labelEs: 'Lifestyle', labelEn: 'Lifestyle' },
  { id: 'tech', labelEs: 'Tech', labelEn: 'Tech' },
  { id: 'food', labelEs: 'Comida', labelEn: 'Food' },
  { id: 'sports', labelEs: 'Deportes', labelEn: 'Sports' },
  { id: 'travel', labelEs: 'Viajes', labelEn: 'Travel' },
  { id: 'comico', labelEs: 'Cómico', labelEn: 'Comedy' },
  { id: 'dance', labelEs: 'Baile', labelEn: 'Dance' },
  { id: 'other', labelEs: 'Otro', labelEn: 'Other' },
];

const INFLUENCER_REWARD_LUXAE = 5;

const SOCIAL_PLATFORMS = [
  { id: 'Instagram', label: 'Instagram' },
  { id: 'TikTok', label: 'TikTok' },
  { id: 'YouTube', label: 'YouTube' },
  { id: 'Twitter', label: 'Twitter' },
];

const COUNTRIES = [
  { id: 'mx', labelEs: 'México', labelEn: 'Mexico' },
  { id: 'es', labelEs: 'España', labelEn: 'Spain' },
  { id: 'us', labelEs: 'Estados Unidos', labelEn: 'USA' },
  { id: 'co', labelEs: 'Colombia', labelEn: 'Colombia' },
  { id: 'ar', labelEs: 'Argentina', labelEn: 'Argentina' },
  { id: 'cl', labelEs: 'Chile', labelEn: 'Chile' },
  { id: 'pe', labelEs: 'Perú', labelEn: 'Peru' },
  { id: 've', labelEs: 'Venezuela', labelEn: 'Venezuela' },
  { id: 'ec', labelEs: 'Ecuador', labelEn: 'Ecuador' },
  { id: 'br', labelEs: 'Brasil', labelEn: 'Brazil' },
  { id: 'other', labelEs: 'Otro', labelEn: 'Other' },
];

export default function InfluencerSearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'InfluencerSearch'>>();
  const { language, currency } = useSettings();
  const { addLuxaeBalance } = useWalletBalance();

  const initialQuery = route.params?.initialQuery ?? '';
  const initialPlatform = (route.params?.platform ?? 'youtube') as InfluencerPlatform;
  const initialImageUri = route.params?.imageUri;

  const [query, setQuery] = useState(initialQuery);
  const [platform, setPlatform] = useState<InfluencerPlatform>(initialPlatform);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [influencers, setInfluencers] = useState<InfluencerDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createdInfluencer, setCreatedInfluencer] = useState<InfluencerDoc | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);

  const [form, setForm] = useState<
    CreateInfluencerPayload & {
      socialByPlatform: Record<string, { username: string; followers: string }>;
      profileImageUri?: string;
    }
  >({
    displayName: '',
    bio: '',
    location: '',
    categories: [],
    socialMedia: [],
    profileImageUri: undefined,
    socialByPlatform: {
      Instagram: { username: '', followers: '' },
      TikTok: { username: '', followers: '' },
      YouTube: { username: '', followers: '' },
      Twitter: { username: '', followers: '' },
    },
  });

  const t = {
    title: language === 'es' ? 'Buscar Influencers' : 'Search Influencers',
    search: language === 'es' ? 'Buscar' : 'Search',
    uploadScreenshot: language === 'es' ? 'Subir screenshot' : 'Upload screenshot',
    createNew: language === 'es' ? 'Crear influencer' : 'Create influencer',
    displayName: language === 'es' ? 'Nombre' : 'Display name',
    bio: language === 'es' ? 'Biografía' : 'Bio',
    location: language === 'es' ? 'Ubicación' : 'Location',
    categories: language === 'es' ? 'Categorías' : 'Categories',
    socialMedia: language === 'es' ? 'Redes sociales' : 'Social media',
    submit: language === 'es' ? 'Crear perfil' : 'Create profile',
    noResults: language === 'es' ? 'No se encontraron influencers' : 'No influencers found',
    addAnother: language === 'es' ? 'Agregar otro' : 'Add another',
    done: language === 'es' ? 'Listo' : 'Done',
    viewInfluencersFeed: language === 'es' ? 'Ver Influencers y votar' : 'See Influencers & Vote',
    cancel: language === 'es' ? 'Cancelar' : 'Cancel',
    ok: language === 'es' ? 'Aceptar' : 'OK',
    analyzing: language === 'es' ? 'Analizando con IA...' : 'Analyzing with AI...',
    openWeb: language === 'es' ? 'Abrir formulario en la web' : 'Open form on website',
    createViaWeb: language === 'es' ? 'Crear influencer desde la web' : 'Create influencer on website',
    searchFailedAlternative:
      language === 'es'
        ? 'Crear influencer desde la web como alternativa'
        : 'Create influencer on web as alternative',
    notSignedUpMessage:
      language === 'es'
        ? 'Este influencer no está dado de alta, pero podemos darlo de alta para que sepa que tiene fans que buscan promociones de él.'
        : 'This influencer is not signed up, but we can add them so they know they have fans looking for their promotions.',
    influencerRewardHint:
      language === 'es'
        ? `Ganarás ${INFLUENCER_REWARD_LUXAE} ${TOKEN_SYMBOL} (${INFLUENCER_REWARD_LUXAE} USD) por cada influencer que crees.`
        : `You'll earn ${INFLUENCER_REWARD_LUXAE} ${TOKEN_SYMBOL} (${INFLUENCER_REWARD_LUXAE} USD) for each influencer you create.`,
    followers: language === 'es' ? 'Seguidores' : 'Followers',
    socialNetworks: language === 'es' ? 'Redes y seguidores' : 'Networks and followers',
    profilePhoto: language === 'es' ? 'Foto de perfil (opcional)' : 'Profile photo (optional)',
    pickProfilePhoto: language === 'es' ? 'Elegir foto' : 'Pick photo',
    changePhoto: language === 'es' ? 'Cambiar foto' : 'Change photo',
  };

  const runAnalyze = useCallback(
    async (uri: string) => {
      setAnalyzing(true);
      setError(null);
      const result = await analyzeProfileImage({ uri, name: 'profile.jpg', type: 'image/jpeg' });
      setAnalyzing(false);
      if (result.ok && result.data) {
        const d = result.data;
        setForm((f) => ({
          ...f,
          profileImageUri: uri,
          displayName: (d.displayName ?? f.displayName).trim() || f.displayName,
          bio: d.bio ?? f.bio,
          location: d.location ?? f.location,
          categories: d.categories ?? f.categories ?? [],
          socialByPlatform: (() => {
            const next = { ...f.socialByPlatform };
            const platMap: Record<string, string> = { instagram: 'Instagram', ig: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', yt: 'YouTube', twitter: 'Twitter', x: 'Twitter' };
            if (d.socialMedia?.length) {
              d.socialMedia.forEach((s) => {
                const raw = (s.platform ?? 'Instagram').trim();
                const plat = platMap[raw.toLowerCase()] ?? (raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()) ?? 'Instagram';
                if (next[plat]) {
                  next[plat] = {
                    username: (s.username ?? s.url ?? '').trim() || next[plat].username,
                    followers: s.followers != null ? String(s.followers) : next[plat].followers,
                  };
                }
              });
            }
            return next;
          })(),
        }));
        setShowCreateForm(true);
      } else {
        setError(result.error ?? (language === 'es' ? 'No se pudo analizar' : 'Could not analyze'));
      }
    },
    [language]
  );

  React.useEffect(() => {
    if (initialImageUri) {
      runAnalyze(initialImageUri);
    }
  }, [initialImageUri, runAnalyze]);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) {
      Alert.alert(t.ok, language === 'es' ? 'Escribe algo para buscar' : 'Type something to search');
      return;
    }
    setSearching(true);
    setError(null);
    setShowCreateForm(false);
    const result = await searchInfluencers({ q, platform, limit: 20 });
    setSearching(false);
    if (result.ok) {
      const list = result.influencers ?? [];
      setInfluencers(list);
      if (list.length === 0) {
        setShowCreateForm(true);
        setForm((f) => ({ ...f, displayName: q }));
      }
    } else {
      setError(result.error ?? 'Error');
      setInfluencers([]);
      setShowCreateForm(true);
      setForm((f) => ({ ...f, displayName: q }));
    }
  }, [query, platform, t.ok, language]);

  const pickScreenshot = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.ok, language === 'es' ? 'Permiso de galería requerido' : 'Gallery permission required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: (ImagePicker as any).MediaTypeOptions?.Images ?? ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      runAnalyze(result.assets[0].uri);
    }
  }, [runAnalyze, t.ok, language]);

  /** Elige foto de perfil sin analizar (opcional, independiente de la captura). Ref: buscarInfluencers.md §5 */
  const pickProfilePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.ok, language === 'es' ? 'Permiso de galería requerido' : 'Gallery permission required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: (ImagePicker as any).MediaTypeOptions?.Images ?? ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setForm((f) => ({ ...f, profileImageUri: result.assets[0].uri }));
    }
  }, [t.ok, language]);

  const handleSubmit = useCallback(async () => {
    const displayName = (form.displayName ?? '').trim();
    const bio = (form.bio ?? '').trim();
    if (!displayName) {
      Alert.alert(t.ok, language === 'es' ? 'El nombre es obligatorio' : 'Name is required');
      return;
    }
    if (!bio) {
      Alert.alert(t.ok, language === 'es' ? 'La biografía es obligatoria' : 'Bio is required');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const parseFollowers = (v: string): number => {
      const s = String(v || '').trim().toUpperCase();
      const num = parseFloat(s.replace(/[^\d.]/g, '')) || 0;
      if (s.endsWith('K')) return Math.round(num * 1000);
      if (s.endsWith('M')) return Math.round(num * 1000000);
      return Math.round(num);
      };

      const socialMedia = SOCIAL_PLATFORMS.map((p) => {
      const data = form.socialByPlatform?.[p.id];
      if (!data) return null;
      const username = (data.username ?? '').trim();
      const followersNum = parseFollowers(data.followers ?? '');
      if (!username && followersNum <= 0) return null;
      return {
        platform: p.id,
        username: username || undefined,
        followers: followersNum > 0 ? followersNum : undefined,
        verified: false,
      };
    }).filter(Boolean) as { platform: string; username?: string; followers?: number; verified: boolean }[];

    let avatarUrl: string | undefined;
    if (form.profileImageUri) {
      const avatarRes = await uploadInfluencerAvatar(form.profileImageUri);
      if (avatarRes.ok && avatarRes.avatarUrl) {
        avatarUrl = avatarRes.avatarUrl;
      } else if (avatarRes.error) {
        Alert.alert(
          language === 'es' ? 'Error al subir foto' : 'Upload failed',
          avatarRes.error,
          [{ text: 'OK' }]
        );
      }
    }
    const usernames = socialMedia.map((s) => (s.username ?? '').trim().replace(/^@/, '')).filter(Boolean);
    const searchRes = await searchInfluencers({ q: displayName, limit: 20 });
    if (searchRes.ok && (searchRes.influencers ?? []).length > 0) {
      const normalized = (s: string) => s.toLowerCase().trim();
      const match = searchRes.influencers!.find((inf) => {
        const infName = normalized((inf.displayName ?? inf.name ?? '').toString());
        if (infName === normalized(displayName)) return true;
        if (usernames.length > 0 && inf.socialMedia) {
          const infUsers = Array.isArray(inf.socialMedia)
            ? inf.socialMedia.map((x) => normalized((x.username ?? x.url ?? '').toString()).replace(/^@/, ''))
            : Object.values(inf.socialMedia as Record<string, string>).map((v) => normalized(v).replace(/^@/, ''));
          return usernames.some((u) => infUsers.includes(u));
        }
        return false;
      });
      if (match) {
        setInfluencers([match]);
        setShowCreateForm(false);
        Alert.alert(
          language === 'es' ? 'Ya está dado de alta' : 'Already registered',
          language === 'es'
            ? `"${displayName}" ya figura en la app. Puedes ver su ficha abajo o en Influencers y votar.`
            : `"${displayName}" is already listed. You can see their card below or under Influencers & Vote.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }
    const payload: CreateInfluencerPayload = {
      displayName,
      bio: bio || undefined,
      location: form.location?.trim() || undefined,
      collaborationPreferences: form.categories?.length ? form.categories : undefined,
      socialMedia: socialMedia.length ? socialMedia : undefined,
      avatar: avatarUrl,
    };
    const result = await createInfluencer(payload);
    if (result.ok && result.data) {
      setCreatedInfluencer(result.data);
      setShowCreateForm(false);
      await addLuxaeBalance(INFLUENCER_REWARD_LUXAE);
      setRewardAmount(INFLUENCER_REWARD_LUXAE);
      setShowRewardModal(true);
      return;
    }
    if (result.duplicate) {
      const again = await searchInfluencers({ q: displayName, limit: 20 });
      if (again.ok && (again.influencers?.length ?? 0) > 0) {
        setInfluencers(again.influencers!);
        setShowCreateForm(false);
      }
      Alert.alert(
        language === 'es' ? 'Ya está dado de alta' : 'Already registered',
        language === 'es'
          ? (result.error ||
              `El servidor indica que este perfil ya existe. ${again.ok && (again.influencers?.length ?? 0) > 0 ? 'Mostramos coincidencias abajo.' : 'Prueba buscar por nombre.'}`)
          : (result.error ||
              `The server says this profile already exists. ${again.ok && (again.influencers?.length ?? 0) > 0 ? 'Matches are shown below.' : 'Try searching by name.'}`),
        [{ text: 'OK' }]
      );
      setError(null);
      return;
    }
      const errMsg = result.error ?? (language === 'es' ? 'Error al crear' : 'Create failed');
      setError(errMsg);
      Alert.alert(language === 'es' ? 'No se pudo crear' : 'Could not create', errMsg, [{ text: 'OK' }]);
    } catch (submitErr: unknown) {
      const msg =
        submitErr instanceof Error ? submitErr.message : String(submitErr ?? 'Error');
      setError(msg);
      Alert.alert(
        language === 'es' ? 'Error' : 'Error',
        language === 'es' ? `Algo salió mal: ${msg}` : `Something went wrong: ${msg}`,
        [{ text: 'OK' }]
      );
    } finally {
      setCreating(false);
    }
  }, [form, t.ok, language, addLuxaeBalance]);

  const resetAndAddAnother = useCallback(() => {
    setCreatedInfluencer(null);
    setForm({
      displayName: '',
      bio: '',
      location: '',
      categories: [],
      socialMedia: [],
      profileImageUri: undefined,
      socialByPlatform: {
        Instagram: { username: '', followers: '' },
        TikTok: { username: '', followers: '' },
        YouTube: { username: '', followers: '' },
        Twitter: { username: '', followers: '' },
      },
    });
    setShowCreateForm(true);
  }, []);

  const INFLUENCER_SETUP_URL = 'https://www.damecodigo.com/influencer-setup';
  const locMatchesCountry = useMemo(
    () =>
      COUNTRIES.filter((c) => c.id !== 'other').some(
        (c) => (language === 'es' ? c.labelEs : c.labelEn) === form.location
      ),
    [form.location, language]
  );
  const openWebForm = () => {
    Linking.openURL(INFLUENCER_SETUP_URL).catch(() => {});
  };

  return (
    <ScrollView flex={1} bg="$backgroundLight50">
      <VStack p="$4" space="lg">
        {/* Header: búsqueda */}
        <Box bg="$white" borderRadius="$lg" p="$3" borderWidth={1} borderColor="$borderLight200">
          <VStack space="sm">
            <HStack space="xs" flexWrap="wrap">
              {PLATFORM_OPTIONS.map((p) => {
                const isSelected = platform === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setPlatform(p.id)}
                    bg={isSelected ? '#00704A' : '$backgroundLight100'}
                    borderRadius="$full"
                    px="$3"
                    py="$1.5"
                    _pressed={{ opacity: 0.85 }}
                  >
                    <Text fontSize="$sm" fontWeight="$semibold" color={isSelected ? '$white' : '$textLight700'}>
                      {p.short}
                    </Text>
                  </Pressable>
                );
              })}
            </HStack>
            <HStack space="sm" alignItems="center">
              <Input flex={1} size="sm" borderRadius="$lg">
                <InputField
                  placeholder={t.search}
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                />
              </Input>
              <Pressable
                onPress={handleSearch}
                bg="#00704A"
                borderRadius="$lg"
                px="$4"
                py="$2"
                _pressed={{ opacity: 0.9 }}
                disabled={searching}
              >
                <Text fontSize="$lg" color="$white">{searching ? '…' : '🔍'}</Text>
              </Pressable>
              <Pressable
                onPress={pickScreenshot}
                bg="#1a73e8"
                borderRadius="$lg"
                p="$2"
                _pressed={{ opacity: 0.9 }}
                disabled={analyzing}
              >
                <Text fontSize="$lg">{analyzing ? '…' : '🖼️'}</Text>
              </Pressable>
            </HStack>
          </VStack>
        </Box>

        {error && (
          <Box bg="$error100" p="$3" borderRadius="$md">
            <Text color="$error700" fontSize="$sm" mb="$2">{error}</Text>
            <Pressable onPress={openWebForm}>
              <Text fontSize="$sm" color="#00704A" fontWeight="$semibold" textDecorationLine="underline">
                🔗 {t.searchFailedAlternative}
              </Text>
              <Text fontSize="$xs" color="#00704A" mt="$1">
                {INFLUENCER_SETUP_URL}
              </Text>
            </Pressable>
          </Box>
        )}

        {/* Resultado: tarjeta(s) de influencer existente(s) */}
        {influencers.length > 0 && !showCreateForm && !createdInfluencer && (
          <VStack space="sm">
            <Text fontSize="$md" fontWeight="$bold">{influencers.length} {language === 'es' ? 'encontrado(s)' : 'found'}</Text>
            {influencers.map((inf) => (
              <InfluencerCard
                key={inf._id ?? inf.id ?? inf.displayName}
                influencer={inf}
                compact
                language={language}
                onPress={() => {}}
              />
            ))}
          </VStack>
        )}

        {/* Tarjeta del influencer recién creado */}
        {createdInfluencer && (
          <VStack space="md">
            <Text fontSize="$lg" fontWeight="$bold" color="#00704A">
              {language === 'es' ? '¡Influencer creado!' : 'Influencer created!'}
            </Text>
            <InfluencerCard influencer={createdInfluencer} compact={false} language={language} />
            <HStack space="sm" flexWrap="wrap">
              <Button flex={1} minW={120} onPress={resetAndAddAnother} variant="outline" borderColor="#00704A">
                <ButtonText color="#00704A">{t.addAnother}</ButtonText>
              </Button>
              <Button
                flex={1}
                minW={120}
                onPress={() => navigation.navigate('InfluencersList')}
                variant="outline"
                borderColor="#00704A"
              >
                <ButtonText color="#00704A">{t.viewInfluencersFeed}</ButtonText>
              </Button>
              <Button flex={1} minW={120} onPress={() => navigation.goBack()} bg="#00704A">
                <ButtonText color="$white">{t.done}</ButtonText>
              </Button>
            </HStack>
          </VStack>
        )}

        {/* Formulario para crear (cuando no existe) */}
        {showCreateForm && !createdInfluencer && (
          <VStack space="md">
            <Box bg="#e8f5e9" borderRadius="$lg" p="$4" borderWidth={1} borderColor="#00704A" borderLeftWidth={4}>
              <Text fontSize="$sm" color="$textLight700" lineHeight="$lg">
                ✨ {t.notSignedUpMessage}
              </Text>
              <Text fontSize="$xs" color="$textLight600" mt="$2">
                💰 {t.influencerRewardHint}
              </Text>
            </Box>
            <Box bg="$white" borderRadius="$lg" p="$4" borderWidth={1} borderColor="$borderLight200">
              <Text fontSize="$lg" fontWeight="$bold" mb="$3">{t.createNew}</Text>
              <VStack space="xs" mb="$3">
                <Text fontSize="$sm" fontWeight="$medium">{t.profilePhoto}</Text>
                {form.profileImageUri ? (
                  <HStack alignItems="center" space="sm">
                    <Image
                      source={{ uri: form.profileImageUri }}
                      style={{ width: 64, height: 64, borderRadius: 32 }}
                      resizeMode="cover"
                    />
                    <Pressable
                      onPress={pickProfilePhoto}
                      bg="$backgroundLight100"
                      borderRadius="$md"
                      px="$3"
                      py="$2"
                      _pressed={{ opacity: 0.9 }}
                    >
                      <Text fontSize="$sm" color="#00704A" fontWeight="$medium">{t.changePhoto}</Text>
                    </Pressable>
                  </HStack>
                ) : (
                  <Pressable
                    onPress={pickProfilePhoto}
                    bg="$backgroundLight100"
                    borderRadius="$md"
                    borderWidth={1}
                    borderColor="$borderLight300"
                    borderStyle="dashed"
                    p="$4"
                    alignItems="center"
                    _pressed={{ opacity: 0.9 }}
                  >
                    <Text fontSize="$2xl">🖼️</Text>
                    <Text fontSize="$sm" color="$textLight600" mt="$1">{t.pickProfilePhoto}</Text>
                  </Pressable>
                )}
              </VStack>
              <VStack space="md">
                <VStack space="xs">
                <Text fontSize="$sm" fontWeight="$medium">{t.displayName} *</Text>
                <Input size="sm">
                  <InputField
                    placeholder="Ej. @mi_influencer"
                    value={form.displayName}
                    onChangeText={(v) => setForm((f) => ({ ...f, displayName: v }))}
                  />
                </Input>
                </VStack>
                <VStack space="xs">
                  <Text fontSize="$sm" fontWeight="$medium">{t.bio} *</Text>
                <Input size="sm" minH={80}>
                  <InputField
                    placeholder={language === 'es' ? 'Breve descripción...' : 'Brief description...'}
                    value={form.bio}
                    onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))}
                    multiline
                  />
                </Input>
                </VStack>
                <VStack space="xs">
                  <Text fontSize="$sm" fontWeight="$medium">{t.location}</Text>
                  <HStack space="sm" flexWrap="wrap">
                    {COUNTRIES.map((country) => {
                    const label = language === 'es' ? country.labelEs : country.labelEn;
                    const isSelected = country.id === 'other'
                      ? !form.location?.trim() || !locMatchesCountry
                      : form.location === label;
                    return (
                      <Pressable
                        key={country.id}
                        onPress={() =>
                          setForm((f) => ({
                            ...f,
                            location: country.id === 'other' ? '' : label,
                          }))
                        }
                        bg={isSelected ? '#00704A' : '$backgroundLight100'}
                        borderRadius="$full"
                        px="$2"
                        py="$1"
                        _pressed={{ opacity: 0.85 }}
                      >
                        <Text fontSize="$xs" color={isSelected ? '$white' : '$textLight700'}>{label}</Text>
                      </Pressable>
                    );
                    })}
                  </HStack>
                  {(!form.location?.trim() || !locMatchesCountry) && (
                  <Input size="sm" mt="$2">
                    <InputField
                      placeholder={language === 'es' ? 'Ciudad o país (si elegiste Otro)' : 'City or country (if you chose Other)'}
                      value={form.location}
                      onChangeText={(v) => setForm((f) => ({ ...f, location: v }))}
                    />
                  </Input>
                  )}
                </VStack>
                <HStack space="sm" flexWrap="wrap" mt="$2">
                  {CATEGORIES.map((c) => {
                  const isSelected = form.categories?.includes(c.id);
                  const label = language === 'es' ? c.labelEs : c.labelEn;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() =>
                        setForm((f) => ({
                          ...f,
                          categories: isSelected
                            ? (f.categories ?? []).filter((x) => x !== c.id)
                            : [...(f.categories ?? []), c.id],
                        }))
                      }
                      bg={isSelected ? '#00704A' : '$backgroundLight100'}
                      borderRadius="$full"
                      px="$2"
                      py="$1"
                      _pressed={{ opacity: 0.85 }}
                    >
                      <Text fontSize="$xs" color={isSelected ? '$white' : '$textLight700'}>{label}</Text>
                    </Pressable>
                  );
                  })}
                </HStack>
                <VStack space="sm" mt="$3">
                  <Text fontSize="$sm" fontWeight="$medium">{t.socialNetworks}</Text>
                  <Text fontSize="$xs" color="$textLight500">
                    {language === 'es' ? 'Usuario y seguidores por plataforma (opcional)' : 'Username and followers per platform (optional)'}
                  </Text>
                  {SOCIAL_PLATFORMS.map((p) => (
                    <HStack key={p.id} space="sm" alignItems="center">
                      <Text fontSize="$sm" w={72}>{p.label}</Text>
                      <Input flex={1} size="sm" minW={80}>
                        <InputField
                          placeholder="@usuario"
                          value={form.socialByPlatform[p.id]?.username ?? ''}
                          onChangeText={(v) =>
                            setForm((f) => ({
                              ...f,
                              socialByPlatform: {
                                ...f.socialByPlatform,
                                [p.id]: { ...(f.socialByPlatform[p.id] ?? { username: '', followers: '' }), username: v },
                              },
                            }))
                          }
                        />
                      </Input>
                      <Input size="sm" w={80}>
                        <InputField
                          placeholder="0"
                          value={form.socialByPlatform[p.id]?.followers ?? ''}
                          onChangeText={(v) =>
                            setForm((f) => ({
                              ...f,
                              socialByPlatform: {
                                ...f.socialByPlatform,
                                [p.id]: { ...(f.socialByPlatform[p.id] ?? { username: '', followers: '' }), followers: v },
                              },
                            }))
                          }
                          keyboardType="numeric"
                          placeholder="0 o 14K"
                        />
                      </Input>
                    </HStack>
                  ))}
                </VStack>
                <Button
                onPress={handleSubmit}
                bg="#00704A"
                disabled={creating}
              >
                <ButtonText color="$white">{creating ? '…' : t.submit}</ButtonText>
                </Button>
                <Box bg="$backgroundLight100" p="$3" borderRadius="$md" mt="$2">
                <Text fontSize="$xs" color="$textLight600" mb="$1">
                  {language === 'es' ? '¿Prefieres usar la web?' : 'Prefer to use the web?'}
                </Text>
                <Pressable onPress={openWebForm}>
                  <Text fontSize="$sm" color="#00704A" fontWeight="$semibold" textDecorationLine="underline">
                    🔗 {t.createViaWeb}
                  </Text>
                  <Text fontSize="$2xs" color="$textLight500" mt="$0.5">{INFLUENCER_SETUP_URL}</Text>
                </Pressable>
                </Box>
              </VStack>
            </Box>
          </VStack>
        )}

        {/* Modal: recompensa por subir influencer */}
        <Modal visible={showRewardModal} transparent animationType="fade">
          <RNPressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24,
            }}
            onPress={() => setShowRewardModal(false)}
          >
            <RNPressable
              style={{ width: '100%', maxWidth: 340 }}
              onPress={(e) => e.stopPropagation()}
            >
              <Box bg="$white" borderRadius="$2xl" p="$6" alignItems="center">
                <Text fontSize="$3xl" mb="$2">🎉</Text>
                <Text fontSize="$xl" fontWeight="$bold" color="#00704A" mb="$2">
                  {language === 'es' ? '¡Recompensa!' : 'Reward!'}
                </Text>
                <Text fontSize="$lg" fontWeight="$bold" color="#00704A">
                  +{rewardAmount} {TOKEN_SYMBOL}
                </Text>
                <Text fontSize="$sm" color="$textLight600" mt="$1">
                  {language === 'es' ? `1 ${TOKEN_SYMBOL} = 1 USD` : `1 ${TOKEN_SYMBOL} = 1 USD`}
                </Text>
                {currency === 'MXN' && (
                  <Text fontSize="$xs" color="$textLight500" mt="$0.5">
                    ≈ ${(rewardAmount * USD_TO_MXN).toLocaleString('es-MX')} MXN
                  </Text>
                )}
                <Text fontSize="$sm" color="$textLight700" textAlign="center" mt="$3">
                  {language === 'es'
                    ? `Has ganado ${rewardAmount} ${TOKEN_SYMBOL} por registrar un influencer.`
                    : `You earned ${rewardAmount} ${TOKEN_SYMBOL} for registering an influencer.`}
                </Text>
                <VStack space="sm" w="$full" mt="$5">
                  <Button
                    size="md"
                    bg="#00704A"
                    onPress={() => {
                      setShowRewardModal(false);
                      navigation.navigate('InfluencersList');
                    }}
                  >
                    <ButtonText>{t.viewInfluencersFeed}</ButtonText>
                  </Button>
                  <Button size="md" variant="outline" borderColor="#00704A" onPress={() => setShowRewardModal(false)}>
                    <ButtonText color="#00704A">{language === 'es' ? '¡Entendido!' : 'Got it!'}</ButtonText>
                  </Button>
                </VStack>
              </Box>
            </RNPressable>
          </RNPressable>
        </Modal>

        {influencers.length === 0 && !showCreateForm && !createdInfluencer && !searching && !initialImageUri && (
          <VStack space="md" py="$4">
            <Text fontSize="$sm" color="$textLight500" textAlign="center">
              {language === 'es'
                ? 'Busca por nombre o sube un screenshot para analizar con IA y crear el perfil.'
                : 'Search by name or upload a screenshot to analyze with AI and create the profile.'}
            </Text>
            <Pressable
              onPress={openWebForm}
              bg="$white"
              borderRadius="$lg"
              p="$4"
              borderWidth={1}
              borderColor="$borderLight200"
              borderStyle="dashed"
              _pressed={{ opacity: 0.9 }}
            >
              <Text fontSize="$md" color="#00704A" fontWeight="$semibold" textAlign="center">
                🔗 {t.createViaWeb}
              </Text>
              <Text fontSize="$xs" color="$textLight500" textAlign="center" mt="$1">
                {INFLUENCER_SETUP_URL}
              </Text>
            </Pressable>
          </VStack>
        )}
      </VStack>
    </ScrollView>
  );
}
