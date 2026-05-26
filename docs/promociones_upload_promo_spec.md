# Especificacion de creacion de promociones: upload-promo y quick-upload-promo

Este documento consolida los requisitos, endpoints y schemas usados por la app movil para crear promociones desde el flujo `UploadPromotionsScreen`. Cubre dos variantes:

- `upload-promo`: creacion de promocion normal con cupon QR.
- `quick-upload-promo`: creacion rapida que puede redirigir a una URL externa en vez de generar QR.

La implementacion actual esta en:

- `src/screens/UploadPromotionsScreen.tsx`
- `src/services/promotionsApi.ts`

## Base URL

La app usa:

```text
https://damecodigo.com
```

Todas las rutas documentadas abajo se resuelven contra esa base URL.

## Flujo funcional

1. El usuario debe estar registrado/KYC en la app. Si no tiene `userName`, la pantalla muestra el bloqueo de registro.
2. El usuario puede subir de 1 a 5 imagenes desde camara o galeria.
3. Al agregar imagenes, la app llama automaticamente a Gemini por medio de `POST /api/promotions/analyze-image`.
4. La respuesta de IA se mapea al formulario: titulo, descripcion, producto, marca, categoria, precios, tipo de oferta, cashback y terminos.
5. El usuario revisa y puede editar los datos.
6. Al publicar, la app construye un `PromotionPayload` y llama a `POST /api/promotions`.
7. La promocion se envia con `status: "draft"` y queda pendiente de verificacion.
8. Si el backend responde correctamente, la app otorga 10 tokens LUXAE, limpia el formulario y puede abrir `/promotion-details/{id}`.
9. Si falla la app, se ofrece abrir el formulario web en `https://damecodigo.com/quick-promotion`.

## Endpoints

| Accion | Metodo | Endpoint | Content-Type | Uso |
| --- | --- | --- | --- | --- |
| Analizar imagenes con IA | `POST` | `https://damecodigo.com/api/promotions/analyze-image` | `multipart/form-data` | Extrae datos de 1 a 5 imagenes y rellena el formulario. |
| Crear promocion | `POST` | `https://damecodigo.com/api/promotions` | `multipart/form-data` con imagenes o `application/json` sin imagenes | Guarda la promocion en estado `draft` solo si el backend tiene MongoDB conectado. |

## Endpoint: analizar imagenes

### Request

- Metodo: `POST`
- URL: `/api/promotions/analyze-image`
- Header: `Accept: application/json`
- Body: `multipart/form-data`
- Campo de archivos: `images`
- Cantidad de imagenes: minimo 1, maximo 5

Ejemplo conceptual:

```http
POST /api/promotions/analyze-image
Accept: application/json
Content-Type: multipart/form-data

images=@promo-1.jpg
images=@promo-2.jpg
```

### Response schema

```ts
type AnalyzeImageResponse = {
  success: boolean;
  data?: AnalyzeImageData;
  message?: string;
  error?: string;
};

type AnalyzeImageData = {
  title?: string;
  description?: string;
  productName?: string;
  brand?: string;
  category?: PromotionCategory;
  originalPrice?: number;
  currentPrice?: number;
  discountPercentage?: number;
  offerType?: OfferType;
  cashbackValue?: number | null;
  termsAndConditions?: string;
};
```

Enums aceptados por la app:

```ts
type PromotionCategory =
  | 'electronics'
  | 'fashion'
  | 'home'
  | 'beauty'
  | 'sports'
  | 'books'
  | 'food'
  | 'other';

type OfferType =
  | 'percentage'
  | 'bogo'
  | 'cashback_fixed'
  | 'cashback_percentage';
```

Reglas de mapeo:

- `category` solo se aplica si pertenece al enum. Si no, se mantiene el valor actual del formulario.
- `offerType` solo se aplica si pertenece al enum. Si no, se usa `percentage`.
- Si la IA devuelve precios, la app los coloca como texto en `originalPrice` y `currentPrice`.
- Las imagenes no se reemplazan por la respuesta; la app conserva los mismos archivos locales para enviarlos despues al endpoint de creacion.

## Endpoint: crear promocion

### Request

- Metodo: `POST`
- URL: `/api/promotions`
- Header con imagenes: `Accept: application/json`
- Header sin imagenes: `Content-Type: application/json` y `Accept: application/json`
- Body con imagenes: `multipart/form-data`
- Body sin imagenes: JSON

La app decide el formato asi:

- Si `images.length > 0`, envia `FormData`.
- Si no hay imagenes, envia JSON.

### Campos requeridos

| Campo | Tipo | Requerido | Regla |
| --- | --- | --- | --- |
| `title` | `string` | Si | Debe tener texto. Es la unica validacion obligatoria antes de crear. |

### PromotionPayload schema

```ts
type PromotionPayload = {
  title: string;
  description?: string;
  productName?: string;
  brand?: string;
  category: PromotionCategory | string;
  originalPrice: number;
  currentPrice: number;
  currency: 'USD' | 'MXN';
  discountPercentage?: number;
  offerType?: OfferType;
  cashbackValue?: number | null;
  termsAndConditions?: string;
  totalQuantity?: number;
  storeName?: string;
  storeLocation?: PromotionStoreLocation;
  isPhysicalStore?: boolean;
  validFrom?: string;
  validUntil?: string;
  status?: 'draft' | string;
  tags?: string[];
  isHotOffer?: boolean;
  redirectInsteadOfQr?: boolean;
  redirectToUrl?: string;
  gpsActivationEnabled?: boolean;
  locationRadiusMeters?: number;
  redemptionType?: 'in_store_qr' | 'online_redirect';
  fulfillmentType?: 'physical_store' | 'online';
  geoRedemption?: {
    enabled: boolean;
    coordinates: { lat: number; lng: number };
    radiusMeters: number;
    validationMoment: 'coupon_issue';
  };
};

type PromotionStoreLocation = {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  coordinates?: { lat: number; lng: number } | null;
};
```

### Campos enviados al backend

| Campo API | Origen en formulario | Tipo enviado | Notas |
| --- | --- | --- | --- |
| `title` | `title` | string | Requerido. |
| `description` | `description` | string | Opcional. |
| `productName` | `productName` | string | Opcional. |
| `brand` | `brand` | string | Si esta vacio, la app envia `N/A`. |
| `category` | `category` | string | Default `other`. |
| `originalPrice` | `originalPrice` | number/string | Si no es numero, se envia `0`. |
| `currentPrice` | `currentPrice` | number/string | Si no es numero, se envia `0`. |
| `currency` | `promoCurrency` | `USD` o `MXN` | Toma la moneda de configuracion o seleccion del formulario. |
| `discountPercentage` | calculado | number | `round(((original - current) / original) * 100)` si `original > 0`; si no, `0`. |
| `offerType` | `offerType` | string | Enum de oferta, default `percentage`. |
| `cashbackValue` | `cashbackValue` | number | Solo si parsea como numero. |
| `termsAndConditions` | `termsAndConditions` | string | Opcional. |
| `storeName` | `storeName` | string | Opcional. |
| `storeLocation` | derivado de direccion/GPS | object/string JSON | Se envia anidado; en FormData va serializado. Es el formato persistente para coordenadas. |
| `storeAddress` | `storeLocation.address` | string | Compatibilidad con backend para direccion plana. |
| `storeCity` | `storeLocation.city` | string | Opcional. |
| `storeState` | `storeLocation.state` | string | Opcional. |
| `storeCountry` | `storeLocation.country` | string | Opcional. |
| `storeLatitude` | `storeLocation.coordinates.lat` | number/string | Solo lectura/compatibilidad. La app no lo envia en creacion porque activa fallback simulado en backend actual. |
| `storeLongitude` | `storeLocation.coordinates.lng` | number/string | Solo lectura/compatibilidad. La app no lo envia en creacion porque activa fallback simulado en backend actual. |
| `isPhysicalStore` | derivado | boolean/string | `true` para cupon QR en tienda fisica; `false` para redireccion online. |
| `validFrom` | `validFrom` | `YYYY-MM-DD` | La app genera ISO y el servicio corta la fecha antes de enviarla. |
| `validUntil` | `validUntil` | `YYYY-MM-DD` | Default 30 dias; si es permanente, se usa una fecha a 100 anos. |
| `status` | constante | string | La app envia `draft`. |
| `gpsActivationEnabled` | `gpsActivation` | boolean/string | Solo se envia cuando esta activo. |
| `locationRadiusMeters` | `locationRadiusMeters` | number/string | Solo si GPS esta activo. Rango valido: 50 a 50000. |
| `redemptionType` | derivado | string | `in_store_qr` para cupon fisico; `online_redirect` para link externo. |
| `fulfillmentType` | derivado | string | `physical_store` para redencion en negocio; `online` para redireccion. |
| `geoRedemption` | derivado de GPS | object/string JSON | Estructura canonica para cupones geolocalizados; en FormData se envia serializada. |
| `redirectInsteadOfQr` | `promotionMode === "redirect"` | boolean/string | Solo para `quick-upload-promo` con redireccion. |
| `redirectToUrl` | `redirectToUrl` | string | Solo si modo redireccion y hay URL. |
| `images` | imagenes locales | archivo(s) | Campo repetido `images`, maximo 5. |

## Promociones geolocalizadas para cupones del mundo real

Una promocion geolocalizada representa una oferta que se redime fisicamente en el negocio. No debe mezclarse con redireccion online.

Contrato canonico:

```ts
type GeolocatedRealWorldPromotion = PromotionPayload & {
  redemptionType: 'in_store_qr';
  fulfillmentType: 'physical_store';
  isPhysicalStore: true;
  redirectInsteadOfQr?: false;
  gpsActivationEnabled: true;
  locationRadiusMeters: number;
  storeLocation: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    coordinates: { lat: number; lng: number };
  };
  geoRedemption: {
    enabled: true;
    coordinates: { lat: number; lng: number };
    radiusMeters: number;
    validationMoment: 'coupon_issue';
  };
};
```

Reglas:

- `promotionMode` debe ser `qr`.
- `redirectInsteadOfQr` no debe ser `true`.
- `redemptionType` debe ser `in_store_qr`.
- `fulfillmentType` debe ser `physical_store`.
- `isPhysicalStore` debe ser `true`.
- `gpsActivationEnabled` debe ser `true`.
- `storeLocation.coordinates.lat` y `storeLocation.coordinates.lng` deben estar en WGS84.
- `locationRadiusMeters` debe estar entre `50` y `50000`.
- `geoRedemption.validationMoment` debe ser `coupon_issue`: se valida la ubicacion del usuario antes de emitir el QR.
- Al solicitar el cupon, la app manda `clientLatitude` y `clientLongitude` a `POST /api/discount-qr/create`.
- El backend debe emitir el QR solo si el usuario esta dentro del radio permitido.

### Diferencia entre JSON y FormData

Con imagenes, el servicio envia cada campo con `formData.append`. Los valores numericos y booleanos viajan como strings porque `multipart/form-data` no conserva tipos primitivos.

Sin imagenes, el servicio envia JSON. La ubicacion viaja anidada en `storeLocation` y la direccion tambien se conserva en campos planos de compatibilidad (`storeAddress`, `storeCity`, `storeState`, `storeCountry`). No se envian `storeLatitude` ni `storeLongitude` planos al crear.

## Requisitos de upload-promo

`upload-promo` corresponde al modo normal de cupon:

- `promotionMode` debe ser `qr`.
- `redirectInsteadOfQr` no se envia o se envia como `false`.
- `redirectToUrl` no se envia.
- `redemptionType` debe ser `in_store_qr`.
- `fulfillmentType` debe ser `physical_store`.
- El usuario puede agregar imagenes, pero no son obligatorias.
- La promocion se crea como borrador (`draft`) y requiere revision antes de mostrarse activa.
- Si se activa GPS, la app exige latitud, longitud y radio valido antes de enviar.

## Requisitos de quick-upload-promo

`quick-upload-promo` corresponde al modo de redireccion:

- `promotionMode` debe ser `redirect`.
- Se envia `redirectInsteadOfQr: true`.
- `redemptionType` debe ser `online_redirect`.
- `fulfillmentType` debe ser `online`.
- `redirectToUrl` es opcional en la app; si esta vacio, el backend puede aplicar comportamiento por defecto.
- El usuario final no recibe QR. Al solicitar el cupon, el backend debe responder con redireccion.
- Aplica el mismo endpoint de creacion: `POST /api/promotions`.
- Aplica el mismo schema base `PromotionPayload`.
- No debe activar GPS; las promociones GPS son cupones QR para redencion fisica.

## Requisitos de GPS

Cuando `gpsActivation` esta activo:

- `promotionMode` debe ser `qr`.
- `storeLatitude` debe ser numerico entre `-90` y `90`.
- `storeLongitude` debe ser numerico entre `-180` y `180`.
- `locationRadiusMeters` debe estar entre `50` y `50000`.
- Se envia `gpsActivationEnabled: true`.
- Se envia `locationRadiusMeters`.
- Se envia `storeLocation` con `coordinates.lat` y `coordinates.lng`; no se envian `storeLatitude` ni `storeLongitude` planos.
- Se envia `geoRedemption` con `enabled`, `coordinates`, `radiusMeters` y `validationMoment: "coupon_issue"`.

Cuando `gpsActivation` esta apagado:

- No se envia `gpsActivationEnabled`.
- No se envia `locationRadiusMeters`.
- Las coordenadas solo se envian si existen en `storeLocation.coordinates`.

## Response de creacion

El servicio acepta como exito una respuesta HTTP OK que no tenga `success: false` y que no venga en modo simulado.

Schema esperado:

```ts
type CreatePromotionResponse = {
  success?: boolean;
  message?: string;
  data?: {
    id?: string;
    _id?: string;
    title?: string;
    productName?: string;
    images?: number;
    ocrProcessed?: boolean;
    status?: string;
    [key: string]: unknown;
  };
  id?: string;
  error?: string;
  mode?: 'database' | 'simulated' | string;
};
```

Si el backend responde `mode: "simulated"`, un id con prefijo `sim-` o un mensaje como `MongoDB no conectado`, la app debe tratarlo como error. Esa respuesta indica que la promocion se guardo en memoria o no se persistio, por lo que no aparecera en `GET /api/promotions`.

Ejemplo:

```json
{
  "success": true,
  "message": "Promocion creada exitosamente",
  "data": {
    "id": "69a8e15cf8e811c8129b494c",
    "title": "McFlurry Oreo",
    "productName": "McFlurry Oreo",
    "images": 1,
    "ocrProcessed": false,
    "status": "draft"
  },
  "mode": "database"
}
```

## Manejo de errores

### Analyze image

- Si no hay imagenes o hay mas de 5, la app no llama el endpoint.
- Si el backend responde `success: false`, sin `data` o con HTTP no OK, se muestra error y el usuario completa manualmente.
- Si hay excepcion de red, se muestra `Network error` o el mensaje recibido.

### Create promotion

- Si falta `title`, la app bloquea el envio antes del request.
- Si GPS esta activo y los datos son invalidos, la app bloquea el envio antes del request.
- Si el backend responde HTTP no OK, `success: false`, `message` o `error`, la app muestra alerta y ofrece abrir el formulario web.

## Ejemplo JSON sin imagenes

```json
{
  "title": "McFlurry Oreo",
  "description": "Promocion McFlurry de Oreo",
  "productName": "McFlurry Oreo",
  "brand": "McDonald's",
  "category": "food",
  "originalPrice": 60,
  "currentPrice": 29,
  "currency": "MXN",
  "discountPercentage": 52,
  "offerType": "percentage",
  "storeName": "McDonald's",
  "storeCity": "Ciudad de Mexico",
  "storeState": "CDMX",
  "storeCountry": "Mexico",
  "validFrom": "2026-04-24",
  "validUntil": "2026-05-24",
  "isPhysicalStore": false,
  "status": "draft"
}
```

## Ejemplo FormData con quick-upload-promo

```text
title=Tenis con descuento
description=Oferta por tiempo limitado
productName=Tenis Runner
brand=Nike
category=fashion
originalPrice=1999
currentPrice=1499
currency=MXN
discountPercentage=25
offerType=percentage
validFrom=2026-04-24
validUntil=2026-05-24
isPhysicalStore=false
status=draft
redirectInsteadOfQr=true
redirectToUrl=https://example.com/producto
images=@promo.jpg
```

## Checklist de QA

- Crear promocion normal sin imagenes usando JSON.
- Crear promocion normal con 1 imagen usando FormData.
- Subir 5 imagenes y validar que `analyze-image` rellene el formulario.
- Intentar subir mas de 5 imagenes y confirmar que la app limite el envio.
- Publicar sin titulo y confirmar que no se llama al backend.
- Activar GPS con latitud invalida y confirmar bloqueo local.
- Crear `quick-upload-promo` con `redirectToUrl` y confirmar que viaja `redirectInsteadOfQr: true`.
- Confirmar que toda promocion nueva se envia con `status: "draft"`.
