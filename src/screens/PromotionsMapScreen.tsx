import React, { useMemo, useEffect, useState } from 'react';
import {
  Box,
  Text,
  ScrollView,
  VStack,
  HStack,
  Pressable,
  Button,
  ButtonText,
} from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { Linking, Platform, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useSettings } from '../context/SettingsContext';
import { TOKEN_SYMBOL } from '../constants/luxToken';
import {
  getPromotions,
  ApiPromotionDoc,
  getStoreCoordinatesFromDoc,
  isInStoreGpsCoupon,
  getLocationRadiusFromDoc,
} from '../services/promotionsApi';
import { haversineMeters } from '../utils/geo';
import { MOCK_NEARBY_STORES, type NearbyStore } from '../data/nearbyStores';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useBrandTheme } from '../theme/useBrandTheme';

export interface Promotion {
  id: string;
  name: string;
  nameEs: string;
  address: string;
  addressEs: string;
  latitude: number;
  longitude: number;
  offer: string;
  offerEs: string;
  cryptoAccepted: string[];
  distanceKm: number | null;
  gpsRequired: boolean;
  radiusMeters: number;
  source?: string;
  whatsapp?: string;
}

const DEFAULT_COORDS = { lat: 19.4326, lng: -99.1332 };

function mapApiDocToPromotion(
  doc: ApiPromotionDoc,
  user: { lat: number; lng: number } | null
): Promotion & { distanceKm: number | null } {
  const loc = doc.storeLocation;
  const address = [loc?.address, loc?.city, loc?.country].filter(Boolean).join(', ') || '—';
  const pt = getStoreCoordinatesFromDoc(doc);
  const lat = pt?.lat ?? DEFAULT_COORDS.lat;
  const lng = pt?.lng ?? DEFAULT_COORDS.lng;
  const gpsRequired = isInStoreGpsCoupon(doc);
  const radiusMeters = getLocationRadiusFromDoc(doc);
  let distanceKm: number | null = null;
  if (user && pt) {
    distanceKm = haversineMeters(user, pt) / 1000;
  } else if (!pt) {
    distanceKm = null;
  }
  return {
    id: doc._id,
    name: doc.productName || doc.title,
    nameEs: doc.productName || doc.title,
    address,
    addressEs: address,
    latitude: lat,
    longitude: lng,
    offer: doc.title || doc.description || '',
    offerEs: doc.title || doc.description || '',
    cryptoAccepted: [TOKEN_SYMBOL, 'ETH', 'USDT'],
    distanceKm,
    gpsRequired,
    radiusMeters,
  };
}

function mapStoreToPromotion(
  store: NearbyStore,
  user: { lat: number; lng: number } | null
): Promotion & { distanceKm: number | null } {
  const distanceKm = user ? haversineMeters(user, { lat: store.latitude, lng: store.longitude }) / 1000 : null;
  return {
    id: `store-${store.id}`,
    name: store.name,
    nameEs: store.nameEs,
    address: store.address,
    addressEs: store.addressEs,
    latitude: store.latitude,
    longitude: store.longitude,
    offer: store.type === 'coffee' ? 'Coffee Shop · active' : 'Geolocated business · active',
    offerEs: store.type === 'coffee' ? 'Cafetería · activo' : 'Negocio geolocalizado · activo',
    cryptoAccepted: [TOKEN_SYMBOL],
    distanceKm,
    gpsRequired: true,
    radiusMeters: 500,
    source: store.source,
    whatsapp: store.whatsapp,
  };
}

function getLocalGeoPromotions(user: { lat: number; lng: number } | null): (Promotion & { distanceKm: number | null })[] {
  return MOCK_NEARBY_STORES
    .filter((store) => store.status === 'active' && store.latitude != null && store.longitude != null)
    .map((store) => mapStoreToPromotion(store, user));
}

function getTranslations(language: 'en' | 'es') {
  if (language === 'es') {
    return {
      title: 'Cupones y promociones',
      subtitle: 'Promociones cercanas y crypto para pagar',
      nearest: 'Más cercana',
      payWith: 'Pagar con',
      getDirections: 'Llévame ahí',
      link4dealRewards: 'link4deal rewards',
      mapMockupLabel: 'Mapa (mockup)',
      mapMockupHint: 'Aquí irá el mapa con GPS',
      gpsCoupon: 'Cupón por ubicación',
      withinRadius: 'Dentro del radio',
      getCoupon: 'Ver cupón',
      tooFarForCoupon: 'Acércate al local para ver el cupón',
    };
  }
  return {
    title: 'Coupons & Promotions',
    subtitle: 'Nearby deals and crypto to pay',
    nearest: 'Nearest',
    payWith: 'Pay with',
    getDirections: 'Take me there',
    link4dealRewards: 'link4deal rewards',
    mapMockupLabel: 'Map (mockup)',
    mapMockupHint: 'Map & GPS logic coming here',
    gpsCoupon: 'Location-based coupon',
    withinRadius: 'Within radius',
    getCoupon: 'View coupon',
    tooFarForCoupon: 'Get closer to the store to view the coupon',
  };
}

export default function PromotionsMapScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PromotionsMap'>>();
  const { language } = useSettings();
  const { brand, brandBg, brandBorder } = useBrandTheme();
  const t = useMemo(() => getTranslations(language), [language]);
  const [promotions, setPromotions] = useState<(Promotion & { distanceKm: number | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPromotions({ limit: 12, status: 'active' }).then((res) => {
      if (cancelled) return;
      const apiPromos = res.ok && res.docs?.length ? res.docs.map((d) => mapApiDocToPromotion(d, userLocation)) : [];
      const localPromos = getLocalGeoPromotions(userLocation).filter(
        (local) =>
          !apiPromos.some((api) =>
            [api.name, api.nameEs, api.address, api.addressEs].some((value) =>
              value.toLowerCase().includes(local.name.toLowerCase().replace(' cafetería', ''))
            )
          )
      );
      const list = [...apiPromos, ...localPromos];
      list.sort((a, b) => {
        const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return da - db;
      });
      const focusId = route.params?.focusPromotionId;
      const ordered = focusId
        ? [...list].sort((a, b) => (a.id === focusId ? -1 : b.id === focusId ? 1 : 0))
        : list;
      setPromotions(ordered);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userLocation, route.params?.focusPromotionId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted' && mounted) {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
          setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const openDirections = (promo: Promotion & { distanceKm: number | null }) => {
    const dest = `${promo.latitude},${promo.longitude}`;
    let url: string;
    if (Platform.OS === 'ios') {
      // Apple Maps: daddr = destino; sin saddr usa ubicación actual
      url = `maps://app?daddr=${dest}`;
    } else {
      // Google Maps: incluir origin si tenemos ubicación para mejor ruta
      const params = new URLSearchParams({
        api: '1',
        destination: dest,
        travelmode: 'driving',
      });
      if (userLocation) {
        params.set('origin', `${userLocation.lat},${userLocation.lng}`);
      }
      url = `https://www.google.com/maps/dir/?${params.toString()}`;
    }
    Linking.openURL(url);
  };

  const mapRegion = useMemo(() => {
    const points = [...promotions.map((p) => ({ lat: p.latitude, lng: p.longitude }))];
    if (userLocation) points.push(userLocation);
    if (points.length === 0) return { latitude: DEFAULT_COORDS.lat, longitude: DEFAULT_COORDS.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const padding = 0.02;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.05, maxLat - minLat + padding),
      longitudeDelta: Math.max(0.05, maxLng - minLng + padding),
    };
  }, [promotions, userLocation]);

  const MapSection = () => {
    if (Platform.OS === 'web') {
      return (
        <Box height={240} width="100%" bg="$backgroundLight200" justifyContent="center" alignItems="center" borderBottomWidth={1} borderBottomColor="$borderLight200">
          <VStack alignItems="center" space="xs" bg="rgba(255,255,255,0.9)" px="$4" py="$2" borderRadius="$md">
            <Text fontSize="$sm" fontWeight="$bold" color={brand}>{t.mapMockupLabel}</Text>
            <Text fontSize="$xs" color="$textLight500">{language === 'es' ? 'Mapa disponible en app nativa' : 'Map available in native app'}</Text>
          </VStack>
        </Box>
      );
    }
    return (
      <Box height={240} width="100%" borderBottomWidth={1} borderBottomColor="$borderLight200" overflow="hidden">
        <MapView
          style={styles.map}
          initialRegion={mapRegion}
          showsUserLocation={!!userLocation}
          showsMyLocationButton
        >
          {promotions.map((promo) => (
            <Marker
              key={promo.id}
              coordinate={{ latitude: promo.latitude, longitude: promo.longitude }}
              title={language === 'es' ? promo.nameEs : promo.name}
              description={promo.address}
              pinColor={brand}
            />
          ))}
        </MapView>
      </Box>
    );
  };

  return (
    <Box flex={1} bg="$white">
      <StatusBar style="dark" />
      <VStack flex={1}>
        <MapSection />

        <ScrollView flex={1} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          <Text fontSize="$lg" fontWeight="$bold" color={brand} mb="$1">
            {t.title}
          </Text>
          <Text fontSize="$sm" color="$textLight600" mb="$4">
            {t.subtitle}
          </Text>

          {loading ? (
            <Box py="$8" alignItems="center">
              <Text color="$textLight500">{language === 'es' ? 'Cargando promociones...' : 'Loading promotions...'}</Text>
            </Box>
          ) : promotions.length === 0 ? (
            <Box py="$8" alignItems="center">
              <Text color="$textLight500">{language === 'es' ? 'No hay promociones activas' : 'No active promotions'}</Text>
            </Box>
          ) : (
            <VStack space="md">
              {promotions.map((promo, index) => (
                <Box
                  key={promo.id}
                  bg="$backgroundLight50"
                  borderRadius="$lg"
                  p="$4"
                  borderLeftWidth={4}
                  borderLeftColor={brand}
                >
                  {index === 0 && userLocation && (
                    <HStack bg={brand} alignSelf="flex-start" px="$2" py="$1" borderRadius="$md" mb="$2">
                      <Text fontSize="$xs" color="$white" fontWeight="$bold">
                        {t.nearest}
                      </Text>
                    </HStack>
                  )}
                  {promo.gpsRequired ? (
                    <HStack bg="#6B21A8" alignSelf="flex-start" px="$2" py="$1" borderRadius="$md" mb="$2" flexWrap="wrap">
                      <Text fontSize="$xs" color="$white" fontWeight="$bold">
                        📍 {t.gpsCoupon} · {promo.radiusMeters} m
                      </Text>
                    </HStack>
                  ) : null}
                  <Text fontSize="$lg" fontWeight="$bold" color="$textLight900">
                    {language === 'es' ? promo.nameEs : promo.name}
                  </Text>
                  <Text fontSize="$sm" color="$textLight600" mt="$1">
                    {language === 'es' ? promo.addressEs : promo.address}
                  </Text>
                  <Text fontSize="$sm" color={brand} mt="$1" numberOfLines={2}>
                    {language === 'es' ? promo.offerEs : promo.offer}
                  </Text>
                  {promo.source || promo.whatsapp ? (
                    <Text fontSize="$xs" color="$textLight500" mt="$1">
                      {[promo.source ? `${language === 'es' ? 'Datos proporcionados por' : 'Data provided by'} ${promo.source}` : null, promo.whatsapp ? `WhatsApp: ${promo.whatsapp}` : null].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                  <HStack flexWrap="wrap" mt="$2" alignItems="center">
                    <Text fontSize="$xs" color="$textLight500" mr="$1">
                      {t.payWith}:
                    </Text>
                    <Text fontSize="$xs" fontWeight="$semibold" color="$textLight800">
                      {promo.cryptoAccepted.join(', ')}
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between" alignItems="center" mt="$2">
                    <VStack space="xs" flex={1}>
                      <Text fontSize="$xs" color="$textLight500">
                        {promo.distanceKm != null ? `${promo.distanceKm.toFixed(2)} km` : '—'}
                      </Text>
                      {promo.gpsRequired &&
                      userLocation &&
                      promo.distanceKm != null &&
                      promo.distanceKm * 1000 <= promo.radiusMeters ? (
                        <Text fontSize="$xs" color="#15803d" fontWeight="$semibold">
                          ✓ {t.withinRadius}
                        </Text>
                      ) : null}
                    </VStack>
                    <Pressable
                      onPress={() => openDirections(promo)}
                      bg={brand}
                      borderRadius="$md"
                      px="$3"
                      py="$2"
                    >
                      <Text fontSize="$sm" color="$white" fontWeight="$medium">
                        {t.getDirections}
                      </Text>
                    </Pressable>
                  </HStack>
                  {promo.gpsRequired ? (
                    <Button
                      mt="$3"
                      size="sm"
                      bg={brand}
                      isDisabled={!!userLocation && promo.distanceKm != null && promo.distanceKm * 1000 > promo.radiusMeters}
                      onPress={() => {
                        (navigation as any).navigate('Home', {
                          redeemPromotionId: promo.id,
                          scrollToPromotions: true,
                        });
                      }}
                    >
                      <ButtonText>
                        {userLocation && promo.distanceKm != null && promo.distanceKm * 1000 > promo.radiusMeters
                          ? t.tooFarForCoupon
                          : t.getCoupon}
                      </ButtonText>
                    </Button>
                  ) : null}
                </Box>
              ))}
            </VStack>
          )}
        </ScrollView>
      </VStack>
    </Box>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
});
