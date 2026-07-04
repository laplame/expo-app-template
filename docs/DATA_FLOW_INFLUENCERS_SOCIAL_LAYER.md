# Flujo de datos: Influencers y votar · Social Layer (NetworkP2P)

Mapa de variables, entradas, salidas y flujo inter-pantallas.
Incluye análisis de brechas UX y propuesta de mejoras "estilo red social".

---

## 1. InfluencersListScreen (`src/screens/InfluencersListScreen.tsx`)

### 1.1 Tipos de datos clave

```ts
// FeedItem — unión interna del feed mezclado
type FeedItem =
  | { kind: 'influencer'; inf: InfluencerDoc; key: string }
  | { kind: 'promotion'; doc: ApiPromotionDoc; key: string };

// InfluencerDoc (src/services/influencersApi.ts)
{
  _id?: string;
  id?: string;
  publicSlug?: string;        // /influencer/{publicSlug}
  username?: string;
  profileShortCode?: string;  // código corto de campaña (ej. DNF9YTP2)
  displayName?: string;
  name?: string;
  bio?: string;
  location?: string;
  categories?: string[];
  socialMedia?: InfluencerSocialMedia;
  profileImageUrl?: string;
  avatar?: string;
  totalFollowers?: number;
  followers?: InfluencerFollowers;  // { instagram?, tiktok?, youtube?, twitter? }
  recentPromotions?: InfluencerRecentPromotion[];
  couponStats?: InfluencerCouponStats;
  redeemedCoupons?: number;
  activePromotions?: number;
}

// InfluencerVoteTallies (src/services/storage.ts)
Record<influencerId, displayCount>  // entero local, merged con server baseline
```

### 1.2 Estado local

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `influencers` | `InfluencerDoc[]` | Lista completa cargada de la API (hasta 50) |
| `promotions` | `ApiPromotionDoc[]` | Promociones activas intercaladas en el feed (hasta 24) |
| `votedIds` | `Set<string>` | IDs de influencers votados por el usuario actual (AsyncStorage) |
| `voteTallies` | `InfluencerVoteTallies` | Mapa `{[id]: count}` — merged local + server baseline |
| `voteFeedback` | `string \| null` | Toast "voto guardado" / "voto quitado" (desaparece a 2800 ms) |
| `loading` | `boolean` | Carga inicial del feed |
| `refreshing` | `boolean` | Pull-to-refresh activo |
| `error` | `string \| null` | Error de carga de influencers |
| `win` | `{width, height}` | Dimensiones de ventana (escucha `Dimensions.change`) |

### 1.3 Datos de contexto (entrada)

| Contexto | Valores usados |
|----------|----------------|
| `SettingsContext` | `language` (para strings y `openInfluencerProfile`) |
| `useBrandTheme` | `brand` (color del hero y RefreshControl) |

### 1.4 Servicios llamados

| Servicio | Función | Origen |
|----------|---------|--------|
| `influencersApi` | `getAllInfluencers({ limit: 50 })` | `GET /api/influencers` |
| `promotionsApi` | `getPromotions({ limit: 24, status: 'active' })` | `GET /api/promotions` |
| `storage` | `getInfluencerVotes()` | AsyncStorage `influencer_votes` |
| `storage` | `getInfluencerVoteTallies()` | AsyncStorage `influencer_vote_tallies` |
| `storage` | `setInfluencerVote(id, bool, { serverBaseline })` | Escritura AsyncStorage |
| `storage` | `mergeInfluencerVoteTalliesFromServer([{id, serverCount}])` | Merge local+server |

### 1.5 Algoritmos internos

**`interleaveWithPromotions(influencers, promotions, every=3, {leadPromo})`**
- Inserta una promo al inicio si `leadPromo=true`
- Inserta 1 promo cada `every` influencers (round-robin sobre el array de promos)
- Output: `FeedItem[]` mezclado

**`splitIntoTwoColumns(items, columnWidth)`**
- Estima altura de cada item: influencer → `columnWidth/aspectRatio + 280`, promo → `imageH + 200`
- Greedy: asigna al lado con menor altura acumulada
- Output: `{ left: FeedItem[], right: FeedItem[] }`

**`aspectRatioForFeedKey(key)`**
- Hash determinista del key → uno de 8 ratios [0.68…1.06]
- Da aspecto orgánico sin aleatoriedad en re-renders

**Vote system**
```
local AsyncStorage (voted set)  +  server baseline (inf.wantPromotionCount | inf.voteCount)
                                          ↓
                            mergeInfluencerVoteTalliesFromServer()
                                          ↓
                            resolveInfluencerDisplayVoteCount(id, tallies, serverBaseline)
```
El display count es: `serverBaseline + localDelta`

### 1.6 Navegación de salida

| Destino | Trigger | Datos enviados |
|---------|---------|----------------|
| `Linking.openURL(damecodigo.com/influencer/:slug)` | Tap en tarjeta | URL externa al perfil web del influencer |
| `Linking.openURL(damecodigo.com/promotion/:id)` | Tap en tarjeta de promo | URL externa a la promoción |

> La pantalla **no navega** a ninguna pantalla interna del app.

### 1.7 Brechas de UX (gaps sociales)

| # | Brecha | Impacto |
|---|--------|---------|
| I-01 | No hay pantalla de perfil interna — siempre abre el navegador | Usuario sale del app en cada tap |
| I-02 | No hay filtro por categoría | No hay forma de explorar por nicho (fitness, tech, moda) |
| I-03 | No hay sección "Trending" / "Más votados" destacada | Baja motivación para votar — no hay recompensa social visible |
| I-04 | Vote feedback solo en hero (toast global) — la tarjeta no reacciona visualmente | El botón de voto parece roto en mobile |
| I-05 | No hay indicador de seguidores totales en la vista compacta | No se puede comparar influencers sin abrir el perfil |
| I-06 | No hay "historias" horizontales / destacados tipo Instagram | Pantalla parece lista estática, no red activa |
| I-07 | Sin ordenamiento configurable (por votos, por seguidores, reciente) | La posición en el feed no tiene significado para el usuario |

---

## 2. NetworkP2PScreen · Social Layer (`src/screens/NetworkP2PScreen.tsx`)

### 2.1 Tipos de datos clave

```ts
// NostrFeedItem (src/types/nostrFeed.ts)
{
  id: string;
  pubkey: string;
  createdAt: number;
  content: string;
  kind: number;           // 1 = nota, 0 = perfil
  imageUrls: string[];
  videoUrl?: string;
  videoPosterUrl?: string;
  repostOf?: { name: string };
  name: string;
  nip05?: string;
  avatarUrl?: string;
  likes: number;
  reposts: number;
  verified?: boolean;
  sourceEvent?: Event;    // nostr-tools Event, para NIP-25
}

// NostrLocalProfile (src/services/nostrSocialStorage.ts)
{
  displayName?: string;
  bio?: string;
  pictureUrl?: string;
  nip05?: string;
  website?: string;
}

// NostrFeedMode = 'latest' | 'following' | 'hashtag'

// WalletChain (src/services/storage.ts)
'eth' | 'btc' | 'bch' | 'xrp' | 'sol' | 'matic'
```

### 2.2 Estado local (30+ variables)

**Identidad Nostr**

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `npub` | `string \| null` | Clave pública en formato bech32 (npub1...) |
| `pubHex` | `string \| null` | Clave pública en hex |
| `localProfile` | `NostrLocalProfile \| null` | Perfil local (sin confirmación de relay) |
| `profileDraft` | `Partial<NostrLocalProfile>` | Borrador en edición del perfil |
| `nip05Verified` | `boolean` | Si el NIP-05 fue verificado |
| `linkedDisplayName` | `string \| null` | Nombre vinculado del KYC |

**Feed**

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `items` | `NostrFeedItem[]` | Posts del feed activo |
| `loading` | `boolean` | Carga inicial |
| `feedMode` | `NostrFeedMode` | `'latest' \| 'following' \| 'hashtag'` |
| `following` | `string[]` | pubkeys en hexadecimal seguidos |
| `hashtagState` | `{tag: string, active: boolean}` | Hashtag activo para filtro |
| `relayHint` | `string` | URL del relay activo |

**Compose**

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `composeOpen` | `boolean` | Panel de redacción abierto |
| `composeText` | `string` | Texto del post en edición |
| `composeMedia` | `ComposeMediaAttachment[]` | Adjuntos (max 4 imgs + 1 video) |
| `posting` | `boolean` | Publicación en progreso |

**UI Panels**

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `filterOpen` | `boolean` | Panel selector de modo de feed |
| `searchOpen` | `boolean` | Barra de búsqueda abierta |
| `profileOpen` | `boolean` | Panel de perfil Nostr |
| `valueOpen` | `boolean` | Panel wallet ⚡ |
| `myQrOpen` | `boolean` | Modal de QR de npub propio |
| `scanFriendOpen` | `boolean` | Modal de escanear QR de amigo |
| `imageLightboxUri` | `string \| null` | URI para lightbox de imagen |
| `bottomPanelOpen` | `boolean` | Panel inferior expandido |
| `configPanelOpen` | `boolean` | Panel de configuración Nostr |
| `emailDexPanelOpen` | `boolean` | Panel de nostrmail/emailDex |
| `nostrActionsExpanded` | `boolean` | Barra de acciones expandida |
| `reactingId` | `string \| null` | ID del post con like en progreso |
| `followInput` | `string` | Input "seguir por npub/hex" |
| `walletRows` | `WalletChain[]` | Cadenas de wallet con dirección |
| `nostrSocialPrefsReady` | `boolean` | Prefs de nostr cargadas |

### 2.3 Datos de contexto (entrada)

| Contexto | Valores usados |
|----------|----------------|
| `SettingsContext` | `language` |
| `useVerificationAccess` | `revealWalletAddresses` |
| `getSocialLayerColors(theme)` | Paleta de colores del tema social |
| `getAppTheme()` | Tema base de la app |

### 2.4 Servicios llamados (lectura)

| Servicio | Función | Origen |
|----------|---------|--------|
| `nostrIdentity` | `getOrCreateNostrSecretKey()` | AsyncStorage `nostr_sk` |
| `nostrIdentity` | `npubFromSecret(sk)` | Derivación local |
| `nostrSocialStorage` | `getNostrLocalProfile()` | AsyncStorage `nostr_profile` |
| `nostrSocialStorage` | `getNostrFeedMode()` | AsyncStorage `nostr_feed_mode` |
| `nostrSocialStorage` | `getNostrFollowing()` | AsyncStorage `nostr_following` |
| `nostrSocialStorage` | `getNostrHashtag()` | AsyncStorage `nostr_hashtag` |
| `nostrFeedCache` | `getNostrFeedCache(key)` | AsyncStorage `nostr_feed_{mode}` |
| `nostrFeedSession` | `getNostrFeedSession(key)` | AsyncStorage `nostr_session_{key}` |
| `nostrFeedService` | `fetchNostrFeed({pool, pubHex, mode, ...})` | Nostr relays (WebSocket) |
| `nostrFeedService` | `filterDisplayableNostrFeedItems(items)` | Filtro local de contenido |
| `nostrFeedService` | `filterSeedByHashtag(seed, tag)` | Filtro local por hashtag |
| `nostrFeedService` | `mergeFeedWithSeed(live, seed)` | Merge feed relays + seed local |
| `storage` | `getWalletAddresses()` | AsyncStorage `wallet_addresses` |
| `nostrShareCode` | `encodeNprofileQrPayload(pubHex)` | Cálculo local |
| `nip05.queryProfile(nip05Addr)` | nostr-tools | HTTP lookup NIP-05 |

### 2.5 Servicios llamados (escritura)

| Servicio | Función | Efecto |
|----------|---------|--------|
| `nostrSocialStorage` | `setNostrLocalProfile(draft)` | Actualiza perfil local |
| `nostrSocialStorage` | `setNostrFeedMode(mode)` | Persiste modo de feed |
| `nostrSocialStorage` | `setNostrHashtag(tag)` | Persiste hashtag activo |
| `nostrSocialStorage` | `addNostrFollowing(pubkey)` | Agrega seguido |
| `nostrSocialStorage` | `removeNostrFollowing(pubkey)` | Quita seguido |
| `nostrFeedCache` | `setNostrFeedCache(key, items)` | Cachea posts por modo |
| `nostrFeedSession` | `setNostrFeedSession(key, {offset, ts})` | Guarda scroll position |
| `cloudinary` | `uploadMediaToCloudinary(uri, mimeType)` | CDN de imágenes/video |
| `pool.publish(relays, event)` | SimplePool nostr-tools | Publica evento kind:1 (nota) |
| `pool.publish(relays, event)` | SimplePool nostr-tools | Publica evento kind:0 (perfil) |
| `nip25.makeReaction(event, '+')` + `pool.publish` | NIP-25 | Like a un post |

### 2.6 Flujo de publicación (compose)

```
composeText + composeMedia
        │
        ▼ (si hay media)
uploadMediaToCloudinary(uri) × N  →  urls[]
        │
        ▼
buildNostrNoteFromMedia(text, urls)  →  content string
        │
        ▼
finalizeEvent({ kind:1, content, tags:[] }, sk)
        │
        ▼
pool.publish(DEFAULT_NOSTR_RELAYS, event)
        │
        ▼
items = [newItem, ...items]  (optimistic update)
```

### 2.7 Navegación de salida

| Destino | Trigger |
|---------|---------|
| `openDrawer()` | ☰ en header |
| `Linking.openURL(nostrApp o relay)` | Tap en link externo |
| Ninguna pantalla interna | — |

### 2.8 Brechas de UX (gaps sociales)

| # | Brecha | Impacto |
|---|--------|---------|
| N-01 | No hay hilo de respuestas (reply thread) — solo like y repost | Falta la conversación, fundamento de redes sociales |
| N-02 | Botón de redactar oculto en barra inferior — no visible en primera visión | Tasa de publicación muy baja |
| N-03 | No hay notificaciones de menciones, likes, nuevos seguidores | Sin ciclo de engagement |
| N-04 | No hay trending hashtags visible — hay que abrir el panel y escribir manualmente | Descubrimiento de contenido limitado |
| N-05 | Perfil de autores en el feed no es navegable — no se puede tocar el avatar para ver su perfil | Sin grafo social explorable |
| N-06 | Feed modo "latest" muestra seed local antes de cargar relays → confusión entre real/demo | Primera impresión poco clara |
| N-07 | Sin autocompletar @mención en compose | Roza la app de notas, no la red social |
| N-08 | La barra inferior con 6 iconos no es autodescriptible — hay que explorar | UX onboarding difícil |

---

## 3. Propuesta de mejoras — Implementación por fases

### Fase 1 — Mejoras frontales (sin cambios de API) — IMPLEMENTAR AHORA

#### InfluencersListScreen

| Mejora | Descripción | Esfuerzo |
|--------|-------------|----------|
| **Trending strip** | Fila horizontal con top-3 influencers por voto, avatar grande + nombre + contador. Usa datos ya cargados. | 2 h |
| **Category filter chips** | Fila de chips scrollable horizontal. Extrae `categories[]` de los influencers. Filtra la vista masonry en local. | 2 h |
| **Vote feedback en tarjeta** | Al votar, el contador en la tarjeta hace transición numérica (+1 / -1). Toast global se mantiene. | 1 h |

#### NetworkP2PScreen

| Mejora | Descripción | Esfuerzo |
|--------|-------------|----------|
| **FAB de redactar** | Botón circular flotante "+" visible siempre sobre el feed. Al tocar → `composeOpen = true`. | 1 h |
| **Trending hashtags** | Row horizontal de hashtags frecuentes extraídos de los `items` actuales. Tap → activa filtro por hashtag. | 2 h |
| **Toque en autor del post** | Tap en avatar/nombre del post → abre panel lateral con nombre, bio, npub y botón "Seguir". | 3 h |

### Fase 2 — Mejoras con cambios menores de backend

| Mejora | Pantalla | Descripción |
|--------|----------|-------------|
| **Pantalla de perfil de influencer** | InfluencersList | Stack screen interna con foto, bio, categorías, redes sociales, cupones activos, botón de voto |
| **Ordenamiento del feed** | InfluencersList | Selector: "Más votados / Más seguidores / Recientes" — requiere campo `createdAt` en `InfluencerDoc` |
| **Historias (Stories row)** | InfluencersList | Scrollview horizontal con avatar circular + nombre. Tap abre el perfil. Sin backend nuevo si solo usa los ya cargados. |
| **Hilo de respuestas** | NetworkP2P | Fetch de kind:1 con `e` tag del evento padre. Muestra replies anidados bajo un post. Requiere pool.list con filter. |
| **Notificaciones** | NetworkP2P | Subscription kind:1 donde `p` tag = nuestro pubHex. Badge en ícono. Lista de menciones y likes. |

### Fase 3 — Mejoras profundas (mayor esfuerzo)

| Mejora | Pantalla | Descripción |
|--------|----------|-------------|
| **Mensajes directos (DM)** | NetworkP2P | NIP-04 o NIP-44 encrypted DM. Ya existe emailDex como workaround. |
| **Perfil de usuario Nostr navegable** | NetworkP2P | Pantalla ProfileDetail: posts propios, seguidores, seguidos, avatares. |
| **Autocomplete de @menciones** | NetworkP2P | Lookup local en `following[]` al escribir `@` en compose. |
| **Registro de influencer en-app** | InfluencersList | Botón "Soy influencer" → formulario `CreateInfluencerPayload` → `POST /api/influencers`. Hoy solo existe en la web. |

---

## 4. Mapa de dependencias compartidas

```
AsyncStorage
  ├─ nostr_sk                     ← NetworkP2P (identidad permanente)
  ├─ nostr_profile                ← NetworkP2P (perfil local)
  ├─ nostr_feed_mode              ← NetworkP2P (modo de feed)
  ├─ nostr_following              ← NetworkP2P (lista de seguidos)
  ├─ nostr_hashtag                ← NetworkP2P (hashtag activo)
  ├─ nostr_feed_{mode}            ← NetworkP2P (caché de feed)
  ├─ nostr_session_{key}          ← NetworkP2P (scroll position)
  ├─ influencer_votes             ← InfluencersList (IDs votados)
  └─ influencer_vote_tallies      ← InfluencersList (contadores)

API
  ├─ GET /api/influencers         ← InfluencersList
  ├─ GET /api/promotions          ← InfluencersList (interleaved)
  └─ Nostr relays (WebSocket)     ← NetworkP2P

Dependencias externas
  ├─ nostr-tools (SimplePool, finalizeEvent, nip05, nip25)  ← NetworkP2P
  ├─ Cloudinary (uploadMediaToCloudinary)                    ← NetworkP2P
  └─ react-native-qrcode-svg (QRCode)                        ← NetworkP2P
```
