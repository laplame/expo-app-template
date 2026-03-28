# Registro de influencer – Ruta `/influencer-setup`

Guía para entender el flujo en web y replicarlo en la app móvil.

| | |
|--|--|
| **Ruta SPA** | `/influencer-setup` |
| **Componente** | `src/pages/InfluencerSetup.tsx` |
| **Título en layout** | “Registrar influencer” (`MainLayout`) |
| **API de creación** | `POST /api/influencers` |
| **API foto de perfil** | `POST /api/influencers/avatar` (opcional, antes del create) |

---

## 1. Resumen del flujo

1. El usuario entra por el menú (“Registrar influencer”), desde `/user-type-selector` o enlaces similares.
2. **Opcional:** sube una **captura de pantalla** de su perfil social y pulsa **“Analizar con IA”** → se llama a `POST /api/analyze-profile-image` y se rellenan campos (nombre, bio, ubicación, categorías, redes).
3. **Opcional:** en el paso 1 puede elegir **foto de perfil**; al enviar el formulario, el front primero llama a **`POST /api/influencers/avatar`** (Multer en memoria) y recibe `avatarUrl`; luego **`POST /api/influencers`** incluye `avatar` en el JSON.
4. Completa **3 pasos** del formulario.
5. Pulsa **“Crear perfil de Influencer”** → si hay foto, upload de avatar + `POST /api/influencers` con JSON.
6. Si la respuesta es correcta, redirige a **`/influencers`**.

**Sesión:** si hay `auth_token` en `localStorage`, se envía `Authorization: Bearer <token>` y el backend puede **vincular** el influencer al usuario (`userId`).

---

## 2. Foto de perfil: Multer en memoria, Cloudinary o disco

### Respuesta corta

| Pregunta | En el flujo actual `/influencer-setup` |
|----------|----------------------------------------|
| **¿Cómo se sube la foto de perfil?** | **`POST /api/influencers/avatar`** con `multipart/form-data`, campo **`avatar`**. **Multer** usa **`memoryStorage()`** (`memoryUpload.single('avatar')` en `server/routes/influencers.js`): el archivo llega como **`req.file.buffer`** en RAM. |
| **¿Se usa Cloudinary?** | **Sí, si está configurado** (`CLOUDINARY_*` en `.env`). Se sube a la carpeta **`link4deal/influencers`**. La URL (`secure_url`) se devuelve en la respuesta. |
| **Si Cloudinary no está disponible** | Se escribe el buffer en **`server/uploads/influencers/`** y la URL pública es **`/uploads/influencers/<filename>`** (mismo patrón que otras subidas locales). |
| **`POST /api/influencers`** | Sigue siendo **solo JSON**. El cliente primero sube el avatar (si hay), obtiene `avatarUrl`, y en el **create** envía **`avatar: "<url>"`**. |
| **Captura para IA** (`analyze-profile-image`) | Sigue en **memoria**, sin persistir; es independiente de la foto de perfil. |
| **Portfolio paso 3** | Sigue **sin** enviarse al backend (sin cambio). |

### Detalle técnico (referencias)

- **Avatar:** `server/routes/influencers.js` → `POST /avatar` → `influencerController.uploadAvatar` → `cloudinaryConfig.uploadImage(..., { folder: 'link4deal/influencers' })` o disco via `getInfluencerUploadDir()` (`server/middleware/upload.js`).
- **Análisis IA:** `server/routes/analyzeProfile.js` → `memoryUpload.single('image')` → Gemini (sin guardar archivo).
- **Crear influencer:** `POST /` → `influencerController.create` lee `body.avatar` y lo guarda en MongoDB.

---

## 3. Subida de avatar (antes del alta)

| Método | URL | Body |
|--------|-----|------|
| POST | `/api/influencers/avatar` | `multipart/form-data`: campo **`avatar`** (archivo imagen). Opcional: `Authorization: Bearer <JWT>` |

Respuesta **200** típica:

```json
{ "success": true, "data": { "avatarUrl": "https://res.cloudinary.com/.../..." } }
```

o, en fallback local:

```json
{ "success": true, "data": { "avatarUrl": "/uploads/influencers/influencer-avatar-....jpg" } }
```

---

## 4. Paso opcional: análisis con IA (screenshot)

| Método | URL | Body |
|--------|-----|------|
| POST | `/api/analyze-profile-image` | `multipart/form-data`: campo **`image`** (archivo), **`type`** = `influencer` |

Respuesta esperada (`json.data`): campos como `displayName`, `bio`, `location`, `categories` (array), `socialMedia` (array de `{ platform, username, followers }`).

El front mapea eso al estado del formulario (incluye `collaborationPreferences` si vienen categorías desde la IA).

---

## 5. Pasos del formulario (wizard)

### Paso 1 – Información básica

| Campo en UI | Estado interno | Obligatorio para avanzar |
|-------------|----------------|---------------------------|
| Nombre de Influencer | `displayName` | Sí |
| Foto de perfil (opcional) | `profilePhotoFile` / preview | No (si hay archivo, se sube en `handleSubmit` antes del create) |
| Biografía | `bio` | Sí |
| Ubicación | `location` | No |
| Idiomas | `languages` (array de strings, ej. `["Español"]`) | No |
| Años de experiencia | `experience` (número; 1–10 o `10+` según valor del select) | No |

**Validación:** `canProceed()` en paso 1 exige `displayName` y `bio` no vacíos.

### Paso 2 – Redes y categorías

En la misma lista de estado `collaborationPreferences` se mezclan:

- **IDs de categorías de contenido** (ej. `lifestyle`, `fashion`, `beauty`, … ver lista en el componente).
- **Tipos de colaboración** (ej. `sponsored-posts`, `product-reviews`, `brand-ambassador`, …).

| Campo en UI | Estado interno |
|-------------|----------------|
| Categorías de contenido (botones) | se añaden/quitan IDs en `collaborationPreferences` |
| Tipos de colaboración (botones) | igual |
| Redes sociales (plataforma, usuario, seguidores) | `socialMedia[]`: `{ platform, username, followers, verified }` |

Plataformas en el select: Instagram, TikTok, YouTube, Twitter, Facebook, LinkedIn, Twitch.

**Validación:** para avanzar al paso 3 hace falta **al menos un elemento** en `collaborationPreferences` (categoría o tipo de colaboración).

### Paso 3 – Portfolio

- Permite adjuntar archivos (imágenes, PDF, etc.) en `formData.portfolio[]`.
- **Importante:** **`handleSubmit` no envía el portfolio** al servidor; no hay upload. El portfolio sigue siendo solo UI (limitación conocida).

---

## 6. Envío final: `POST /api/influencers`

### Headers

| Header | Valor |
|--------|--------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <token>` **solo si** existe sesión (`auth_token`) |

### Cuerpo JSON enviado por la web

```json
{
  "displayName": "string (trim)",
  "bio": "string opcional",
  "location": "string opcional",
  "languages": ["Español", "Inglés"],
  "experience": 1,
  "collaborationPreferences": ["fashion", "sponsored-posts"],
  "socialMedia": [
    { "platform": "Instagram", "username": "mi_usuario", "followers": 10000, "verified": false }
  ],
  "avatar": "https://... o /uploads/influencers/... (opcional; viene del POST /avatar)"
}
```

### Respuestas del backend

| HTTP | Significado |
|------|-------------|
| **201** | Creado. Cuerpo: `{ success: true, data: { ... } }` (formato frontend). |
| **400** | Falta `name`/`displayName` u otro error de validación. |
| **503** | MongoDB no disponible (`Base de datos no disponible`). |

En el controlador (`influencerController.create`):

- `displayName` → se guarda como **`name`** en MongoDB.
- `collaborationPreferences` → se guarda en **`categories`** (array).
- `socialMedia` se transforma a `followers` por plataforma (Instagram, TikTok, YouTube, Twitter/X) y a `socialMedia` con handles por red.
- `status` inicial: **`pending`**.
- Si hay usuario autenticado, se asigna **`userId`**.
- **`avatar`:** si el cliente envía `avatar` como URL (string), se guarda; el formulario web **sí** lo envía cuando el usuario eligió foto y el upload a `/api/influencers/avatar` tuvo éxito.

---

## 7. Comportamiento tras el éxito

- `navigate('/influencers')` — lista de influencers.
- Errores: `alert` con el mensaje del servidor.

---

## 8. Referencias de código

### Web (SPA)

| Qué | Dónde |
|-----|--------|
| Ruta React | `App.tsx` → `<Route path="/influencer-setup" element={<InfluencerSetup />} />` |
| Formulario y envío | `src/pages/InfluencerSetup.tsx` |
| API crear | `server/routes/influencers.js` → `POST /` con `optionalAuth` |
| API avatar | `server/routes/influencers.js` → `POST /avatar` (`memoryUpload.single('avatar')`) |
| Lógica crear / upload avatar | `server/controllers/influencerController.js` → `create`, `uploadAvatar` |
| Multer memoria / carpeta influencers | `server/middleware/upload.js` (`memoryUpload`, `getInfluencerUploadDir`) |
| Modelo | `server/models/Influencer.js` |
| Análisis imagen (memoria, sin persistir) | `server/routes/analyzeProfile.js`, `server/services/geminiProfileAnalyzer.js` |

### App móvil (React Native / Expo)

| Qué | Dónde |
|-----|--------|
| Pantalla búsqueda y creación | `src/screens/InfluencerSearchScreen.tsx` |
| Tarjeta de influencer | `src/components/InfluencerCard.tsx` |
| API influencers | `src/services/influencersApi.ts` → `analyzeProfileImage`, `uploadInfluencerAvatar`, `createInfluencer`, `getAllInfluencers`, `searchInfluencers` |
| Flujo foto | Captura → IA (opcional) → `profileImageUri` en form → `handleSubmit`: `uploadInfluencerAvatar` (Multer en backend) → `createInfluencer` con `avatar` |

---

## 9. Checklist para implementar en la app móvil

- [x] Pantalla equivalente (flujo simplificado: búsqueda + formulario único con campos del doc).
- [x] Validaciones: paso 1 (`displayName` + `bio`); categorías y redes opcionales.
- [x] `POST /api/analyze-profile-image` con `image` + `type=influencer` (opcional).
- [x] Si hay foto de perfil (captura analizada): `POST /api/influencers/avatar` con campo **`avatar`** (Multer en backend), luego `POST /api/influencers` con `avatar` en el JSON.
- [x] `POST /api/influencers` con el JSON de la sección 6; incluir `Authorization` si hay sesión (también en `/avatar` si aplica).
- [x] Manejar 201 → pantalla de confirmación y opción "Agregar otro" / "Listo".
- [x] Manejar errores con mensaje claro.
- [ ] **Nota:** portfolio en paso 3 hoy **no** se sube por API.

---

## 10. Pruebas rápidas con `curl`

**Subir avatar (opcional):**

```bash
curl -s -X POST "http://localhost:3000/api/influencers/avatar" \
  -F "avatar=@/ruta/a/foto.jpg"
```

Respuesta: `data.avatarUrl` (Cloudinary o `/uploads/influencers/...`).

**Crear influencer (sin sesión):**

```bash
curl -s -X POST "http://localhost:3000/api/influencers" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Test Influencer","bio":"Bio de prueba","languages":["Español"],"experience":2,"collaborationPreferences":["fashion"],"socialMedia":[{"platform":"Instagram","username":"test","followers":1000,"verified":false}],"avatar":"https://ejemplo.com/o-ruta-local.jpg"}'
```

Esperado: HTTP **201** y `success: true`.

**Con sesión:** añadir `-H "Authorization: Bearer <JWT>"` al avatar y al create.
