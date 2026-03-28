# Crear promoción – Referencia para la app (incluye flujo con IA)

Documento para **verificar e implementar** el módulo de creación de promociones en la app móvil, incluyendo el flujo **foto → Gemini (IA) → formulario → guardar**.

**Referencia en web:** `QuickPromotionPage` (`/quick-promotion`, `/add-promotion`) y `CreatePromotionWizard` (`/create-promotion`).  
**Backend:** `server/services/geminiPromoAnalyzer.js`, `promotionController.analyzePromotionImage`, `POST /api/promotions`.

---

## Tabla de contenidos

1. [Flujo completo con IA (checklist)](#1-flujo-completo-con-ia-checklist)
2. [Requisitos del servidor (Gemini)](#2-requisitos-del-servidor-gemini)
3. [Paso A – Analizar imágenes con IA](#3-paso-a--analizar-imágenes-con-ia)
4. [Esquema de respuesta `data` (Gemini)](#4-esquema-de-respuesta-data-gemini)
5. [Mapeo a campos del formulario en la app](#5-mapeo-a-campos-del-formulario-en-la-app)
6. [Moneda y precios (importante)](#6-moneda-y-precios-importante)
7. [Paso B – Crear la promoción](#7-paso-b--crear-la-promoción)
8. [Quick promotion vs Wizard (web)](#8-quick-promotion-vs-wizard-web)
9. [Cupón QR vs redirección](#9-cupón-qr-vs-redirección)
10. [Errores y límites](#10-errores-y-límites)
11. [Resumen rápido](#11-resumen-rápido)

---

## 1. Flujo completo con IA (checklist)

Orden recomendado (igual que en la web):

| # | Acción | Detalle |
|---|--------|---------|
| 1 | Usuario elige 1–5 imágenes | JPEG/PNG/WebP habituales. |
| 2 | App envía `POST /api/promotions/analyze-image` | `multipart/form-data`, campo **`images`** (repetido por archivo). |
| 3 | Servidor llama a **Gemini** | Modelo `gemini-2.5-flash-lite`; respuesta JSON estructurada. |
| 4 | App rellena el formulario con `response.data` | Ver [mapeo §5](#5-mapeo-a-campos-del-formulario-en-la-app). |
| 5 | Usuario revisa/edita | Obligatorio validar título y datos antes de publicar. |
| 6 | App envía `POST /api/promotions` | **Mismas imágenes** en FormData + campos de texto/número. |
| 7 | Éxito `201` | Usar `data.id` para abrir detalle (ej. `/promotion-details/{id}`). |

**No hay segundo endpoint de IA:** solo existe análisis por imagen; el guardado es siempre `POST /api/promotions`.

---

## 2. Requisitos del servidor (Gemini)

Sin esto, `analyze-image` devuelve error 400:

| Variable de entorno | Notas |
|---------------------|--------|
| `GEMINI_API_KEY` o `gemini-api-key` | API key de Google AI Studio / Gemini. |

Implementación: `server/services/geminiPromoAnalyzer.js`.

---

## 3. Paso A – Analizar imágenes con IA

### Endpoint

| Método | URL | Auth |
|--------|-----|------|
| **POST** | `/api/promotions/analyze-image` | En el código actual **no** se exige JWT en esta ruta (pública como el resto de POST de promociones del router; valorar proteger en producción si aplica). |

### Request

- **Content-Type:** `multipart/form-data` (el cliente no debe fijar boundary a mano).
- **Campo de archivos:** `images` (nombre exacto).
- **Cantidad:** mínimo **1**, máximo **5** archivos.
- **Multer:** carga en **memoria** (`memoryUpload`).

### Ejemplo (conceptual)

```http
POST /api/promotions/analyze-image
Content-Type: multipart/form-data; boundary=----...

------...
Content-Disposition: form-data; name="images"; filename="promo.jpg"
Content-Type: image/jpeg

(binary)
------...--
```

### Respuesta éxito (200)

```json
{
  "success": true,
  "data": { /* ver §4 */ },
  "message": "Análisis completado"
}
```

### Respuestas error

| HTTP | Cuándo |
|------|--------|
| **400** | Sin archivos; o Gemini sin API key; o fallo de Gemini / JSON inválido. Cuerpo: `{ "success": false, "message": "..." }`. |
| **500** | Error no controlado en el controlador. |

---

## 4. Esquema de respuesta `data` (Gemini)

El modelo está instruido a devolver **solo JSON** con esta forma (el servidor normaliza tipos y enums inválidos):

| Campo | Tipo | Notas |
|-------|------|--------|
| `title` | string | Título de la promoción. |
| `description` | string | Descripción larga. |
| `productName` | string | Nombre del producto (la web a veces iguala a título). |
| `brand` | string | Marca. |
| `category` | string | Uno de: `electronics`, `fashion`, `home`, `beauty`, `sports`, `books`, `food`, `other`. Si no coincide → backend fuerza `other`. |
| `originalPrice` | number | **En USD** según el prompt de Gemini (convierte MXN/EUR aprox.). |
| `currentPrice` | number | **En USD** (precio oferta). |
| `discountPercentage` | number | 0–100. |
| `offerType` | string | `percentage` \| `bogo` \| `cashback_fixed` \| `cashback_percentage`. Si no es válido → `percentage`. |
| `cashbackValue` | number \| null | Relevante si `offerType` es cashback. |
| `termsAndConditions` | string | Texto legal si aparece en la imagen; si no, `""`. |

**Prompt del modelo (resumen):** pide precios en USD; extrae términos si hay letra pequeña en la imagen; enums fijos para `category` y `offerType`. Ver constante `ANALYSIS_PROMPT` en `geminiPromoAnalyzer.js`.

**Modelo API:** `gemini-2.5-flash-lite` (`generativelanguage.googleapis.com/v1beta`).

---

## 5. Mapeo a campos del formulario en la app

### Referencia alineada con `QuickPromotionPage`

Tras `analyze-image`, actualizar el estado del formulario así:

| Campo UI / estado app | Origen `data` (Gemini) | Validación extra |
|------------------------|-------------------------|------------------|
| `title` | `d.title` | Obligatorio antes de `POST /api/promotions`. |
| `description` | `d.description` | Opcional. |
| `brand` | `d.brand` | Opcional. |
| `category` | `d.category` | Debe ser uno del enum; si no, mantener default. |
| `originalPrice` | `d.originalPrice` | number. |
| `currentPrice` | `d.currentPrice` | number. |
| `offerType` | `d.offerType` | Solo si está en la lista permitida. |
| `cashbackValue` | `d.cashbackValue` | Si es número; si no, 0 o valor previo. |
| `termsAndConditions` | `d.termsAndConditions` | string. |

**Imágenes:** el análisis **no** devuelve binarios; la app debe **conservar los mismos `File`/URI locales** usados en el `analyze-image` y enviarlos de nuevo en `POST /api/promotions`.

### `CreatePromotionWizard` (diferencias)

- Convierte `category` de slug a **etiqueta en español** (`categoryNameFromSlug`).
- `offerType` del wizard es `percentage` \| `fixed` \| `bogo`: desde Gemini mapea `percentage` → `percentage`, `bogo` → `bogo`, **cualquier otro** (incl. cashback) → `fixed`.
- `offerValue` ← `discountPercentage` o calculado desde precios.

Si la app móvil replica el **Wizard**, aplicar la misma lógica de mapeo; si replica **Quick promotion**, usar el mapeo directo de enums del API.

---

## 6. Moneda y precios (importante)

- Gemini devuelve precios **normalizados a USD** en el prompt del sistema.
- El formulario de quick-promotion permite **USD o MXN** al usuario.
- **Recomendación para la app:**
  - Si el usuario trabaja en **USD:** usar `originalPrice` / `currentPrice` tal cual vienen de `analyze-image`.
  - Si el usuario elige **MXN:** o bien convertir USD→MXN en cliente (con tasa clara en UI), o dejar precios en USD y fijar `currency: "USD"` al crear; **no** mezclar sin conversión explícita.

Al crear promoción, `currency` puede ser `USD` o `MXN` según el contrato de `POST /api/promotions` (ver §7).

---

## 7. Paso B – Crear la promoción

### Endpoint

| Método | URL | Content-Type |
|--------|-----|--------------|
| **POST** | `/api/promotions` | `multipart/form-data` (con imágenes) o `application/json` (sin imágenes). |

**Base URL:** misma que el resto de la API (ej. `https://www.damecodigo.com/api/promotions`).

### Obligatorio

| Campo | Tipo |
|-------|------|
| **title** | string |

### Campos opcionales (frecuentes)

`description`, `productName`, `brand`, `category`, `originalPrice`, `currentPrice`, `currency`, `discountPercentage`, `offerType`, `cashbackValue`, `storeCity`, `storeState`, `validFrom`, `validUntil`, `totalQuantity`, `termsAndConditions`, **`images`** (hasta 5, campo `images`).

### Respuesta éxito (201)

```json
{
  "success": true,
  "message": "Promoción creada exitosamente",
  "data": {
    "id": "69a8e15cf8e811c8129b494c",
    "title": "...",
    "productName": "...",
    "images": 1,
    "ocrProcessed": false,
    "status": "draft"
  },
  "mode": "database"
}
```

- Redirigir a detalle con **`data.id`**.
- `mode`: `"database"` | `"simulated"`.

### Errores

- **400:** validación (`message`, opcional `missingFields`).
- **500:** error interno.

### Ejemplo JSON mínimo (sin imágenes)

```json
{
  "title": "McFlurry Oreo",
  "description": "Promoción McFlurry de Oreo",
  "productName": "McFlurry Oreo",
  "brand": "McDonald's",
  "category": "food",
  "originalPrice": 60,
  "currentPrice": 29,
  "currency": "USD",
  "discountPercentage": 52,
  "offerType": "percentage",
  "storeCity": "Ciudad de México",
  "validFrom": "2026-03-06",
  "validUntil": "2026-04-06",
  "totalQuantity": 100
}
```

### FormData (con fotos)

- `formData.append('title', ...)` etc.
- `formData.append('images', file)` por cada archivo (mismo nombre de campo **`images`**).

---

## 8. Quick promotion vs Wizard (web)

| Aspecto | QuickPromotion | CreatePromotionWizard |
|---------|----------------|------------------------|
| Rutas | `/quick-promotion`, `/add-promotion` | `/create-promotion` |
| Disparo IA | Al subir fotos llama a `handleAnalyzeWithGemini` automáticamente | Igual al subir en paso de medios |
| Categoría | Guarda slug en inglés | Muestra nombre en español |
| offerType tras IA | Enum API completo | `fixed` para cashback / desconocidos |
| Re-analizar | Botón “Volver a analizar” (mismas imágenes) | Botón equivalente en el paso de medios |

---

## 9. Cupón QR vs redirección

En quick-promotion la web permite:

| Modo | Comportamiento |
|------|----------------|
| **Cupón con QR** | Token QR para canjear en tienda. |
| **Redirección** | Sin QR; redirección a URL. Campos extra: `redirectInsteadOfQr: "true"`, `redirectToUrl` (opcional; Amazon con tag de afiliado si aplica). |

---

## 10. Errores y límites

- **Creación:** rate limit en servidor (~10 promociones / 15 min por IP en `POST /`; ver `createPromotionLimiter` en `server/routes/promotions.js`).
- **analyze-image:** no tiene limiter dedicado en el archivo de rutas; queda sujeto al limiter global de `/api/` si aplica.
- Si Gemini responde malformado, el usuario ve mensaje genérico; revisar logs del servidor.

---

## 11. Resumen rápido

| Acción | Método | Ruta |
|--------|--------|------|
| Rellenar form con IA | POST | `/api/promotions/analyze-image` (campo `images`, 1–5) |
| Guardar promoción | POST | `/api/promotions` (FormData + `title` obligatorio) |

- **IA:** solo Gemini por imagen; modelo `gemini-2.5-flash-lite`; precios en **USD** en la respuesta.
- **App:** mapear `data` → formulario; luego enviar **las mismas imágenes** + campos en `POST /api/promotions`.
- **Código fuente:** `geminiPromoAnalyzer.js`, `promotionController.js` (`analyzePromotionImage`, `createPromotion`), `QuickPromotionPage.tsx`, `CreatePromotionWizard.tsx`.

---

## Anexo – Checklist de implementación móvil

- [ ] Subida multi-imagen (máx. 5), campo `images`.
- [ ] Llamada `analyze-image` con indicador de carga y manejo de `success: false`.
- [ ] Mapeo de todos los campos de §4; validación de enums.
- [ ] Aclarar en UI que los precios sugeridos por IA vienen en USD (o conversión a MXN).
- [ ] Conservar blobs/archivos hasta el POST final.
- [ ] `POST /api/promotions` con `title` y resto de campos editados.
- [ ] Navegación a pantalla de detalle con `id` de la respuesta 201.
