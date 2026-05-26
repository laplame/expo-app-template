# App: identidad influencer, sesión y story cards

Base: `{API_ORIGIN}/api` (en la app: `EXPO_PUBLIC_API_URL`, ej. `https://www.damecodigo.com/api`).

Perfil público web: `{SITE_ORIGIN}/influencer/{publicSlug}` (campo `publicSlug` del API; no confundir con `profileShortCode`, que es código de cupón)  
Ejemplo local: `http://localhost:5173/influencer/luccylamademoiselita`  
Producción: `https://www.damecodigo.com/influencer/luccylamademoiselita`

En la app móvil: `src/utils/influencerProfileUrl.ts` construye la URL con `EXPO_PUBLIC_SITE_URL` o derivando del API base.

---

## 1. Autenticación

| Método | Endpoint | Uso |
|--------|----------|-----|
| POST | `/api/auth/login` | Login (email o teléfono + contraseña) |
| POST | `/api/auth/register` | Alta (`primaryRole: "influencer"`) |
| POST | `/api/auth/refresh` | Renovar access token |
| GET | `/api/auth/me` | Usuario de sesión (JWT) |
| POST | `/api/auth/logout` | Invalidar refresh |

Cliente: `src/services/authApi.ts`  
Tokens en disco: `getAuthAccessToken` / `setAuthTokens` en `src/services/storage.ts`.

---

## 2. API app influencer

Prefijo: `/api/influencers/app/*`  
Cliente: `src/services/influencerAppApi.ts`

| Método | Endpoint | Uso |
|--------|----------|-----|
| POST | `/api/influencers/app/verify-session` | Tras login: identidad, wallet, campañas, `influencerProfileShortCode` |
| PATCH | `/api/influencers/app/wallet` | Actualizar wallet |
| GET | `/api/influencers/app/campaigns` | Refresco de campañas |
| POST | `/api/influencers/app/story-cards` | Story 9:16 (código corto + % descuento) |

Flujo recomendado:

1. `POST /api/auth/login` → `token`
2. `POST /api/influencers/app/verify-session` con `Authorization: Bearer {token}` y body `{ walletAddress, preferredNetwork, deviceId }`

Errores `verify-session`:

| HTTP | code | Significado |
|------|------|-------------|
| 401 | — | Sin token o inválido |
| 404 | `INFLUENCER_NOT_LINKED` | No hay `influencers.userId` para el usuario |
| 400 | `INVALID_WALLET` | Wallet inválida |

---

## 3. Monetización (app)

- Menú: **Monetización** / **Monetization** → `MonetizationScreen`
- Pestaña **Mi panel**: `InfluencerIdentityScreen` (promos, deals, redenciones)
- Pestaña **Registrar creador**: `InfluencerSearchScreen` (alta de influencers)
- Portal web: `{SITE_ORIGIN}/influencer/me`

## 4. Alta desde la app (Influencers y votar)

- Crear: `POST /api/influencers` (`src/services/influencersApi.ts`)
- Tras éxito, la app abre `https://www.damecodigo.com/influencer/{publicSlug}` (`openInfluencerProfile`).
- Prioridad del slug: `publicSlug` → `username` → redes → `displayName` sin espacios. **No** usar `profileShortCode` (ej. `DNF9YTP2`) en la URL.

Pantallas: `InfluencersListScreen`, `InfluencerSearchScreen`, `InfluencerCard`.

---

## 5. Códigos cortos (complemento)

Ver `docs/APP_SHORT_PROMO_CODES.md` en el backend. Cliente relacionado: `src/services/discountQrApi.ts`.

---

## 6. Modelos MongoDB (backend)

`User` ← `influencers.userId` ← `InfluencerPromoShortCode` → `Promotion`

Sin `influencers.userId` enlazado al usuario del JWT, `verify-session` responde `INFLUENCER_NOT_LINKED`.
