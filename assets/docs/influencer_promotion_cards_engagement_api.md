# API de engagement para tarjetas (Influencers y Promociones)

Especificación para implementar en el **backend** la recuperación y persistencia de: **votos “quiero su promoción”**, **me gusta (corazón)**, **recuentos de likes / comentarios / compartidos**, y **listado de comentarios**. La app móvil ya tiene UI en `InfluencerCard`, `PromotionCard` y `CardSocialActions`; hoy gran parte es **local** o **placeholder**.

**Código de referencia**

| Pieza | Archivo |
|--------|---------|
| Tarjeta influencer | `src/components/InfluencerCard.tsx` |
| Tarjeta promoción | `src/components/PromotionCard.tsx` |
| Barra ❤️ · 💬 · ↗ | `src/components/CardSocialActions.tsx` |
| Feed “Influencers y votar” | `src/screens/InfluencersListScreen.tsx` |
| Votos solo en dispositivo | `getInfluencerVotes` / `setInfluencerVote` en `src/services/storage.ts` |
| Identidad anónima estable | `getOrCreateDeviceId()` en `src/services/deviceIdentity.ts` |
| Tipos promoción API | `ApiPromotionDoc` en `src/services/promotionsApi.ts` |
| Tipos influencer API | `InfluencerDoc` en `src/services/influencersApi.ts` |

**Convención de base URL:** igual que el resto de la API (`EXPO_PUBLIC_API_URL`, p. ej. `https://www.damecodigo.com/api`). Los ejemplos usan prefijo `/api`.

---

## 1. Dos conceptos distintos en influencer

En el feed masonry, conviene no mezclar:

| Concepto | UI actual | Significado sugerido |
|----------|-----------|----------------------|
| **Voto “quiero promoción”** | Botón verde bajo la tarjeta + borde + texto “N personas…” | Voto de intención: “quiero ver promociones de este creador”. Campo agregado sugerido: `wantPromotionCount`. |
| **Me gusta (corazón)** | `CardSocialActions` · `Ionicons heart` | Like estilo red social sobre la tarjeta / contenido. Contador: `likeCount`. |

El backend puede exponer ambos con endpoints o flags distintos para evitar confusiones en analítica.

---

## 2. Modelo de datos sugerido (respuestas)

### 2.1 Influencer — bloque `engagement` (opcional en `GET /api/influencers` o subrecurso)

```json
{
  "wantPromotionCount": 128,
  "likeCount": 45,
  "commentCount": 12,
  "shareCount": 30,
  "likedByViewer": false,
  "wantPromotionByViewer": false
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `wantPromotionCount` | number | Total de usuarios que votaron “quiero su promoción”. |
| `likeCount` | number | Total de likes (corazón). |
| `commentCount` | number | Total de comentarios publicados (no borrados). |
| `shareCount` | number | Eventos de compartir registrados (ver §6). |
| `likedByViewer` | boolean | Si el viewer actual ya dio like (según `deviceId` o `userId`). |
| `wantPromotionByViewer` | boolean | Si el viewer ya votó “quiero promoción”. |

**IDs:** usar `influencer._id` o `influencer.id` como en el resto del API.

### 2.2 Promoción — mismo patrón

Anidar en `GET /api/promotions` / `GET /api/promotions/:id` o devolver en paralelo:

```json
{
  "likeCount": 200,
  "commentCount": 34,
  "shareCount": 12,
  "likedByViewer": true
}
```

(No suele aplicarse `wantPromotionCount` a una promo; es propio del influencer.)

### 2.3 Comentario

```json
{
  "_id": "67e…",
  "body": "¡Gran oferta!",
  "createdAt": "2026-03-28T12:00:00.000Z",
  "authorDisplayName": "María",
  "authorUserId": "optional-mongo-id",
  "deviceId": "optional-anonymous",
  "influencerId": "optional-if-scope-influencer",
  "promotionId": "optional-if-scope-promotion"
}
```

Moderación: campos opcionales `hidden`, `reported` para el backend.

---

## 3. Endpoints sugeridos — Influencers

### 3.1 Obtener engagement (uno o varios)

**Opción A — enriquecer listado existente**  
Incluir `engagement: { ... }` en cada documento de `GET /api/influencers` (y en búsqueda con `?q=`).

**Opción B — batch**  
`GET /api/influencers/engagement?ids=id1,id2,id3`  
Headers opcionales: `X-Device-Id` o `Authorization: Bearer` para rellenar `*ByViewer`.

**Respuesta batch ejemplo:**

```json
{
  "success": true,
  "data": {
    "id1": { "wantPromotionCount": 10, "likeCount": 3, "commentCount": 2, "shareCount": 1, "likedByViewer": false, "wantPromotionByViewer": true },
    "id2": { "..." }
  }
}
```

### 3.2 Toggle voto “quiero promoción”

`POST /api/influencers/:influencerId/want-promotion`

Body:

```json
{
  "deviceId": "dev_abc…",
  "active": true
}
```

- `active: true` → registrar voto; `false` → revocar (si la política lo permite).  
- Respuesta: `{ "success": true, "data": { "wantPromotionCount": 129, "wantPromotionByViewer": true } }`

**Migración app:** sustituir o complementar `setInfluencerVote` local con esta llamada; opcionalmente mantener caché local offline.

### 3.3 Toggle like (corazón)

`POST /api/influencers/:influencerId/likes`

```json
{ "deviceId": "dev_abc…", "active": true }
```

Respuesta: `{ "success": true, "data": { "likeCount": 46, "likedByViewer": true } }`

### 3.4 Listar comentarios

`GET /api/influencers/:influencerId/comments?page=1&limit=20`

Respuesta:

```json
{
  "success": true,
  "data": {
    "docs": [ { "_id": "…", "body": "…", "createdAt": "…", "authorDisplayName": "…" } ],
    "totalDocs": 12,
    "page": 1,
    "totalPages": 1
  }
}
```

### 3.5 Crear comentario

`POST /api/influencers/:influencerId/comments`

```json
{
  "deviceId": "dev_abc…",
  "body": "Texto del comentario",
  "authorDisplayName": "Opcional; si hay JWT usar perfil"
}
```

Validación: longitud máxima, rate limit, anti-spam.

---

## 4. Endpoints sugeridos — Promociones

Misma filosofía, prefijado por promoción:

| Método | Ruta | Uso |
|--------|------|-----|
| POST | `/api/promotions/:promotionId/likes` | Toggle like |
| GET | `/api/promotions/:promotionId/comments` | Lista paginada |
| POST | `/api/promotions/:promotionId/comments` | Crear comentario |
| POST | `/api/promotions/:promotionId/share-events` | Registrar share (§6) |

Opcional: `GET /api/promotions/:id` devuelve ya `engagement` embebido.

---

## 5. Compartidos (shares)

Hoy la app usa `Share.share` nativo**sin** llamar al servidor. Para **recuperar el número**:

1. **Evento explícito:** tras compartir con éxito, la app puede llamar:
   - `POST /api/influencers/:id/share-events` o `POST /api/promotions/:id/share-events`  
   Body: `{ "deviceId": "…", "platform": "native_share" }` (opcional deduplicación por día/dispositivo).
2. El backend incrementa `shareCount` (o agrega fila en tabla de eventos y agrega en lectura).

Sin este POST, el contador solo puede ser estimación server-side (no recomendado en móvil).

---

## 6. Identidad del viewer

| Método | Cuándo |
|--------|--------|
| `deviceId` | Usuario sin login; generar con `getOrCreateDeviceId()` y enviar en body/headers. |
| `userId` JWT | Usuario registrado; preferir para unificar votos/likes entre dispositivos. |

Reglas sugeridas: un **like** o **want-promotion** por `(recurso, usuarioId)` o `(recurso, deviceId)` según producto.

---

## 7. Integración en componentes (siguiente paso en app)

### `CardSocialActions` (extensión prevista)

Propuestas de props adicionales:

- `likeCount`, `commentCount`, `shareCount` (números mostrados junto a iconos o debajo).
- `liked`, `onLikePress` → llamar `POST .../likes` y actualizar estado.
- `comments`, `onOpenComments` → modal/lista alimentada con `GET .../comments`.
- `onShareComplete` → tras `Share.share` resolver, llamar `POST .../share-events`.

Hoy: `onComments` muestra `Alert` “disponible pronto” (`getCardSocialStrings`).

### `InfluencerCard`

- Ya acepta `voteCount` / lee `wantPromotionCount` del doc vía pantalla padre.
- Con API: mapear `engagement.wantPromotionCount` y `engagement.likeCount`, etc.

### `PromotionCard`

- Pasar a `CardSocialActions` contadores y callbacks ligados a `/api/promotions/:id/...`.

### `InfluencersListScreen`

- `toggleVote` → `POST .../want-promotion` + refresco del contador.
- Tras `getAllInfluencers`, opcional: `GET .../engagement?ids=...` si el listado no trae `engagement` embebido.

---

## 8. Errores y códigos HTTP

| Código | Uso |
|--------|-----|
| 400 | Body inválido, comentario vacío, etc. |
| 401 | Acción que exige JWT |
| 404 | Influencer o promoción inexistente |
| 409 | Conflicto de negocio (ej. doble voto si no permitido) |
| 429 | Rate limit |

Formato sugerido: `{ "success": false, "message": "…" }` alineado con otros endpoints del proyecto.

---

## 9. Resumen para el equipo de API

1. Añadir **agregados** `wantPromotionCount`, `likeCount`, `commentCount`, `shareCount` y flags **ByViewer** donde aplique.  
2. Exponer **POST toggle** para want-promotion y likes.  
3. Exponer **GET/POST comentarios** por influencer y por promoción.  
4. Exponer **POST share-events** (o equivalente) si se quiere métrica real de shares.  
5. La app enviará **`deviceId`** (y opcionalmente JWT) para idempotencia y personalización.

Documento pensado para implementar backend y, en una segunda fase, **`engagementApi.ts`** en la app que consuma estas rutas.
