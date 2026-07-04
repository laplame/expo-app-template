# Flujo de datos: Inicio · Cupones · Tienda

Mapa de variables, entradas, salidas y flujo inter-pantallas de las tres vistas principales.

---

## 1. HomeScreen (`src/screens/HomeScreen.tsx`)

`Home` y `Cupones` son la **misma pantalla**: cuando se llega desde "Cupones" del menú el param `scrollToPromotions: true` hace un scroll automático a la sección de promociones.

### 1.1 Parámetros de ruta (entrada)

| Param | Tipo | Origen | Efecto |
|-------|------|--------|--------|
| `scrollToPromotions` | `boolean?` | Drawer "Cupones" → `Home, { scrollToPromotions: true }` | Scroll animado hasta el listado de promociones en `onLayout` |
| `redeemPromotionId` | `string?` | `PromotionsMap` → `Home, { redeemPromotionId }` | Abre el modal de QR directamente para esa promoción |

### 1.2 Estado local

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `redeemedProduct` | `RedeemedProduct \| null` | Promoción seleccionada; su existencia dispara el modal de cupón QR |
| `couponImagePreviewUrl` | `string \| null` | URL para el lightbox de imagen de cupón |
| `deviceId` | `string` | ID de dispositivo (AsyncStorage via `getOrCreateDeviceId`) |
| `secureRedeemCode` | `string` | Valor del QR generado por el servidor o fallback local |
| `couponLuxaesRedeemed` | `number \| null` | % de LUXAE a redimir (badge del QR) |
| `qrIssueState` | `'idle' \| 'issuing' \| 'ready' \| 'error' \| 'redirect'` | Máquina de estados del QR de descuento |
| `qrSecondsLeft` | `number \| null` | Cuenta regresiva de validez del QR (TTL del servidor) |
| `qrIssueError` | `string \| null` | Mensaje de error del QR (`'expired'` o mensaje de API) |
| `qrWarning` | `string \| null` | Aviso de modo fallback local |
| `redirectToUrl` | `string \| null` | URL cuando la promoción redirige en vez de generar QR |
| `specialProducts` | `ApiPromotionDoc[]` | Promociones activas traídas del API (caché + red) |
| `promosLoading` | `boolean` | Indicador de carga de promociones |
| `promosError` | `string \| null` | Error de carga de promociones |
| `coffeePunches` | `number` (0-10) | Sellos acumulados en tarjeta de café |
| `coffeeSyncing` | `boolean` | Estado de sincronización de puntos de café |
| `coffeeSyncError` | `string \| null` | Error de sync de café |
| `showRewardsQRModal` | `boolean` | Modal de QR para registrar consumo de bebida |
| `showCoffeeQRModal` | `boolean` | Modal de QR de tarjeta de café (rota cada 1 min) |
| `showUserQRModal` | `boolean` | Modal de dirección de wallet (pagar / cobrar) |
| `kycPercent` | `number` (0-100) | Porcentaje de campos KYC completados (barra superior) |
| `preferredMall` | `PreferredMall \| null` | Mall preferido del usuario (de AsyncStorage) |
| `homeWalletAddress` | `string \| null` | Primera dirección de wallet activa |
| `promoSectionY` | `number` | Posición Y de la sección de promociones para `scrollTo` |
| `coffeeQRMinuteSlot` | `number` | Slot de minuto (`floor(Date.now()/60000)`) — rota el QR de café |
| `currentDateTime` | `string` | Fecha-hora formateada, se actualiza cada 60 s |

### 1.3 Datos de contexto (entrada)

| Contexto | Valores usados |
|----------|----------------|
| `SettingsContext` | `language`, `userName`, `appBackgroundUri` |
| `VerificationAccessContext` | `revealWalletAddresses`, `refreshVerificationAccess()` |
| `WalletBalanceContext` | `formattedBalance`, `formattedLuxaeBalance`, `luxaeBalance`, `currency`, `refreshLuxaeBalance()`, `luxaeHydrated` |
| `useAppTheme` | `brand` (color primario) |

### 1.4 Servicios llamados (lectura)

| Servicio | Función | Endpoint / Storage key |
|----------|---------|------------------------|
| `deviceIdentity` | `getOrCreateDeviceId()` | AsyncStorage `device_id` |
| `storage` | `getKycForm()` | AsyncStorage `kyc_form` → 9 campos → % |
| `storage` | `getPreferredMall()` | AsyncStorage `preferred_mall` |
| `storage` | `getWalletAddresses()` | AsyncStorage `wallet_addresses` |
| `storage` | `getCachedPromotions()` | AsyncStorage `cached_promotions` |
| `storage` | `getCoffeePunches()` | AsyncStorage `coffee_punches` |
| `loyaltyApi` | `getCoffeeLoyaltyState({deviceId, cafeId})` | `GET /api/loyalty/coffee` |
| `promotionsApi` | `getPromotions({limit:24, page:1, status:'active'})` | `GET /api/promotions` |
| `discountQrApi` | `createDiscountQrToken({...})` | `POST /api/qr/create-discount-token` |

### 1.5 Servicios llamados (escritura)

| Servicio | Función | Efecto |
|----------|---------|--------|
| `storage` | `setCachedPromotions(docs)` | Guarda listado de promociones en caché |
| `storage` | `setCoffeePunches(n)` | Persiste sellos de café localmente |
| `storage` | `appendWalletLedgerEntry({...})` | Agrega entrada al libro de wallet (cupón redimido / café) |
| `loyaltyApi` | `sendLoyaltyToServer({...})` | `POST /api/loyalty/sync` |
| `loyaltyApi` | `postCoffeeLoyaltyTransaction({...})` | `POST /api/loyalty/coffee/transaction` |
| `discountQrApi` | `redeemDiscountQrToken({...})` | `POST /api/qr/redeem` (al cerrar modal con QR activo) |

### 1.6 Tipo `redeemedProduct` (modelo interno)

```ts
{
  id: string;                 // doc._id
  name: string;               // doc.title | doc.productName
  discountPercentage?: number;
  influencerId: string;       // doc.influencerId | doc.creatorId | 'guest'
  referralCode: string;       // 'L4D-{_id}-{base36(Date.now())}'
  walletAddress: string;      // doc.walletAddress | doc.storeWalletAddress
  imageUrl?: string | null;
  gpsGate?: boolean;          // true si requiere validación por GPS
  storeLat?: number;
  storeLng?: number;
  radiusMeters?: number;      // default 500 m
}
```

### 1.7 QR — Máquina de estados

```
idle ──(tap promoción)──► issuing ──(API OK)──► ready ──(TTL=0)──► error
                                    └(API redirect)──► redirect
                                    └(API error)──► error ──(retry)──► issuing
```

### 1.8 Salidas de navegación

| Destino | Condición | Parámetros |
|---------|-----------|------------|
| `NYC` | Usuario toca su nombre sin `userName` | — |
| `PromotionsMap` | GPS falla la validación de proximidad | `{ focusPromotionId: doc._id }` |
| `PromotionsMap` | Toca widget de mall preferido | — |
| `Wallet` | Bottom nav ícono billetera | — |
| `Settings` | Bottom nav ícono perfil · tarjeta café sin tienda | — |
| `Linking.openURL` | WhatsApp con cupón / redirect de promoción / smart contract | URL externas |
| `openDrawer()` | ☰ en la barra superior | — |

---

## 2. Pantalla Cupones

Cupones **no es una pantalla separada**. Es `HomeScreen` activada con `scrollToPromotions: true`.

```
DrawerNav  ──navigate('Home', { scrollToPromotions: true })──►  HomeScreen
                                                                 └─ useFocusEffect detecta param
                                                                 └─ setTimeout 350ms
                                                                 └─ mainScrollRef.scrollTo({ y: promoSectionY - 12 })
                                                                 └─ setParams({ scrollToPromotions: undefined })
```

El contenido de cupones es el bloque `specialProducts` (API `GET /api/promotions`), renderizado con `PromotionCard`. Al tocar una tarjeta se llama `handlePromotionPress(doc)` que:
1. Valida GPS si `isInStoreGpsCoupon(doc)` y hay coordenadas
2. Setea `redeemedProduct` → dispara `runIssueCouponQr()`

---

## 3. MallOrderScreen · Tienda (`src/screens/MallOrderScreen.tsx`)

### 3.1 Estado local

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `currentBanner` | `number` (0 \| 1) | Índice del banner activo en el carrusel |
| `userLocation` | `{lat, lng} \| null` | Ubicación GPS del usuario |
| `preferredStore` | `{id, name, nameEs, address?} \| null` | Tienda preferida de Settings |
| `cartItems` | `Record<productId, qty>` | Cantidades del carrito de despensa |
| `cartExpanded` | `boolean` | Estado del panel colapsable del carrito |

### 3.2 Datos de contexto (entrada)

| Contexto | Valores usados |
|----------|----------------|
| `SettingsContext` | `language` |
| `useBrandTheme` | `brand`, `brandBg`, `brandBorder` |

### 3.3 Servicios llamados (lectura)

| Servicio | Función | Fuente |
|----------|---------|--------|
| `storage` | `getPreferredMall()` | AsyncStorage `preferred_mall` |
| `storage` | `getDespensaCart(storeId)` | AsyncStorage `despensa_cart_{storeId}` |
| `nearbyStores` | `getStoresNearUser(lat, lng, 12)` | Datos estáticos + BizneAI (CDMX) |
| `expo-location` | `requestForegroundPermissionsAsync()` | Permisos GPS |
| `expo-location` | `getCurrentPositionAsync()` | Posición GPS |
| `data/groceryProducts` | `TOP_20_GROCERY_PRODUCTS` | Datos estáticos (mock) |

### 3.4 Servicios llamados (escritura)

| Servicio | Función | Efecto |
|----------|---------|--------|
| `storage` | `setDespensaCart({storeId, items})` | Persiste carrito localmente |

### 3.5 Tipos de datos clave

```ts
// NearbyStore (src/data/nearbyStores.ts)
{
  id: string;
  name: string;
  nameEs: string;
  type: 'department' | 'supermarket' | 'coffee';
  address: string;
  addressEs: string;
  latitude: number;
  longitude: number;
  status?: 'active' | 'inactive';
  whatsapp?: string;
  source?: string;
  // + distanceKm (calculado por getStoresNearUser)
}

// PreferredMall (src/services/storage.ts)
{
  id: string;
  name: string;
  nameEs?: string;
  fullAddress?: string;
  latitude?: number;
  longitude?: number;
  source?: 'bizneai' | string;
}

// DespensaCart (src/services/storage.ts)
{
  storeId: string;
  items: Record<string, number>;  // { [productId]: qty }
}

// GroceryProduct (src/data/groceryProducts.ts)
{
  id: string;
  name: string;
  nameEs: string;
  unit?: string;
  unitEs?: string;
}
```

### 3.6 Lógica del mapa

```
getStoresNearUser(lat?, lng?, maxCount=12)
  ├─ Si no hay ubicación → ordena por índice estático (CDMX)
  └─ Si hay ubicación → ordena por distancia haversine y agrega distanceKm

mapRegion = bbox de (nearbyStores + userLocation)
  ├─ latitudeDelta = max(0.05, maxLat - minLat + 0.02)
  └─ longitudeDelta = max(0.05, maxLng - minLng + 0.02)
```

### 3.7 Salidas de navegación

| Destino | Condición |
|---------|-----------|
| `Linking.openURL('maps://app?daddr=...')` | iOS: "Llévame ahí" |
| `Linking.openURL('https://www.google.com/maps/dir/...')` | Android: "Llévame ahí" |

> La pantalla **no navega** a ninguna otra pantalla interna de la app.

---

## 4. Mapa de dependencias compartidas

```
AsyncStorage (storage.ts)
  ├─ preferred_mall          ← HomeScreen, MallOrderScreen
  ├─ wallet_addresses        ← HomeScreen
  ├─ kyc_form                ← HomeScreen (barra KYC)
  ├─ coffee_punches          ← HomeScreen
  ├─ cached_promotions       ← HomeScreen
  └─ despensa_cart_{id}      ← MallOrderScreen

Context
  ├─ WalletBalanceContext    ← HomeScreen (saldo LUXAE)
  ├─ VerificationAccessContext ← HomeScreen (revelar wallet)
  └─ SettingsContext         ← HomeScreen, MallOrderScreen (idioma, userName, tema)

API
  ├─ GET /api/promotions     ← HomeScreen (lista de cupones)
  ├─ POST /api/qr/create-discount-token ← HomeScreen (generar cupón)
  ├─ POST /api/qr/redeem     ← HomeScreen (cerrar cupón)
  ├─ GET  /api/loyalty/coffee ← HomeScreen (sincronizar puntos café)
  └─ POST /api/loyalty/coffee/transaction ← HomeScreen (registrar visita café)
```

---

## 5. Gaps y observaciones

| # | Observación | Pantalla |
|---|-------------|----------|
| 1 | `hasActiveOrder = true` está **hardcodeado**; no hay API de pedidos conectada | Home |
| 2 | Sección "Recomendaciones" muestra placeholder sin fuente de datos | Home |
| 3 | Bottom nav íconos "Order/☕" y "Favoritos/❤️" apuntan a `Home` y `PromotionsMap` respectivamente; no hay tab de pedidos real | Home |
| 4 | El botón "Pedir" en MallOrderScreen no tiene `onPress` funcional (el `Pressable` no navega) | Tienda |
| 5 | `nearbyStores` usa datos estáticos (CDMX hardcoded). En producción debería usar Google Places API o BizneAI | Tienda |
| 6 | `coffeeQRValue` incluye `coffeePunches` en el QR — si la tienda valida el QR, puede leer el saldo directo del código | Home |
| 7 | `EXPO_PUBLIC_AUTH_DEV_MODE` no está en el `.env` activo — el panel de cuentas de prueba no aparecerá en Login hasta activarlo | Login |
