import React, { useMemo, useState, useEffect } from 'react';
import { Box, Text, ScrollView, VStack, HStack, Pressable } from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { Dimensions, Linking, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSettings } from '../context/SettingsContext';
import { getPreferredMall, getDespensaCart, setDespensaCart } from '../services/storage';
import { getStoresNearUser, type NearbyStore } from '../data/nearbyStores';
import { TOP_20_GROCERY_PRODUCTS } from '../data/groceryProducts';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_COORDS = { lat: 19.4326, lng: -99.1332 };

function getTranslations(language: 'en' | 'es') {
  if (language === 'es') {
    return {
      screenTitle: 'Tiendas',
      selectStore: 'Elige tu tienda en Ajustes',
      order: 'Pedir',
      banner1Title: 'FIN DE SEMANA BIEN PASADO',
      banner1Offer: 'Compra 1 Bebida y 1 Comida, Obtén Bebida Gratis',
      banner2Title: 'OFERTA ESPECIAL',
      banner2Offer: 'Descuento del 20% en todos los productos',
      termsApply: 'Términos y condiciones aplican',
      rewards: 'Recompensas',
      nearbyStores: 'Tiendas más cercanas',
      nearbyStoresSubtitle: 'Departamentales y supermercados',
      department: 'Tienda departamental',
      supermarket: 'Supermercado',
      getDirections: 'Llévame ahí',
      mapLabel: 'Mapa de tiendas',
      cartTitle: 'Carrito de despensa',
      cartSubtitle: '20 productos más solicitados',
      expand: 'Expandir',
      collapse: 'Contraer',
      add: 'Agregar',
      remove: 'Quitar',
      inCart: 'en carrito',
      emptyCart: 'Tu carrito está vacío. Agrega productos.',
    };
  }
  return {
    screenTitle: 'Stores',
    selectStore: 'Select your store in Settings',
    order: 'Order',
    banner1Title: 'WEEKEND WELL SPENT',
    banner1Offer: 'Buy 1 Beverage & 1 Food, Get Free Beverage',
    banner2Title: 'SPECIAL OFFER',
    banner2Offer: '20% off on all products',
    termsApply: 'Terms and conditions apply',
    rewards: 'Rewards',
    nearbyStores: 'Nearest stores',
    nearbyStoresSubtitle: 'Department stores & supermarkets',
    department: 'Department store',
    supermarket: 'Supermarket',
    getDirections: 'Take me there',
    mapLabel: 'Stores map',
    cartTitle: 'Grocery cart',
    cartSubtitle: '20 most requested products',
    expand: 'Expand',
    collapse: 'Collapse',
    add: 'Add',
    remove: 'Remove',
    inCart: 'in cart',
    emptyCart: 'Your cart is empty. Add products.',
  };
}

export default function MallOrderScreen() {
  const { language } = useSettings();
  const [currentBanner, setCurrentBanner] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [preferredStore, setPreferredStore] = useState<{ id: string; name: string; nameEs: string; address?: string } | null>(null);
  const [cartItems, setCartItems] = useState<Record<string, number>>({});
  const [cartExpanded, setCartExpanded] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      getPreferredMall().then((mall) => {
        if (mall) {
          setPreferredStore({ id: mall.id, name: mall.name, nameEs: mall.nameEs ?? mall.name, address: undefined });
          getDespensaCart(mall.id).then((cart) => {
            setCartItems(cart?.items ?? {});
          });
        } else {
          setPreferredStore(null);
          setCartItems({});
        }
      });
    }, [])
  );

  const saveCart = React.useCallback(
    (storeId: string, items: Record<string, number>) => {
      setDespensaCart({ storeId, items });
    },
    []
  );

  const addToCart = (productId: string) => {
    if (!mainStore) return;
    const next = { ...cartItems, [productId]: (cartItems[productId] ?? 0) + 1 };
    setCartItems(next);
    saveCart(mainStore.id, next);
  };

  const removeFromCart = (productId: string) => {
    if (!mainStore) return;
    const current = cartItems[productId] ?? 0;
    if (current <= 1) {
      const { [productId]: _, ...rest } = cartItems;
      setCartItems(rest);
      saveCart(mainStore.id, rest);
    } else {
      const next = { ...cartItems, [productId]: current - 1 };
      setCartItems(next);
      saveCart(mainStore.id, next);
    }
  };
  const t = useMemo(() => getTranslations(language), [language]);
  const appName = language === 'es' ? 'damecodigo' : 'link4deal';

  const nearbyStores = useMemo(
    () => getStoresNearUser(userLocation?.lat ?? null, userLocation?.lng ?? null, 8),
    [userLocation?.lat, userLocation?.lng]
  );

  const mainStore = useMemo(() => {
    if (!preferredStore) return null;
    const fullStore = nearbyStores.find((s) => s.id === preferredStore.id);
    return {
      ...preferredStore,
      address: fullStore ? (language === 'es' ? fullStore.addressEs : fullStore.address) : preferredStore.address,
    };
  }, [preferredStore, nearbyStores, language]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted' && mounted) {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const openDirections = (store: NearbyStore & { distanceKm: number }) => {
    const dest = `${store.latitude},${store.longitude}`;
    if (Platform.OS === 'ios') {
      Linking.openURL(`maps://app?daddr=${dest}`);
    } else {
      const params = new URLSearchParams({ api: '1', destination: dest, travelmode: 'driving' });
      if (userLocation) params.set('origin', `${userLocation.lat},${userLocation.lng}`);
      Linking.openURL(`https://www.google.com/maps/dir/?${params.toString()}`);
    }
  };

  const mapRegion = useMemo(() => {
    const points = nearbyStores.map((s) => ({ lat: s.latitude, lng: s.longitude }));
    if (userLocation) points.push(userLocation);
    if (points.length === 0) return { latitude: DEFAULT_COORDS.lat, longitude: DEFAULT_COORDS.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    return {
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      latitudeDelta: Math.max(0.05, Math.max(...lats) - Math.min(...lats) + 0.02),
      longitudeDelta: Math.max(0.05, Math.max(...lngs) - Math.min(...lngs) + 0.02),
    };
  }, [nearbyStores, userLocation]);

  const MapSection = () => {
    if (Platform.OS === 'web') {
      return (
        <Box height={200} bg="$backgroundLight200" justifyContent="center" alignItems="center" borderRadius="$lg" mb="$4">
          <VStack alignItems="center" space="xs" bg="rgba(255,255,255,0.9)" px="$4" py="$2" borderRadius="$md">
            <Text fontSize="$sm" fontWeight="$bold" color="#00704A">{t.mapLabel}</Text>
            <Text fontSize="$xs" color="$textLight500">{language === 'es' ? 'Mapa disponible en app nativa' : 'Map available in native app'}</Text>
          </VStack>
        </Box>
      );
    }
    return (
      <Box height={200} width="100%" borderRadius="$lg" overflow="hidden" mb="$4">
        <MapView style={{ width: '100%', height: '100%' }} initialRegion={mapRegion} showsUserLocation={!!userLocation} showsMyLocationButton>
          {nearbyStores.map((store) => (
            <Marker
              key={store.id}
              coordinate={{ latitude: store.latitude, longitude: store.longitude }}
              title={language === 'es' ? store.nameEs : store.name}
              description={language === 'es' ? store.addressEs : store.address}
              pinColor={store.type === 'department' ? '#00704A' : '#1a73e8'}
            />
          ))}
        </MapView>
      </Box>
    );
  };

  const banners = useMemo(
    () => [
      {
        title: `${appName.toUpperCase()} ${t.rewards.toUpperCase()}`,
        mainText: t.banner1Title,
        offer: t.banner1Offer,
        label: 'FREE TALL SIZE',
      },
      {
        title: `${appName.toUpperCase()} ${t.rewards.toUpperCase()}`,
        mainText: t.banner2Title,
        offer: t.banner2Offer,
        label: 'LIMITED TIME',
      },
    ],
    [appName, t]
  );

  return (
    <Box flex={1} bg="$white">
      <StatusBar style="dark" />
      <ScrollView flex={1} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <VStack space="lg">
          {/* 1. Tienda principal (de Settings) + Pedir - ARRIBA */}
          <Box bg="$backgroundLight50" borderRadius="$xl" p="$4" borderLeftWidth={4} borderLeftColor="#00704A">
            <VStack space="md">
              <VStack space="xs">
                <Text fontSize="$lg" fontWeight="$bold" color="#00704A">
                  {mainStore ? (language === 'es' ? mainStore.nameEs : mainStore.name) : t.selectStore}
                </Text>
                {mainStore?.address && (
                  <Text fontSize="$sm" color="$textLight600">
                    {mainStore.address}
                  </Text>
                )}
                {!mainStore && (
                  <Text fontSize="$sm" color="$textLight500">
                    {language === 'es' ? 'Configuración → Tienda preferida' : 'Settings → Preferred Mall'}
                  </Text>
                )}
              </VStack>
              <Pressable bg="#00704A" borderRadius="$lg" px="$4" py="$3" alignSelf="flex-start" opacity={mainStore ? 1 : 0.6}>
                <HStack space="xs" alignItems="center">
                  <Text fontSize="$md" color="$white" fontWeight="$semibold">
                    {t.order}
                  </Text>
                  <Text fontSize="$xl">🛒</Text>
                </HStack>
              </Pressable>
            </VStack>
          </Box>

          {/* 1b. Carrito despensa (solo si hay tienda preferida) - Colapsable */}
          {mainStore && (
            <Box bg="$backgroundLight50" borderRadius="$xl" p="$4" borderLeftWidth={4} borderLeftColor="#1a73e8" overflow="hidden">
              <Pressable onPress={() => setCartExpanded((e) => !e)}>
                <HStack justifyContent="space-between" alignItems="center" mb={cartExpanded ? '$3' : 0}>
                  <VStack flex={1}>
                    <Text fontSize="$lg" fontWeight="$bold" color="#00704A">
                      {t.cartTitle}
                    </Text>
                    <Text fontSize="$sm" color="$textLight600">
                      {t.cartSubtitle}
                      {!cartExpanded && ` · ${Object.values(cartItems).reduce((s, n) => s + n, 0)} ${language === 'es' ? 'productos' : 'items'}`}
                    </Text>
                  </VStack>
                  <Text fontSize="$lg" color="#00704A">
                    {cartExpanded ? '▼' : '▶'}
                  </Text>
                </HStack>
              </Pressable>
              {cartExpanded && (
              <Box>
              <VStack space="sm">
                {TOP_20_GROCERY_PRODUCTS.map((product) => {
                  const qty = cartItems[product.id] ?? 0;
                  const displayName = language === 'es' ? product.nameEs : product.name;
                  const displayUnit = language === 'es' ? product.unitEs ?? product.unit : product.unit;
                  return (
                    <HStack
                      key={product.id}
                      justifyContent="space-between"
                      alignItems="center"
                      py="$2"
                      borderBottomWidth={1}
                      borderBottomColor="$borderLight200"
                    >
                      <VStack flex={1}>
                        <Text fontSize="$sm" fontWeight="$medium" color="$textLight900">
                          {displayName}
                        </Text>
                        {displayUnit && (
                          <Text fontSize="$xs" color="$textLight500">
                            {displayUnit}
                          </Text>
                        )}
                      </VStack>
                      <HStack alignItems="center" space="sm">
                        <Pressable
                          onPress={() => removeFromCart(product.id)}
                          bg="$backgroundLight200"
                          borderRadius="$full"
                          w={28}
                          h={28}
                          justifyContent="center"
                          alignItems="center"
                          opacity={qty > 0 ? 1 : 0.4}
                        >
                          <Text fontSize="$md" fontWeight="$bold" color="#00704A">−</Text>
                        </Pressable>
                        <Text fontSize="$sm" fontWeight="$semibold" minWidth={24} textAlign="center">
                          {qty}
                        </Text>
                        <Pressable
                          onPress={() => addToCart(product.id)}
                          bg="#00704A"
                          borderRadius="$full"
                          w={28}
                          h={28}
                          justifyContent="center"
                          alignItems="center"
                        >
                          <Text fontSize="$md" fontWeight="$bold" color="$white">+</Text>
                        </Pressable>
                      </HStack>
                    </HStack>
                  );
                })}
              </VStack>
              {Object.values(cartItems).reduce((s, n) => s + n, 0) === 0 && (
                <Text fontSize="$xs" color="$textLight500" mt="$2" fontStyle="italic">
                  {t.emptyCart}
                </Text>
              )}
              </Box>
              )}
            </Box>
          )}

          {/* 2. DameCodigo Recompensas */}
          <Box>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const offsetX = e.nativeEvent.contentOffset.x;
                const index = Math.round(offsetX / (SCREEN_WIDTH - 40));
                setCurrentBanner(index);
              }}
              scrollEventThrottle={16}
            >
              {banners.map((banner, index) => (
                <Box
                  key={index}
                  width={SCREEN_WIDTH - 40}
                  bg="#F5F5F5"
                  borderRadius="$xl"
                  p="$4"
                  mr="$2"
                  minHeight={180}
                >
                  <VStack space="sm" flex={1} justifyContent="space-between">
                    <Text fontSize="$xs" fontWeight="$bold" color="#00704A">
                      {banner.title}
                    </Text>
                    <VStack space="xs">
                      <Text fontSize="$2xl" fontWeight="$bold" color="$textLight900">
                        {banner.mainText}
                      </Text>
                      <Text fontSize="$sm" color="$textLight700">
                        {banner.offer}
                      </Text>
                    </VStack>
                    <HStack justifyContent="space-between" alignItems="center">
                      <Box bg="#00704A" px="$3" py="$1" borderRadius="$md">
                        <Text fontSize="$xs" fontWeight="$bold" color="$white">
                          {banner.label}
                        </Text>
                      </Box>
                      <Text fontSize="$xs" color="$textLight500">
                        *{t.termsApply}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              ))}
            </ScrollView>
            <HStack justifyContent="center" space="xs" mt="$2">
              {banners.map((_, index) => (
                <Box
                  key={index}
                  width={currentBanner === index ? 24 : 8}
                  height={8}
                  bg={currentBanner === index ? '#00704A' : '#D0D0D0'}
                  borderRadius="$full"
                />
              ))}
            </HStack>
          </Box>

          {/* 3. Mapa + Tiendas más cercanas */}
          <Box>
            <Text fontSize="$lg" fontWeight="$bold" color="#00704A" mb="$1">
              {t.nearbyStores}
            </Text>
            <Text fontSize="$sm" color="$textLight600" mb="$2">
              {t.nearbyStoresSubtitle}
            </Text>
            <MapSection />
            <VStack space="sm" mt="$2">
              {nearbyStores.map((store) => (
                <Box
                  key={store.id}
                  bg="$backgroundLight50"
                  borderRadius="$lg"
                  p="$3"
                  borderLeftWidth={4}
                  borderLeftColor={store.type === 'department' ? '#00704A' : '#1a73e8'}
                >
                  <HStack justifyContent="space-between" alignItems="flex-start">
                    <VStack flex={1} mr="$2">
                      <Text fontSize="$md" fontWeight="$semibold" color="$textLight900">
                        {language === 'es' ? store.nameEs : store.name}
                      </Text>
                      <Text fontSize="$xs" color="$textLight500" mt="$0.5">
                        {language === 'es' ? store.addressEs : store.address}
                      </Text>
                      <Text fontSize="$xs" color="$textLight400" mt="$0.5">
                        {store.distanceKm.toFixed(1)} km · {store.type === 'department' ? t.department : t.supermarket}
                      </Text>
                    </VStack>
                    <Pressable onPress={() => openDirections(store)} bg="#00704A" borderRadius="$md" px="$3" py="$2">
                      <Text fontSize="$sm" color="$white" fontWeight="$medium">
                        {t.getDirections}
                      </Text>
                    </Pressable>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </Box>
        </VStack>
      </ScrollView>
    </Box>
  );
}
