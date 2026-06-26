# App influencer: autenticación JWT

Guía para la **app móvil** sobre cómo obtener, guardar y renovar el token que habilita el panel influencer y los endpoints `/api/influencers/app/*`.

Relacionado:

- [APP_INFLUENCER_IDENTITY_AND_STORY_CARDS.md](./APP_INFLUENCER_IDENTITY_AND_STORY_CARDS.md) — verify-session, campañas, story cards
- [INFLUENCER_TOKEN_SETTLEMENT_MONGO.md](./INFLUENCER_TOKEN_SETTLEMENT_MONGO.md) — abonos por canje

---

## Base URL

```text
{EXPO_PUBLIC_API_URL}  →  default https://www.damecodigo.com/api
```

Auth: `{API_BASE}/auth/*`  
Influencer app: `{API_BASE}/influencers/app/*`

---

## Flujo recomendado en app

1. Usuario inicia sesión en **DameCodigo.com** (web) o, cuando exista UI in-app, vía `POST /api/auth/login`.
2. La app guarda `accessToken` y opcionalmente `refreshToken` en almacenamiento seguro.
3. Al abrir **Monetización → Mi panel**, el hook `useInfluencerAppSession` llama en paralelo:
   - `GET /api/influencers/me`
   - `POST /api/influencers/app/verify-session` (con `walletAddress`, `deviceId`, `preferredNetwork`)
   - `GET /api/influencers/app/campaigns`
4. Si `dashboardAccess === true`, se muestran campañas, story cards y abonos.

---

## Endpoints de auth

| Método | Ruta | Uso |
|--------|------|-----|
| `POST` | `/api/auth/login` | Email/login + password → JWT |
| `POST` | `/api/auth/register` | Alta (p. ej. `primaryRole: influencer`) |
| `POST` | `/api/auth/refresh` | Renovar access token |
| `GET` | `/api/auth/me` | Validar sesión |
| `POST` | `/api/auth/logout` | Invalidar refresh (opcional) |

### Login (ejemplo)

```http
POST /api/auth/login
Content-Type: application/json

{
  "login": "creador@ejemplo.com",
  "password": "********"
}
```

Respuesta típica:

```json
{
  "ok": true,
  "token": "<access_jwt>",
  "refreshToken": "<refresh>",
  "user": { "id": "...", "email": "..." }
}
```

### Headers en rutas protegidas

```http
Authorization: Bearer <access_jwt>
Accept: application/json
```

Implementación cliente: `src/services/authApi.ts` (`authHeaders`, `authLogin`, `authRefresh`).

---

## Almacenamiento en la app

| Clave AsyncStorage / SecureStore | Contenido |
|----------------------------------|-----------|
| `@link4deal/auth_access_token` | JWT access |
| `@link4deal/auth_refresh_token` | Refresh token |
| `@link4deal/influencer_session_cache` | Caché del panel (slug, abonos, verificación) |
| `@link4deal/influencer_qr_issue_history` | Historial local de cupones QR emitidos |

Helpers: `getAuthAccessToken`, `setAuthTokens`, `getInfluencerSessionCache` en `src/services/storage.ts`.

---

## Renovación del token

Cuando una petición devuelve **401**:

1. Leer `refreshToken` guardado.
2. `POST /api/auth/refresh` con `{ "refreshToken": "..." }`.
3. Guardar el nuevo `token` (y refresh si cambia).
4. Reintentar la petición original.

Si el refresh falla, limpiar tokens y mostrar estado **needsAuth** en el panel (enlace al portal web).

---

## Vinculación influencer ↔ usuario

El JWT identifica al **usuario** (`User`). El panel influencer requiere que ese usuario tenga un documento en `influencers` con `userId` vinculado.

| Respuesta | Significado en app |
|-----------|-------------------|
| `code: INFLUENCER_NOT_LINKED` | Usuario logueado pero sin perfil influencer |
| `identityVerificationStatus: pending` | Perfil existe; super admin aún no aprueba |
| `dashboardAccess: true` | Campañas, story cards y settlements habilitados |

---

## Estado actual de la UI (app)

- **Login in-app** completo: pendiente de pantalla dedicada; hoy el panel dirige a DameCodigo.com si no hay token.
- **Panel**: `InfluencerIdentityScreen` + hook `useInfluencerAppSession`.
- **Token en uso**: el mismo JWT que la web CRM / portal influencer.

---

## Código fuente (app)

| Pieza | Archivo |
|-------|---------|
| Auth API | `src/services/authApi.ts` |
| Influencer app API | `src/services/influencerAppApi.ts` |
| Sesión panel | `src/hooks/useInfluencerAppSession.ts` |
| Pantalla panel | `src/screens/InfluencerIdentityScreen.tsx` |

---

## Prueba rápida (curl)

```bash
TOKEN=$(curl -sS -X POST "https://www.damecodigo.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"login":"creador@ejemplo.com","password":"***"}' | jq -r '.token')

curl -sS -X POST "https://www.damecodigo.com/api/influencers/app/verify-session" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-app-1"}' | jq .
```
