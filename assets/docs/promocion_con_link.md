# Lógica del cupón "Ir a comprar" (redirección) para la app

Describe cómo funciona el flujo cuando una promoción está configurada como **quick promotion** (redirección): el usuario no recibe un QR sino un enlace para ir directo a comprar (Amazon, Adidas, etc.). Sirve para implementar el mismo comportamiento en una app móvil o otra cliente.

**Ejemplo de promoción:** `http://localhost:5173/promotion-details/69b563da671a5ee7e342f288` (el id de promoción es `69b563da671a5ee7e342f288`).

---

## 1. Cómo saber si una promoción es "Ir a comprar" (redirección)

Al obtener el detalle de una promoción con **GET /api/promotions/:id**, la respuesta incluye:

| Campo | Tipo | Significado |
|-------|------|-------------|
| `redirectInsteadOfQr` | boolean | Si es `true`, al solicitar cupón la API **no** devuelve QR sino una URL de redirección. |
| `redirectToUrl` | string | URL guardada (puede estar vacía). Si está vacía y `redirectInsteadOfQr` es true, el backend usará la URL por defecto de Amazon. |

**En la app:** si `data.redirectInsteadOfQr === true`, puedes mostrar un botón tipo "Ir a comprar" en lugar de (o además de) "Solicitar cupón". Al solicitar cupón, no esperes un QR; espera la respuesta con `noQr` y `redirectToUrl`.

---

## 2. Flujo para obtener la URL de compra

El usuario toca "Solicitar cupón" o "Ir a comprar". La app debe llamar al mismo endpoint que para un cupón con QR; la respuesta indica si hay QR o redirección.

### Request

**POST** `/api/discount-qr/create`  
**Content-Type:** `application/json`

**Body (mínimo para redirección):**

```json
{
  "deviceId": "dev-1734567890-abc123",
  "promotionId": "69b563da671a5ee7e342f288",
  "referralCode": "L4D-69b563da671a5ee7e342f288-A1B2C3D4",
  "discountPercentage": 15,
  "influencerId": "userId-o-guest",
  "walletAddress": "not-provided"
}
```

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `deviceId` | Sí | Identificador único del dispositivo (generar y persistir en la app). |
| `promotionId` | Sí | ID de la promoción (ej. `69b563da671a5ee7e342f288`). |
| `referralCode` | Sí | Código de cupón/referido; en web se genera como `L4D-{promotionId}-{timestamp36}`. |
| `discountPercentage` | Sí | Número 0–100 (porcentaje de descuento de la promoción). |
| `influencerId` | No | ID del influencer si aplica; si no, `"guest"`. |
| `walletAddress` | No | Puede ser `"not-provided"`. |

### Respuesta cuando la promoción es de redirección

**HTTP 200**, body:

```json
{
  "ok": true,
  "noQr": true,
  "redirectToUrl": "https://amzn.to/3NfsW8K"
}
```

| Campo | Significado |
|-------|-------------|
| `ok` | Siempre `true` en éxito. |
| `noQr` | Indica que **no** hay QR; la app debe mostrar un botón de redirección, no un código QR. |
| `redirectToUrl` | URL a la que enviar al usuario (abrir en navegador o WebView). |

Si la promoción **no** es de redirección, la respuesta trae `qrValue`, `prefix`, `version`, `ttlSeconds`, etc., y la app debe mostrar el QR.

---

## 3. Qué mostrar en la app cuando `noQr` es true

1. **Pantalla / modal de resultado** con:
   - Título sugerido: **"¡Ir a comprar!"** o **"¡Comprar en Amazon!"** si la URL contiene `amzn.to` o `amazon.`
   - Un botón principal que abra `redirectToUrl` (navegador externo o WebView).
   - Texto del botón sugerido:
     - Si `redirectToUrl` contiene "amazon" o "amzn" → **"Comprar en Amazon"**.
     - En otro caso → **"Ir a comprar"**.
   - Botón secundario **"Cerrar"** (cerrar modal o volver atrás).

2. **No mostrar:** countdown de validez, código QR, código de cupón manual ni bloque "Smart contract", porque en este flujo no hay token QR.

3. **Abrir la URL:**  
   `redirectToUrl` debe abrirse en el navegador del sistema o en un WebView (según tu app). Ejemplo genérico: abrir enlace con `window.open(redirectToUrl, '_blank')` (web) o el equivalente en tu plataforma (deep link / browser).

---

## 4. Origen de `redirectToUrl` (backend)

- Si la promoción tiene **redirectInsteadOfQr** y **no** tiene `redirectToUrl` guardado (o está vacío): el backend devuelve la URL por defecto de Amazon: `https://amzn.to/3NfsW8K`.
- Si la promoción tiene **redirectToUrl** guardado:
  - Si la URL es de Amazon (dominio `amazon.*` o `amzn.to`): el backend **añade o reemplaza** el parámetro `tag` con el tag de afiliado (ej. `jalme-20`), para que la compra quede atribuida.
  - Si la URL es de otra tienda (Adidas, etc.): se devuelve tal cual.

La app no necesita conocer esta lógica; solo debe usar el valor de `redirectToUrl` que devuelve el create.

---

## 5. Resumen para implementar en la app

| Paso | Acción en la app |
|------|-------------------|
| 1 | Obtener detalle de la promoción: **GET /api/promotions/:id**. Opcional: si `redirectInsteadOfQr === true`, mostrar CTA "Ir a comprar" o similar. |
| 2 | Al tocar "Solicitar cupón" o "Ir a comprar": llamar **POST /api/discount-qr/create** con `deviceId`, `promotionId`, `referralCode`, `discountPercentage` (y opcionalmente `influencerId`, `walletAddress`). |
| 3 | Si la respuesta tiene `ok === true` y `noQr === true`: leer `redirectToUrl`. |
| 4 | Mostrar pantalla/modal con botón que abra `redirectToUrl`; texto del botón "Comprar en Amazon" si la URL es de Amazon, si no "Ir a comprar". No mostrar QR ni código de cupón. |
| 5 | Si la respuesta tiene `ok === true` y `qrValue`: flujo normal de cupón con QR (mostrar QR, código, etc.). |

---

## 6. Ejemplo con la promoción 69b563da671a5ee7e342f288

- **GET** `https://tu-api.com/api/promotions/69b563da671a5ee7e342f288`  
  → Si en `data` ves `redirectInsteadOfQr: true`, esa promoción es de tipo "Ir a comprar".

- **POST** `https://tu-api.com/api/discount-qr/create` con body:
  ```json
  {
    "deviceId": "dev-app-123",
    "promotionId": "69b563da671a5ee7e342f288",
    "referralCode": "L4D-69b563da671a5ee7e342f288-XY7Z",
    "discountPercentage": 20,
    "influencerId": "guest",
    "walletAddress": "not-provided"
  }
  ```
  → Si la promoción está configurada como redirección, respuesta: `{ "ok": true, "noQr": true, "redirectToUrl": "https://..." }`.

- En la app: mostrar pantalla con un botón que abra `redirectToUrl` (por ejemplo "Comprar en Amazon" o "Ir a comprar") y un botón "Cerrar".

Con esto la lógica del cupón "Ir a comprar" queda replicada en la app.
