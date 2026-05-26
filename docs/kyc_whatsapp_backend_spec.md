# KYC WhatsApp OTP - Especificacion Backend

La app movil ya tiene preparado el paso de verificacion de WhatsApp en KYC, pero queda relajado hasta configurar un proveedor OTP. El error:

```text
The route POST /api/kyc/whatsapp/request-code does not exist
```

significa que falta crear la logica del backend. Esta validacion no debe hacerse solo en cliente porque se necesitan credenciales privadas de WhatsApp/Twilio, control de intentos, expiracion y proteccion contra abuso.

Mientras no existan keys de Twilio o WhatsApp Cloud API, la app no bloquea el KYC por OTP. El bloqueo se activa con:

```env
EXPO_PUBLIC_KYC_WHATSAPP_REQUIRED=true
```

## Objetivo

Validar que el numero de WhatsApp ingresado en KYC es real y accesible por el usuario antes de completar el KYC, cuando el proveedor OTP ya este configurado.

Flujo esperado:

1. Usuario llena KYC en la app.
2. Si `EXPO_PUBLIC_KYC_WHATSAPP_REQUIRED=true`, app llama `POST /api/kyc/whatsapp/request-code`.
3. Backend genera OTP, lo guarda de forma temporal y envia mensaje por WhatsApp.
4. Usuario escribe el codigo recibido.
5. App llama `POST /api/kyc/whatsapp/verify-code`.
6. Backend valida codigo, expiracion e intentos.
7. App guarda `phoneWhatsappVerified: "true"` y continua con biometria.
8. Si la bandera no esta activa, app guarda `phoneWhatsappVerified: "false"` con `phoneWhatsappVerificationStatus: "not_required_until_provider_configured"` y continua con biometria.

## Endpoints requeridos

### 1. Solicitar codigo

```http
POST /api/kyc/whatsapp/request-code
Content-Type: application/json
Accept: application/json
```

Request:

```json
{
  "phone": "5527947775"
}
```

Response exito:

```json
{
  "success": true,
  "message": "Codigo enviado por WhatsApp",
  "data": {
    "verificationId": "wh_01HX...",
    "expiresAt": "2026-04-28T01:40:00.000Z"
  }
}
```

Response error:

```json
{
  "success": false,
  "message": "No se pudo enviar el codigo"
}
```

### 2. Validar codigo

```http
POST /api/kyc/whatsapp/verify-code
Content-Type: application/json
Accept: application/json
```

Request:

```json
{
  "phone": "5527947775",
  "code": "123456",
  "verificationId": "wh_01HX..."
}
```

Response exito:

```json
{
  "success": true,
  "message": "WhatsApp verificado",
  "data": {
    "verified": true,
    "verifiedAt": "2026-04-28T01:36:00.000Z"
  }
}
```

Response error:

```json
{
  "success": false,
  "message": "Codigo invalido o expirado"
}
```

## Modelo de datos

Coleccion sugerida: `kyc_whatsapp_verifications`

```ts
type KycWhatsappVerification = {
  _id: string;
  verificationId: string;
  phoneE164: string;
  codeHash: string;
  status: 'pending' | 'verified' | 'expired' | 'blocked';
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string;
  userAgent?: string;
};
```

Reglas:

- Nunca guardar el OTP en texto plano.
- Guardar `codeHash` con SHA-256 + secret/salt del servidor.
- Expiracion recomendada: 5 a 10 minutos.
- Maximo recomendado: 5 intentos por `verificationId`.
- Invalidar codigos anteriores para el mismo telefono cuando se genera uno nuevo.
- Normalizar telefono a E.164, por ejemplo `+525527947775`.

## Variables de entorno

Opcion Twilio Verify:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
```

Opcion WhatsApp Cloud API:

```env
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_TEMPLATE_NAME=kyc_otp
WHATSAPP_TEMPLATE_LANGUAGE=es_MX
OTP_HASH_SECRET=
```

## Normalizacion de telefono

La app puede enviar numeros como `5527947775`. El backend debe:

- Remover espacios, guiones y parentesis.
- Si no trae `+`, inferir pais por default. Para Mexico: `+52`.
- Validar longitud minima y maxima.
- Rechazar numeros claramente invalidos.

Ejemplo:

```ts
function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  return `+52${cleaned}`;
}
```

## Implementacion sugerida con Express

Rutas:

```ts
router.post('/kyc/whatsapp/request-code', requestWhatsappCode);
router.post('/kyc/whatsapp/verify-code', verifyWhatsappCode);
```

Controller conceptual:

```ts
async function requestWhatsappCode(req, res) {
  const phoneE164 = normalizePhone(req.body.phone);
  const code = generateSixDigitCode();
  const verificationId = createId();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await KycWhatsappVerification.updateMany(
    { phoneE164, status: 'pending' },
    { $set: { status: 'expired' } }
  );

  await KycWhatsappVerification.create({
    verificationId,
    phoneE164,
    codeHash: hashOtp(code),
    status: 'pending',
    attempts: 0,
    maxAttempts: 5,
    expiresAt,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  await sendWhatsappOtp(phoneE164, code);

  res.json({
    success: true,
    message: 'Codigo enviado por WhatsApp',
    data: { verificationId, expiresAt }
  });
}
```

```ts
async function verifyWhatsappCode(req, res) {
  const phoneE164 = normalizePhone(req.body.phone);
  const code = String(req.body.code || '').trim();
  const verificationId = req.body.verificationId;

  const verification = await KycWhatsappVerification.findOne({
    verificationId,
    phoneE164,
    status: 'pending'
  });

  if (!verification || verification.expiresAt < new Date()) {
    return res.status(400).json({ success: false, message: 'Codigo invalido o expirado' });
  }

  if (verification.attempts >= verification.maxAttempts) {
    verification.status = 'blocked';
    await verification.save();
    return res.status(429).json({ success: false, message: 'Demasiados intentos' });
  }

  verification.attempts += 1;

  if (verification.codeHash !== hashOtp(code)) {
    await verification.save();
    return res.status(400).json({ success: false, message: 'Codigo invalido o expirado' });
  }

  verification.status = 'verified';
  verification.verifiedAt = new Date();
  await verification.save();

  res.json({
    success: true,
    message: 'WhatsApp verificado',
    data: {
      verified: true,
      verifiedAt: verification.verifiedAt
    }
  });
}
```

## Envio por WhatsApp

### Con Twilio Verify

Twilio ya maneja OTP, expiracion e intentos. En ese caso el backend puede guardar solo un registro de auditoria.

Request code:

```ts
await client.verify.v2
  .services(process.env.TWILIO_VERIFY_SERVICE_SID)
  .verifications
  .create({ to: phoneE164, channel: 'whatsapp' });
```

Verify code:

```ts
const result = await client.verify.v2
  .services(process.env.TWILIO_VERIFY_SERVICE_SID)
  .verificationChecks
  .create({ to: phoneE164, code });

const verified = result.status === 'approved';
```

### Con WhatsApp Cloud API

Usar plantilla aprobada por Meta, por ejemplo:

```text
Tu codigo de verificacion de DameCodigo es {{1}}. Expira en 10 minutos.
```

Enviar template:

```http
POST https://graph.facebook.com/v20.0/{WHATSAPP_PHONE_NUMBER_ID}/messages
Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}
Content-Type: application/json
```

Body conceptual:

```json
{
  "messaging_product": "whatsapp",
  "to": "+525527947775",
  "type": "template",
  "template": {
    "name": "kyc_otp",
    "language": { "code": "es_MX" },
    "components": [
      {
        "type": "body",
        "parameters": [{ "type": "text", "text": "123456" }]
      }
    ]
  }
}
```

## Seguridad y rate limits

Aplicar rate limits:

- Por IP: max 10 requests / 15 min.
- Por telefono: max 3 codigos / 15 min.
- Por verificationId: max 5 intentos.

Respuestas recomendadas:

- `400`: telefono invalido, codigo invalido o expirado.
- `429`: demasiados intentos.
- `500`: error interno o proveedor WhatsApp caido.

No devolver informacion como:

- Si el numero esta registrado.
- Cual parte del codigo fallo.
- OTP en logs.

## Integracion con la app actual

La app ya espera exactamente estos endpoints:

- `POST /api/kyc/whatsapp/request-code`
- `POST /api/kyc/whatsapp/verify-code`

Archivo cliente:

- `src/services/kycWhatsappApi.ts`

Campos guardados localmente tras exito:

```json
{
  "phoneWhatsappVerified": "true",
  "phoneWhatsappVerifiedAt": "2026-04-28T01:36:00.000Z",
  "phoneWhatsappVerificationId": "wh_01HX..."
}
```

Campos guardados localmente cuando el proveedor aun no esta configurado:

```json
{
  "phoneWhatsappVerified": "false",
  "phoneWhatsappVerificationStatus": "not_required_until_provider_configured"
}
```

`isKycComplete()` solo requiere `phoneWhatsappVerified === "true"` cuando `EXPO_PUBLIC_KYC_WHATSAPP_REQUIRED=true`. Por default, KYC se completa con datos minimos y biometria para no bloquear el alta mientras faltan keys de Twilio/WhatsApp.

## Checklist de aceptacion

- [ ] `POST /api/kyc/whatsapp/request-code` existe.
- [ ] `POST /api/kyc/whatsapp/verify-code` existe.
- [ ] El backend normaliza telefono a E.164.
- [ ] El OTP expira.
- [ ] El OTP se guarda hasheado o lo gestiona Twilio Verify.
- [ ] Hay rate limit por IP y telefono.
- [ ] El backend no loguea el OTP.
- [ ] La app deja de mostrar `The route POST /api/kyc/whatsapp/request-code does not exist`.
- [ ] KYC solo se completa si `verify-code` devuelve `success: true` cuando `EXPO_PUBLIC_KYC_WHATSAPP_REQUIRED=true`.
