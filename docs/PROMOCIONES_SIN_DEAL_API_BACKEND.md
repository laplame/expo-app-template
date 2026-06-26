# Promociones sin deal vs con deal — cambios requeridos en API (backend)

Documento para alinear **backend** con la app móvil (`UploadPromotionsScreen`) y la web. Describe qué existe hoy, qué falta y qué conviene implementar en Mongo/API.

**Relacionado en repo:**

| Documento | Contenido |
|-----------|-----------|
| [promociones_upload_promo_spec.md](./promociones_upload_promo_spec.md) | Contrato actual `POST /api/promotions` y `analyze-image` |
| [APP_CREAR_PROMOCION_IA.md](./APP_CREAR_PROMOCION_IA.md) | Flujo foto → Gemini → formulario → guardar |
| [promociones_upload_promo.feature](./promociones_upload_promo.feature) | Escenarios BDD upload / quick-upload |
| `assets/docs/upload_promotion.md` | Resumen legacy web |

**Estado app (mayo 2026):**

- Modal inicial: **Sin deal** → flujo actual en app (fotos + formulario + `POST /api/promotions`).
- Modal inicial: **Con deal** → solo redirección a `https://www.damecodigo.com/create-promotion` (sin cambios API en app por ahora).

---

## 1. Objetivo de producto

| Tipo | Origen | Propósito | Canal |
|------|--------|-----------|--------|
| **Sin deal** | App móvil | Validar promociones de **negocios que no están en el ecosistema** (terceros): demostrar que DameCodigo funciona incluso fuera del sistema. Refuerza confianza, lealtad y fidelidad al ecosistema. **No** se convierten en deal con la marca. | `POST /api/promotions` desde app |
| **Con deal** | Web | Promoción **nativa CryptoMarketing / DameCodigo**: contrato, cupón QR, comisión, influencers, settlements. | Wizard web `/create-promotion` |

Hoy la app **no envía** un flag que distinga “sin deal”; el backend trata todo como promoción estándar (`draft` + posible QR/GPS). Eso hay que explicitarlo en modelo y API.

---

## 2. Resumen ejecutivo (qué cambiar)

| **P0** | Campo `promotionKind` / `hasDeal` + `ecosystemNative: false` para sin deal |
| **P0** | **Confianza por umbrales** (`trustTier`: 10 / 100 / N dinámico) — ver §15 |
| **P0** | Sin deal: **publicación automática** (sin cola CRM); disclaimer legal en API y UI |
| **P1** | Reglas: sin deal → sin cupón QR, sin deal contractual, oferta puede cambiar |
| **P1** | `GET /api/promotions` — filtros + campos para mapa/home (badge de confianza, sin canjear) |
| **P2** | Soporte **video** en multipart + evidencia de compra |
| **P2** | CRM super admin: solo moderación excepcional / fraude (no aprobación obligatoria sin deal) |
| **P3** | App envía flags + muestra umbrales de verificación en ficha/mapa |

---

## 3. Modelo de datos sugerido (MongoDB)

### 3.1 Campos nuevos en colección `promotions` (o equivalente)

```ts
/** Canal de alta */
type PromotionSourceChannel = 'mobile_app' | 'web_wizard' | 'web_quick' | 'admin' | 'import';

/** Sin deal = verificación de oferta real; con deal = flujo comercial completo */
type PromotionKind = 'verification_only' | 'with_deal';

type PromotionVerificationStatus =
  | 'auto_published'       // sin deal: entra al feed sin aprobación manual CRM
  | 'pending_review'       // reservado: fraude, reportes, con deal, etc.
  | 'approved'
  | 'rejected'
  | 'not_applicable';      // con deal nativo

/** Nivel de confianza comunitaria (mapa/home) — umbrales configurables */
type PromotionTrustTier = {
  /** Ej. 10, 100, o cualquier N definido en config */
  level: number;
  label?: string;           // "Verificada por 10", "por 100", …
  /** Contador actual que determina el tier alcanzado */
  confirmationCount: number;
  /** Próximo umbral para subir de nivel (null si máximo) */
  nextThreshold?: number | null;
};

interface PromotionExtension {
  promotionKind: PromotionKind;

  /** false = no es nativa del ecosistema / sin contrato con la marca */
  ecosystemNative: boolean;

  sourceChannel: PromotionSourceChannel;

  verificationStatus: PromotionVerificationStatus;

  /** Sin deal: no hay contrato; precios/condiciones pueden cambiar en tienda */
  hasContract: boolean;
  disclaimer?: {
    es: string;
    en: string;
  };

  trust?: PromotionTrustTier;

  verification?: {
    submittedAt?: Date;
    purchaseProof?: { mediaType: 'image' | 'video'; url: string; uploadedAt: Date }[];
  };

  submittedByUserId?: string;
  deviceId?: string;
}
```

### 3.2 Valores por defecto recomendados

| Origen | `promotionKind` | `ecosystemNative` | `hasContract` | `verificationStatus` | Aprobación CRM | QR |
|--------|-----------------|-------------------|---------------|----------------------|----------------|-----|
| App sin deal | `verification_only` | `false` | `false` | `auto_published` | **No** (pasa directo) | **No** |
| Web con deal | `with_deal` | `true` | `true` (si hay deal) | `not_applicable` | Según wizard | Sí |

**Disclaimer por defecto (sin deal)** — persistir y devolver en API:

```json
{
  "disclaimer": {
    "es": "Oferta de tercero sin contrato con CryptoMarketing/DameCodigo. No es promoción nativa del ecosistema. Precios y condiciones pueden cambiar en tienda. Sin cupón ni deal.",
    "en": "Third-party offer with no contract with CryptoMarketing/DameCodigo. Not a native ecosystem promotion. Prices and terms may change in store. No coupon or deal."
  }
}
```

### 3.3 Umbrales de confianza (config global)

Definir en servidor (ej. colección `config` o env):

```json
{
  "promotionTrustThresholds": [10, 100, 500]
}
```

Lógica:

- Cada usuario puede **confirmar** una promo sin deal (nuevo endpoint, §8).
- `confirmationCount` sube; el **tier mostrado** es el mayor umbral ≤ count (ej. count=47 → “Verificada por 10”; count=120 → “Verificada por 100”).
- El último umbral puede ser dinámico (admin añade N en config sin deploy app).

### 3.4 Índices

```js
db.promotions.createIndex({ promotionKind: 1, 'trust.confirmationCount': -1 });
db.promotions.createIndex({ ecosystemNative: 1, status: 1 });
```

---

## 4. `POST /api/promotions` — cambios

### 4.1 Campos nuevos en body (JSON o FormData)

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `promotionKind` | string | Recomendado | `verification_only` \| `with_deal`. Si falta, inferir por heurística (ver §4.3). |
| `hasDeal` | boolean | Alternativa | `true` = con deal; `false` = sin deal. La app puede enviar solo esto. |
| `sourceChannel` | string | Recomendado | `mobile_app` cuando viene de la app. |
| `ecosystemNative` | boolean | Recomendado | `false` para sin deal (no nativa CryptoMarketing). |
| `hasContract` | boolean | Recomendado | `false` para sin deal. |
| `disclaimer` | object | Opcional | Servidor puede inyectar default si falta. |
| `submittedByUserId` | string | No | Si hay JWT de usuario logueado. |

**Compatibilidad:** aceptar alias `promotionMode: 'sin_deal' | 'con_deal'` si el equipo prefiere español en API.

### 4.2 Reglas de negocio en servidor (sin deal)

Cuando `promotionKind === 'verification_only'` (`hasDeal === false`, `ecosystemNative === false`):

1. **No convertir** a `with_deal` ni enlazar wizard de contrato; vida útil = verificación de tercero.
2. Forzar: `redirectInsteadOfQr = false`, sin cupón QR, sin settlements influencer.
3. **Publicación:** `verificationStatus = auto_published`, `status = active` (u `active` equivalente en vuestro enum) **sin** pasar por cola de super admin.
4. `hasContract = false`; adjuntar `disclaimer` por defecto (§3.2).
5. Inicializar `trust.confirmationCount = 0`, `trust.level = 0` hasta primera confirmación.
6. Recompensa 10 LUXAE en app: mantener si `mode === 'database'`.

**Moderación super admin:** solo para **rechazar** / marcar fraude (`verificationStatus = rejected`), no para aprobar cada alta sin deal.

Cuando `promotionKind === 'with_deal'`:

- Flujo actual web; `ecosystemNative = true`, `hasContract` según deal.

### 4.3 Heurística si la app aún no envía flags (transición)

Hasta que la app envíe `hasDeal: false`:

```text
Si sourceChannel === 'mobile_app'
  Y redirectInsteadOfQr !== true
  Y NO existe shortCode / dealId / commission config
  → tratar como verification_only
```

Documentar en código servidor para no romper promos antiguas.

### 4.4 Respuesta 201 — ampliar `data`

```json
{
  "success": true,
  "message": "Promoción creada exitosamente",
  "data": {
    "id": "69a8e15c...",
    "title": "...",
    "status": "draft",
    "promotionKind": "verification_only",
    "ecosystemNative": false,
    "hasContract": false,
    "verificationStatus": "auto_published",
    "hasDeal": false,
    "trust": {
      "level": 0,
      "confirmationCount": 0,
      "nextThreshold": 10,
      "label": "Sin verificaciones aún"
    },
    "disclaimer": { "es": "...", "en": "..." },
    "images": 2
  },
  "mode": "database"
}
```

La app podrá mostrar mensajes según `verificationStatus` (ya muestra texto de “pendiente de verificación”).

### 4.5 Errores nuevos sugeridos

| HTTP | code | Cuándo |
|------|------|--------|
| 400 | `INVALID_PROMOTION_KIND` | Valor no reconocido en `promotionKind` |
| 400 | `VERIFICATION_REQUIRES_MEDIA` | `verification_only` sin imágenes ni video |
| 403 | `DEAL_CREATION_WEB_ONLY` | Cliente app intenta `hasDeal: true` (opcional: forzar web) |

---

## 5. `POST /api/promotions/analyze-image`

Sin cambio obligatorio para fase 1.

**Opcional (P2):** en respuesta `AnalyzeImageData`, añadir:

```ts
suggestedPromotionKind?: 'verification_only' | 'with_deal';
requiresPurchaseProof?: boolean;
```

Para que la IA detecte si la foto parece ticket/factura vs packshot de producto.

---

## 6. `GET /api/promotions` y detalle

### 6.1 Query params nuevos

| Param | Tipo | Uso |
|-------|------|-----|
| `promotionKind` | string | Filtrar `verification_only` \| `with_deal` |
| `hasDeal` | boolean | Atajo |
| `verificationStatus` | string | Cola de moderación |
| `sourceChannel` | string | `mobile_app`, etc. |
| `publicFeed` | boolean | Sin deal: incluir si `ecosystemNative=false` y no `rejected`; con deal: reglas actuales |

### 6.2 Documento en listado — UI mapa/home (sin deal)

Exponer:

```ts
{
  promotionKind: 'verification_only',
  ecosystemNative: false,
  hasContract: false,
  hasDeal: false,
  redeemable: false,          // siempre false para sin deal
  trust: {
    level: 10 | 100 | number, // umbral alcanzado
    confirmationCount: number,
    nextThreshold: number | null,
    label: string             // "Verificada por 10" (i18n servidor o clave + count)
  },
  disclaimer: { es: string; en: string }
}
```

**App:** mostrar badge de confianza por umbrales; **no** botón “Canjear” / “Generar cupón”. Opcional: CTA “Confirmar que la vi” → `POST .../confirm`.

### 6.3 Filtros feed público

```text
Incluir en mapa/home si:
  (hasDeal === true && status === 'active' && reglas cupón actuales)
  OR
  (promotionKind === 'verification_only' && verificationStatus !== 'rejected')
```

No exigir `verificationStatus === 'approved'` ni `status=active` **ambos** para sin deal; basta publicación automática + no rechazada.

---

## 7. Evidencia: foto y video (fase 2)

Producto: verificar promoción con **foto o video de la compra**.

| Cambio API | Detalle |
|------------|---------|
| Multipart | Además de `images` (máx 5), aceptar `videos` (máx 1–2) o campo único `purchaseProof` |
| MIME | `video/mp4`, `video/quicktime`; límite tamaño (ej. 50 MB) |
| Storage | Misma carpeta Cloudinary/S3 con `folder: link4deal/promotions/proof` |
| Modelo | `verification.purchaseProof[]` |
| analyze-image | Opcional: frame extraction + Gemini en thumbnail |

**App (pendiente):** UI para subir video; hoy solo imágenes.

---

## 8. Confirmaciones comunitarias y moderación CRM

### 8.1 Confirmar promo sin deal (nuevo)

| Método | Ruta | Body | Efecto |
|--------|------|------|--------|
| `POST` | `/api/promotions/:id/confirm` | `{ deviceId?, userId? }` | +1 a `trust.confirmationCount`; recalcular `trust.level` según umbrales §3.3 |

Reglas:

- Solo si `promotionKind === 'verification_only'`.
- Un usuario/dispositivo = 1 confirmación (idempotencia por `userId` o `deviceId` en subcolección `confirmations`).
- Respuesta incluye `trust` actualizado para refrescar UI.

### 8.2 Super admin (excepcional)

| Método | Ruta | Uso |
|--------|------|-----|
| `PATCH` | `/api/admin/promotions/:id/verification` | Solo **rechazar** / fraude: `{ action: 'reject', rejectionReason }` |

**No** se requiere endpoint de “aprobar” para altas sin deal normales (ya publican solas).

### 8.3 Config umbrales (super admin)

| Método | Ruta | Body |
|--------|------|------|
| `GET` | `/api/admin/config/promotion-trust-thresholds` | — |
| `PUT` | `/api/admin/config/promotion-trust-thresholds` | `{ thresholds: [10, 100, 250, 1000] }` |

Colección auxiliar sugerida: `promotion_confirmations` `{ promotionId, userId?, deviceId, createdAt }`.

---

## 9. Cupones QR y influencers (sin deal)

Promociones **sin deal** no deben:

- Aparecer en flujos `POST /api/discount-qr/codes/:code/issue` como campaña con comisión.
- Crear settlements en `influencer_token_settlements` por canjes de esa promo.

Validación en `discount-qr` controller:

```text
if promotion.promotionKind === 'verification_only' && !promotion.hasDeal
  → 403 PROMOTION_NOT_REDEEMABLE
```

---

## 10. Cambios en la app (después del backend P0)

Para cerrar el circuito, en `src/services/promotionsApi.ts` / `buildPayload`:

```ts
// Ejemplo cuando el usuario eligió "Sin deal" en modal
{
  hasDeal: false,
  promotionKind: 'verification_only',
  sourceChannel: 'mobile_app',
  status: 'draft',
  redirectInsteadOfQr: false,
  // no redirectToUrl
}
```

Archivo de referencia: `src/components/UploadPromotionDealChoiceModal.tsx`, estado `uploadDealMode === 'sin_deal'`.

---

## 11. Checklist implementación backend

### Fase 1 — Mínimo viable

- [ ] Campos `promotionKind`, `hasDeal`, `ecosystemNative`, `hasContract`, `disclaimer`, `trust`
- [ ] Sin deal → `auto_published` + `active` sin cola CRM
- [ ] `POST /confirm` + umbrales configurables `[10, 100, N…]`
- [ ] GET listado con `trust`, `redeemable: false`, `disclaimer`
- [ ] Bloquear cupón QR / discount-qr para sin deal

### Fase 2 — Evidencia

- [ ] Video / purchaseProof
- [ ] CRM: solo reject + editar umbrales

### Fase 3 — App

- [ ] Flags en `buildPayload` sin deal
- [ ] UI umbrales en mapa/home + botón confirmar
- [ ] Sin botón canjear en sin deal

---

## 12. Qué **no** requiere cambio API ahora

| Item | Motivo |
|------|--------|
| Flujo **con deal** en app | Redirige a web; sigue usando APIs web existentes |
| `POST /api/influencers/app/*` | Independiente del upload de promos |
| Analyze-image prompt | Funciona igual; mejoras opcionales |

---

## 13. Ejemplo curl (contrato objetivo)

```bash
curl -sS -X POST "https://www.damecodigo.com/api/promotions" \
  -H "Accept: application/json" \
  -F "title=2x1 hamburguesa Local X" \
  -F "hasDeal=false" \
  -F "promotionKind=verification_only" \
  -F "sourceChannel=mobile_app" \
  -F "category=food" \
  -F "originalPrice=120" \
  -F "currentPrice=60" \
  -F "currency=MXN" \
  -F "status=draft" \
  -F "redirectInsteadOfQr=false" \
  -F "images=@ticket.jpg"
```

  -F "redirectInsteadOfQr=false" \
  -F "ecosystemNative=false" \
  -F "hasContract=false" \
  -F "images=@ticket.jpg"
```

Respuesta esperada: `verificationStatus: "auto_published"`, `trust.confirmationCount: 0`, `disclaimer` incluido.

---

## 14. Decisiones de producto (cerradas)

Respuestas acordadas — base para implementar API y app.

### 14.1 ¿Convertir sin deal → con deal?

**No.** Las promociones sin deal validan ofertas de **negocios ajenos al ecosistema** (terceros). Sirven para demostrar que la plataforma funciona **incluso sin** que el negocio esté dado de alta ni tenga deal. Refuerzan confianza, lealtad y fidelidad al ecosistema. **No** se migran a promoción con deal ni contrato con la marca.

### 14.2 ¿Cómo se muestran en mapa/home?

Sí aparecen en mapa/home, **sin botón de canjear**.

Se muestra un **nivel de confianza por umbrales** acumulativos:

- “Verificada por **10**”
- “Verificada por **100**”
- “Verificada por **N**” (N configurable en servidor de forma dinámica)

Cada confirmación de usuario sube el contador; el badge refleja el umbral alcanzado (ver §3.3 y `POST .../confirm`).

### 14.3 ¿Quién aprueba?

- **Super admin:** solo para casos excepcionales (rechazo, fraude, ajuste de umbrales).
- **Sin deal:** pasan **directo** a publicación (`auto_published`); **no** requieren aprobación manual.
- Debe quedar explícito en API y UI que **no son promociones nativas de CryptoMarketing** (`ecosystemNative: false` + `disclaimer`).

### 14.4 ¿`status=active` y `verificationStatus=approved`?

**No** son ambos obligatorios para publicar sin deal.

Debe quedar claro en ficha y API:

- **No hay contrato** (`hasContract: false`).
- La oferta **puede cambiar** en tienda (sin deal fijo con la marca).
- Sin cupón ni compromiso comercial del ecosistema.

---

*Última actualización: decisiones de producto §14 incorporadas (umbrales 10/100/N, auto-publicación sin deal, no nativas CryptoMarketing).*
