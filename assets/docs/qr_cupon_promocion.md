# Cupón QR de promoción: formato, decodificación e información

Este documento describe qué contiene el código que se muestra en el QR de cupón (descuento), cómo interpretarlo y **cómo obtener todos los datos** asociados (promoción, referido, dispositivo, etc.).

La implementación de referencia en la app está en `src/services/discountQrApi.ts`.

---

## 1. Qué es exactamente el string del QR (`qrValue`)

Tras **POST** `/api/discount-qr/create` (o **GET** `/api/discount-qr/create?...`), si la promoción **no** es de solo redirección (`noQr` no es `true`), la respuesta incluye un campo **`qrValue`**: es la cadena que debe codificarse en el QR (texto plano).

| Aspecto | Detalle |
|--------|---------|
| **Origen** | Lo genera y firma el **backend** (token de un solo uso o de vida limitada, según `ttlSeconds`). |
| **¿Se puede “abrir” offline?** | **No** de forma fiable. El contenido **no** es un JSON legible ni un Base64 con campos fijos documentados en el cliente: es un identificador/token que solo el servidor valida. |
| **Forma típica** | Depende del backend; puede ser una cadena larga alfanumérica. El prefijo lógico del producto es **`LINK4DEAL-DISCOUNT`** (también viene en la respuesta como `prefix` cuando aplica). |

**Conclusión:** para “decodificar” la información de negocio (promoción, % descuento, wallet, etc.) debes usar la **API de verificación** (y/o canje) con ese mismo string, no parsear el token a mano como si fuera un sobre cerrado con JSON.

---

## 2. Cómo obtener toda la información a partir del QR escaneado

### 2.1 Verificar el token (lectura de datos)

**POST** `{API_BASE}/discount-qr/verify`  
**Content-Type:** `application/json`

```json
{
  "qrValue": "<string exacto leído del QR>"
}
```

**Base URL en app:** `EXPO_PUBLIC_API_URL` o por defecto `https://damecodigo.com/api` (el path completo es `/api/discount-qr/verify` si la base ya incluye `/api`).

Respuesta esperada (campos que la app tipa como `VerifyDiscountQrResponse`):

| Campo | Tipo | Significado |
|-------|------|-------------|
| `ok` | boolean | Si la verificación fue correcta. |
| `message` | string (opc.) | Mensaje informativo o error. |
| `couponId` | string (opc.) | Identificador del cupón en backend. |
| **`payload`** | objeto (opc.) | **Aquí está la información “decodificada” del cupón** (la devuelve el servidor tras validar el token). |
| `payload.deviceId` | string (opc.) | ID del dispositivo que solicitó el cupón. |
| `payload.influencerId` | string (opc.) | ID del influencer asociado. |
| `payload.promotionId` | string (opc.) | ID de la promoción. |
| `payload.referralCode` | string (opc.) | Código de referido/cupón (ej. formato tipo `L4D-{promotionId}-…`). |
| `payload.discountPercentage` | number (opc.) | Porcentaje de descuento (0–100). |
| `payload.walletAddress` | string (opc.) | Dirección de wallet indicada al crear el cupón. |
| `redemption` | objeto (opc.) | Estado de canje. |
| `redemption.redeemable` | boolean (opc.) | Si aún se puede canjear. |
| `redemption.usedAt` | string \| null (opc.) | Marca temporal de uso si ya fue canjeado. |
| `data` | objeto (opc.) | Campos extra que el backend pueda añadir. |

**Ejemplo mínimo de uso:** escanear QR → obtener `qrValue` → **POST verify** → leer `payload` y `redemption`.

### 2.2 Canjear el cupón (tienda / lector)

**POST** `{API_BASE}/discount-qr/redeem`

```json
{
  "qrValue": "<string del QR>",
  "readerId": "<id del usuario o terminal que escanea>",
  "readerDeviceId": "<id de dispositivo del lector>",
  "note": "opcional"
}
```

La respuesta incluye `ok`, `message` y opcionalmente `data` con detalles del canje. El canje es la operación que **consume** el cupón; la verificación solo **consulta** estado y payload.

---

## 3. Respuesta al crear el cupón (contexto del QR)

Cuando se crea el cupón con **POST** `/api/discount-qr/create`, además de `qrValue` la API puede devolver:

| Campo | Significado |
|-------|-------------|
| `ok` | Éxito de la operación. |
| `qrValue` | Texto a codificar en el QR. |
| `prefix` | Prefijo lógico (p. ej. `LINK4DEAL-DISCOUNT`). |
| `version` | Versión del formato de token en servidor. |
| `ttlSeconds` | Tiempo de vida del cupón/QR en segundos (countdown en UI). |
| `message` | Mensaje opcional (p. ej. advertencias). |
| `fallback` | Si la app usó un QR de **respaldo local** (ver §4). |
| `noQr` | Si es `true`, no hay QR; usar `redirectToUrl` (flujo “Ir a comprar”). |
| `redirectToUrl` | URL de compra cuando `noQr` es `true`. |

Los datos de entrada al crear (lo que “alimenta” el cupón en el servidor) incluyen: `deviceId`, `influencerId`, `promotionId`, `referralCode`, `discountPercentage`, `walletAddress`, y opcionalmente `clientLatitude` / `clientLongitude` para validación GPS.

---

## 4. QR de respaldo local (sin backend)

Si la app **no** puede contactar al backend o el endpoint falla de cierta forma, el cliente genera un string de respaldo:

**Formato:**

```text
LINK4DEAL-DISCOUNT.local.<short>
```

- **`LINK4DEAL-DISCOUNT`**: prefijo fijo del producto.  
- **`local`**: indica que **no** es un token emitido por el servidor.  
- **`<short>`**: sufijo corto alfanumérico (derivado de `promotionId`, timestamp y aleatorio; longitud acotada, p. ej. hasta ~36 caracteres en total en la implementación actual).

**Decodificación manual:** solo puedes separar por puntos y saber que es “modo local”; **no** contiene embebidos todos los campos del cupón. Para un cupón real atribuible, el backend debe estar disponible.

---

## 5. Otros QR en la app (no confundir)

| Patrón | Uso |
|--------|-----|
| `LINK4DEAL-DISCOUNT...` | Cupón de promoción / descuento (este documento). |
| `LINK4DEAL:PAY:...` / `LINK4DEAL:RECEIVE:...` | QR de wallet / pago (`src/utils/walletQr.ts`). |
| `LINK4DEAL-USER....` | Identificación de usuario sin dirección on-chain. |

Un lector debe distinguir el prefijo o el flujo (descuento vs pago) antes de llamar al endpoint adecuado.

---

## 6. Nota sobre la pantalla “Smart contract” en la app

En `HomeScreen` existe una función que deriva una dirección tipo `0x…` a partir de los **primeros caracteres** del `qrValue` solo para **mock / demostración de UI**. **No** es una decodificación real del contrato ni del payload del cupón; la fuente de verdad sigue siendo la API `verify` / `redeem`.

---

## 7. Resumen rápido

| Pregunta | Respuesta |
|----------|-----------|
| ¿El QR lleva JSON visible? | No necesariamente; el valor es un **token opaco** del servidor. |
| ¿Cómo “decodifico” promoción, % y referido? | **POST** `/discount-qr/verify` con `qrValue` y lee **`payload`**. |
| ¿Cómo canjo en tienda? | **POST** `/discount-qr/redeem` con `qrValue` + datos del lector. |
| ¿Qué es `LINK4DEAL-DISCOUNT.local.xxx`? | Respaldo offline sin token de servidor; formato explícito en §4. |

Para el flujo sin QR (solo enlace), ver `assets/docs/promocion_con_link.md`.
