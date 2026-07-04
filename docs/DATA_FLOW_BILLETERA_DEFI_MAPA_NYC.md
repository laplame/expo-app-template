# Flujo de datos: Billetera · Defi.Deal · Mapa de Promociones · NYC

Mapa de variables, entradas, salidas y flujo inter-pantallas de las cuatro vistas.

---

## 1. WalletScreen — Billetera (`src/screens/WalletScreen.tsx`)

### 1.1 Parámetros de ruta

Ninguno. La pantalla no recibe params de navegación.

### 1.2 Estado local

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `defaultAddress` | `string \| null` | Dirección Ethereum/EVM principal |
| `metamaskEthBalance` | `number` | Saldo ETH en wei convertido a ETH |
| `loadingEth` | `boolean` | Carga de saldo ETH |
| `polygonAddress` | `string \| null` | Dirección en red Polygon |
| `polygonMaticBalance` | `number` | Saldo MATIC |
| `loadingMatic` | `boolean` | Carga de saldo MATIC |
| `btcAddress` | `string \| null` | Dirección Bitcoin |
| `btcBalance` | `number` | Saldo BTC |
| `loadingBtc` | `boolean` | Carga BTC |
| `bchAddress` | `string \| null` | Dirección Bitcoin Cash |
| `bchBalance` | `number` | Saldo BCH |
| `loadingBch` | `boolean` | Carga BCH |
| `xrpAddress` | `string \| null` | Dirección XRP |
| `xrpBalance` | `number` | Saldo XRP |
| `loadingXrp` | `boolean` | Carga XRP |
| `solAddress` | `string \| null` | Dirección Solana |
| `solBalance` | `number` | Saldo SOL |
| `loadingSol` | `boolean` | Carga SOL |
| `addAddressModal` | `{visible, chain, input}` | Modal para añadir dirección manual |
| `payReceiveModal` | `{visible, address, chainLabel, initialIntent}` | Modal QR pagar/cobrar |
| `ledgerEntries` | `WalletLedgerEntry[]` | Historial de movimientos LUXAE |

### 1.3 Datos de contexto (entrada)

| Contexto | Valores usados |
|----------|----------------|
| `SettingsContext` | `language`, `currency` (`'USD' \| 'MXN'`) |
| `useBrandTheme` | `brand`, `brandBg`, `brandBorder` |
| `VerificationAccessContext` | `revealWalletAddresses`, `refreshVerificationAccess()` |
| `WalletDisclosureContext` | `notifyWalletScreenFocused()` |
| `WalletBalanceContext` | `loading`, `error`, `refetch()`, `pricesForCalculation`, `luxaeBalance`, `refreshLuxaeBalance()`, `luxaeHydrated` |

### 1.4 Servicios llamados (lectura)

| Servicio | Función | Fuente |
|----------|---------|--------|
| `storage` | `getWalletAddresses()` | AsyncStorage `wallet_addresses` |
| `storage` | `getWalletLedger()` | AsyncStorage `wallet_ledger` |
| `ethRpc` | `getEthBalance(address)` | RPC `https://eth.llamarpc.com` |
| `polygonRpc` | `getMaticBalance(address)` | RPC Polygon |
| `btcRpc` | `getBtcBalance(address)` | API blockchain.info o similar |
| `bchRpc` | `getBchBalance(address)` | API BCH |
| `xrpRpc` | `getXrpBalance(address)` | API XRP Ledger |
| `solanaRpc` | `getSolBalance(address)` | Solana RPC |

### 1.5 Servicios llamados (escritura)

| Servicio | Función | Efecto |
|----------|---------|--------|
| `storage` | `addWalletAddress(address, 'manual', undefined, chain)` | Añade dirección manualmente |

### 1.6 Tipos de datos clave

```ts
// WalletChain (storage.ts)
type WalletChain = 'ethereum' | 'bitcoin' | 'polygon' | 'bitcoin-cash' | 'ripple' | 'solana';

// WalletAddressItem (storage.ts)
interface WalletAddressItem {
  id: string;
  address: string;
  label?: string;
  source: 'metamask' | 'manual' | 'link4deal';
  isDefault: boolean;
  addedAt: number;
  chain?: WalletChain;
}

// WalletLedgerEntry (storage.ts)
interface WalletLedgerEntry {
  id: string;
  kind: 'income' | 'payment' | 'redemption' | 'loyalty';
  amountLuxae: number;   // positivo = ingreso; negativo = cargo; 0 = informativo
  titleEs: string;
  titleEn: string;
  details?: string;
  createdAt: number;     // timestamp ms
}
```

### 1.7 Modelo de monedas (`coins` array, computado)

```ts
[
  { id: 'luxae',        symbol: TOKEN_SYMBOL, balance: luxaeBalance,          priceUsd: LUXAE_PRICE_USD (1.0), canAddAddress: false },
  { id: 'ethereum',     symbol: 'ETH',        balance: metamaskEthBalance,    priceUsd: pricesForCalculation.ethereum?.usd,      chain: 'ethereum'     },
  { id: 'bitcoin',      symbol: 'BTC',        balance: btcBalance,            priceUsd: pricesForCalculation.bitcoin?.usd,       chain: 'bitcoin'      },
  { id: 'bitcoin-cash', symbol: 'BCH',        balance: bchBalance,            priceUsd: pricesForCalculation['bitcoin-cash']?.usd, chain: 'bitcoin-cash' },
  { id: 'ripple',       symbol: 'XRP',        balance: xrpBalance,            priceUsd: pricesForCalculation.ripple?.usd,        chain: 'ripple'       },
  { id: 'solana',       symbol: 'SOL',        balance: solBalance,            priceUsd: pricesForCalculation.solana?.usd,        chain: 'solana'       },
]
// MATIC (Polygon) se suma al total pero NO tiene tarjeta propia visible
```

### 1.8 Cálculo del total

```
walletTotalUsd = luxaeBalance × 1 USD
              + metamaskEthBalance × ethPriceUsd
              + polygonMaticBalance × maticPriceUsd
              + btcBalance × btcPriceUsd
              + bchBalance × bchPriceUsd
              + xrpBalance × xrpPriceUsd
              + solBalance × solPriceUsd

walletTotalDisplay = currency === 'MXN'
  ? walletTotalUsd × USD_TO_MXN   // constante ≈ 17
  : walletTotalUsd
```

### 1.9 Intercambios externos (swap URLs)

```ts
{ luxae: 'https://quickswap.exchange/#/swap',
  ethereum: 'https://app.uniswap.org/',
  bitcoin: 'https://simpleswap.io/',
  'bitcoin-cash': 'https://simpleswap.io/',
  ripple: 'https://simpleswap.io/',
  solana: 'https://jup.ag/swap' }
```
→ Se abren con `Linking.openURL()`.

### 1.10 Salidas de navegación

La pantalla **no navega** a ninguna ruta interna. Solo abre `Linking.openURL` para los intercambios (servicios externos) y el modal `AddressPayReceiveModal` (overlay in-screen).

---

## 2. DefiDealScreen — Glosario (`src/screens/DefiDealScreen.tsx`)

### 2.1 Descripción

Vista de solo lectura. No tiene estado local ni llamadas de red.

### 2.2 Fuentes de datos (entrada)

| Fuente | Tipo | Contenido |
|--------|------|-----------|
| `SettingsContext` | `language` | Idioma para seleccionar definición |
| `data/glossary` | `GlossaryEntry[]` (JSON estático) | Lista de términos DeFi, Nostr, LUXAE, crypto |
| `data/glossary` | `ecosystem`, `version` | Cadena de ecosystem y versión del glosario |

### 2.3 Tipos de datos

```ts
// src/data/glossary.ts
interface GlossaryEntry {
  term: string;
  category: string;
  definitionEs: string;
  definitionEn: string;
}

interface GlossaryData {
  ecosystem: string;
  version: string;
  glossary: GlossaryEntry[];
}

function getDefinition(entry: GlossaryEntry, language: 'es' | 'en'): string
// devuelve entry.definitionEs | entry.definitionEn
```

### 2.4 Salidas de navegación

Ninguna. Pantalla terminal.

### 2.5 Gaps conocidos

- Los `Pressable` de cada término no hacen nada al tocarse (sin detalle expandido / modal).
- No hay búsqueda ni filtro por categoría.

---

## 3. PromotionsMapScreen — Mapa de Promociones (`src/screens/PromotionsMapScreen.tsx`)

### 3.1 Parámetros de ruta (entrada)

| Param | Tipo | Origen | Efecto |
|-------|------|--------|--------|
| `focusPromotionId` | `string?` | `HomeScreen` cuando GPS falla / `PromotionsMap` desde Drawer | Ordena la lista poniendo esa promo al tope |

### 3.2 Estado local

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `promotions` | `Promotion[]` | Lista mezclada: API + tiendas mock |
| `loading` | `boolean` | Indicador de carga |
| `userLocation` | `{lat, lng} \| null` | Posición GPS actual del usuario |

### 3.3 Tipo `Promotion` (modelo interno)

```ts
interface Promotion {
  id: string;              // doc._id | 'store-{id}'
  name: string;            // productName | storeName
  nameEs: string;
  address: string;
  addressEs: string;
  latitude: number;
  longitude: number;
  offer: string;           // title | description | 'Coffee Shop · active'
  offerEs: string;
  cryptoAccepted: string[];  // fijo: [TOKEN_SYMBOL, 'ETH', 'USDT'] para API; [TOKEN_SYMBOL] para tiendas
  distanceKm: number | null; // null si no hay GPS o no hay coords
  gpsRequired: boolean;
  radiusMeters: number;
  source?: string;           // proveedor de datos (ej. 'BizneAI')
  whatsapp?: string;
}
```

### 3.4 Servicios llamados (lectura)

| Servicio | Función | Fuente |
|----------|---------|--------|
| `promotionsApi` | `getPromotions({ limit: 12, status: 'active' })` | `GET /api/promotions` |
| `data/nearbyStores` | `MOCK_NEARBY_STORES` | Datos estáticos (CDMX) |
| `expo-location` | `requestForegroundPermissionsAsync()` | Permiso GPS |
| `expo-location` | `getCurrentPositionAsync({ accuracy: Highest })` | Posición GPS |

### 3.5 Lógica de fusión y ordenamiento

```
apiPromos = getPromotions(12) → mapApiDocToPromotion(doc, userLocation)

localPromos = MOCK_NEARBY_STORES (active + coords) → mapStoreToPromotion(store, userLocation)
  └─ Filtra tiendas que ya existen en apiPromos (por coincidencia de nombre/dirección)

list = [...apiPromos, ...localPromos]
  └─ sort por distanceKm asc (null → Infinity)

if (focusPromotionId):
  └─ el promo con ese id va al índice 0
```

### 3.6 Cálculo de distancia

```ts
// utils/geo.ts
haversineMeters(user: {lat, lng}, store: {lat, lng}): number
distanceKm = haversineMeters(user, pt) / 1000
```

### 3.7 MapView region

```ts
mapRegion = bbox de (todas las promociones + userLocation)
  latitudeDelta  = max(0.05, maxLat - minLat + 0.02)
  longitudeDelta = max(0.05, maxLng - minLng + 0.02)
```

### 3.8 Salidas de navegación

| Destino | Condición | Parámetros |
|---------|-----------|------------|
| `Home` | Tap "Ver cupón" (GPS-required + dentro del radio) | `{ redeemPromotionId: promo.id, scrollToPromotions: true }` |
| `Linking.openURL (maps/gmaps)` | Tap "Llévame ahí" | Coordenadas de la promoción |

---

## 4. NYCScreen — Know Your Client (`src/screens/NYCScreen.tsx`)

### 4.1 Parámetros de ruta

Ninguno. La pantalla no recibe params.

### 4.2 Variables de entorno

| Variable | Valor | Efecto |
|----------|-------|--------|
| `EXPO_PUBLIC_KYC_WHATSAPP_REQUIRED` | `'true' \| undefined` | Si `true`, obliga verificación OTP via WhatsApp antes de biometría |

### 4.3 Estado local

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `verificationStatus` | `'idle' \| 'success' \| 'error'` | Estado de la verificación biométrica/KYC |
| `biometricError` | `string \| null` | Mensaje de error biométrico |
| `hasBiometric` | `boolean \| null` | Soporte de biometría en el dispositivo |
| `savedForm` | `Record<string, string> \| null` | Datos del formulario KYC ya guardados (prefill) |
| `pendingKycData` | `Record<string, string> \| null` | Datos del formulario esperando verificación WhatsApp |
| `whatsappCode` | `string` | Código OTP ingresado por el usuario |
| `whatsappVerificationId` | `string \| undefined` | ID de sesión de verificación WhatsApp |
| `whatsappVerifiedPhone` | `string \| null` | Teléfono confirmado por OTP en esta sesión |
| `whatsappLoading` | `boolean` | Estado de carga del OTP |
| `whatsappError` | `string \| null` | Error del flujo OTP |

### 4.4 Datos de contexto (entrada)

| Contexto | Valores usados |
|----------|----------------|
| `SettingsContext` | `language`, `setUserName(name)` |
| `VerificationAccessContext` | `refreshVerificationAccess()` |
| `WalletBalanceContext` | `grantWelcomeBonus()`, `grantThreeFieldsBonus()` |

### 4.5 Campos del formulario KYC

| Campo | Tipo | Obligatorio | Storage key |
|-------|------|-------------|-------------|
| `fullName` | `text` | ✓ | `kyc_form.fullName` |
| `idType` | `text` | — | `kyc_form.idType` |
| `idNumber` | `text` | — | `kyc_form.idNumber` |
| `dateOfBirth` | `date` | ✓ | `kyc_form.dateOfBirth` |
| `address` | `text` | — | `kyc_form.address` |
| `city` | `text` | — | `kyc_form.city` |
| `country` | `text` | — | `kyc_form.country` |
| `email` | `email` | — | `kyc_form.email` |
| `phone` | `text` | ✓ | `kyc_form.phone` |

Porcentaje mostrado en `HomeScreen` = (campos no vacíos / 9) × 100

### 4.6 Servicios llamados (lectura)

| Servicio | Función | Fuente |
|----------|---------|--------|
| `storage` | `getKycForm()` | AsyncStorage `kyc_form` |
| `deviceIdentity` | `getOrCreateDeviceId()` | AsyncStorage `device_id` |
| `expo-local-authentication` | `hasHardwareAsync()` | Sistema operativo |
| `expo-local-authentication` | `isEnrolledAsync()` | Sistema operativo |
| `expo-local-authentication` | `authenticateAsync({...})` | Face ID / Touch ID |

### 4.7 Servicios llamados (escritura)

| Servicio | Función | Efecto |
|----------|---------|--------|
| `storage` | `setKycForm(dataToSave)` | Guarda formulario + metadatos WhatsApp |
| `storage` | `setUserId(deviceId)` | Asocia deviceId como userId |
| `kycWhatsappApi` | `requestKycWhatsappCode(phone)` | `POST /api/kyc/whatsapp/request` |
| `kycWhatsappApi` | `verifyKycWhatsappCode({phone, code, verificationId})` | `POST /api/kyc/whatsapp/verify` |

### 4.8 Flujo completo de verificación

```
Usuario rellena formulario y toca "Enviar"
        │
        ▼
handleSubmitWithBiometric(data)
        │
        ├── [WHATSAPP_KYC_REQUIRED = true AND phone no verificado]
        │       │
        │       ▼
        │   requestWhatsappVerification(data)
        │       └─ POST /api/kyc/whatsapp/request → verificationId
        │       └─ Muestra panel OTP en pantalla
        │             │
        │             ▼
        │         handleVerifyWhatsappCode()
        │             └─ POST /api/kyc/whatsapp/verify → { ok, verified, verifiedAt }
        │             └─ Si ok → completeKycWithBiometric(data, { verified: true })
        │
        └── [WHATSAPP_KYC_REQUIRED = false OR phone ya verificado]
                │
                ▼
            completeKycWithBiometric(data, whatsappMeta)
                ├─ setUserName(data.fullName)
                ├─ setKycForm(data + whatsappMeta)
                ├─ setUserId(deviceId)
                ├─ if (3 campos obligatorios) → grantThreeFieldsBonus()
                ├─ [NO LocalAuthentication / web]
                │       └─ setVerificationStatus('success')
                │       └─ grantWelcomeBonus()
                │       └─ refreshVerificationAccess()
                │       └─ navigate('Home')
                └─ [Biometría disponible]
                        └─ authenticateAsync()
                        ├─ success → setVerificationStatus('success') → grantWelcomeBonus() → navigate('Home')
                        └─ fail → setBiometricError(msg) → setVerificationStatus('error')
```

### 4.9 Bonificaciones LUXAE

| Condición | Función | Descripción |
|-----------|---------|-------------|
| 3 campos obligatorios rellenos | `grantThreeFieldsBonus()` | Bonus parcial por datos mínimos |
| Verificación biométrica exitosa | `grantWelcomeBonus()` | 25 LUXAE (25 USD) bono de bienvenida |

### 4.10 Metadatos extras guardados en `kyc_form`

```ts
{
  // ... campos del formulario ...
  phoneWhatsappVerified: 'true' | 'false',
  phoneWhatsappVerificationStatus: 'verified' | 'pending' | 'not_required_until_provider_configured',
  phoneWhatsappVerifiedAt?: string,       // ISO si verificado
  phoneWhatsappVerificationId?: string,   // ID de sesión OTP
}
```

### 4.11 Salidas de navegación

| Destino | Condición |
|---------|-----------|
| `Home` | Verificación exitosa (biométrica o web) |

---

## 5. Mapa de dependencias compartidas entre las 4 pantallas

```
AsyncStorage (storage.ts)
  ├─ kyc_form              ← NYCScreen (R/W), HomeScreen (R % completado)
  ├─ wallet_addresses      ← WalletScreen (R/W)
  ├─ wallet_ledger         ← WalletScreen (R), HomeScreen (W al generar cupón)
  └─ device_id             ← NYCScreen (R/W)

RPC externos (solo WalletScreen)
  ├─ ETH  → https://eth.llamarpc.com
  ├─ MATIC → Polygon RPC
  ├─ BTC  → blockchain.info o similar
  ├─ BCH  → BCH API
  ├─ XRP  → XRP Ledger API
  └─ SOL  → Solana RPC

APIs propias
  ├─ GET  /api/promotions          ← PromotionsMapScreen
  ├─ POST /api/kyc/whatsapp/request ← NYCScreen (si WHATSAPP_KYC_REQUIRED)
  └─ POST /api/kyc/whatsapp/verify  ← NYCScreen (si WHATSAPP_KYC_REQUIRED)

Context compartido
  ├─ WalletBalanceContext  ← WalletScreen, NYCScreen (bonus LUXAE)
  ├─ VerificationAccessContext ← WalletScreen, NYCScreen
  └─ SettingsContext       ← Todas (idioma, moneda)
```

---

## 6. Gaps encontrados

| # | Pantalla | Observación |
|---|----------|-------------|
| W-01 | Billetera | Los RPCs de ETH, BTC, XRP, SOL son llamadas directas al nodo público sin caché ni retry — pueden fallar con flakiness de red |
| W-02 | Billetera | MATIC (Polygon) se suma al total pero **no tiene tarjeta propia** en la lista — el saldo existe pero no hay UI para verlo |
| W-03 | Billetera | No hay función de `send` / enviar: solo se pueden ver saldos y abrir swaps externos |
| D-01 | Defi.Deal | Los `Pressable` de cada término no despliegan detalle ni modal — son botones sin acción |
| D-02 | Defi.Deal | No hay búsqueda ni filtro por categoría en el glosario |
| M-01 | Mapa | `cryptoAccepted` de tiendas locales es `[TOKEN_SYMBOL]` hardcoded — no se lee del doc de la tienda |
| M-02 | Mapa | `MOCK_NEARBY_STORES` de CDMX aparece mezclado con promociones reales del API (ver GAP-04) |
| N-01 | NYC | `EXPO_PUBLIC_KYC_WHATSAPP_REQUIRED` requiere proveedor OTP real; aviso en pantalla indica que está pendiente |
| N-02 | NYC | En web (`Platform.OS === 'web'`) no hay `LocalAuthentication` — el flujo salta biometría pero el bonos de bienvenida sí se otorga |
| N-03 | NYC | Los datos KYC se guardan solo localmente — no se envían a ningún endpoint del backend (sin `POST /api/kyc`) |
