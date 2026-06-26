# App: autenticación por roles y verificación de dashboards

Guía para probar los **cuatro roles efectivos** en la app móvil: `user`, `influencer`, `business` y `superuser`.

Relacionado: [APP_INFLUENCER_AUTH.md](./APP_INFLUENCER_AUTH.md)

---

## 1. Roles y permisos

| Rol efectivo | `primaryRole` / `profileTypes` API | Dashboard por defecto tras login |
|--------------|-----------------------------------|----------------------------------|
| **user** | `primaryRole: user` | `UserDashboard` |
| **influencer** | `primaryRole: influencer` | `InfluencerDashboard` |
| **business** | `primaryRole: business` o `profileTypes` con `merchant` | `BusinessDashboard` |
| **superuser** | `profileTypes` incluye `superuser` / `admin`, o `isSuperuser: true` | `SuperuserDashboard` |

### Matriz de acceso (menú y pantallas)

| Recurso | user | influencer | business | superuser |
|---------|:----:|:----------:|:--------:|:---------:|
| Inicio / Cupones | ✓ | ✓ | ✓ | ✓ |
| Billetera | ✓ | ✓ | ✓ | ✓ |
| NYC (KYC) | ✓ | ✓ | — | ✓ |
| KYB (negocio) | — | — | ✓ | ✓ |
| Subir promoción | — | — | ✓ | ✓ |
| Panel influencer | — | ✓ | — | ✓ |
| Monetización | — | ✓ | — | ✓ |
| Influencers y votar | ✓ | ✓ | — | ✓ |
| Mapa promociones | ✓ | ✓ | ✓ | ✓ |
| CRM `/admin/crm` | — | — | — | ✓ |

Implementación: `src/types/authRoles.ts`, `src/context/AuthContext.tsx`, `src/navigation/drawerNavConfig.ts`.

---

## 2. Modo desarrollo (cuentas de prueba)

En `.env`:

```bash
EXPO_PUBLIC_AUTH_DEV_MODE=true
```

Reinicia Metro (`npm start`) tras cambiar `.env`.

### Cuentas de prueba

| Rol | Email | Contraseña | Panel tras login |
|-----|-------|------------|------------------|
| Usuario | `test.user@damecodigo.dev` | `TestUser2026!` | Panel usuario |
| Influencer | `test.influencer@damecodigo.dev` | `TestInfluencer2026!` | Panel influencer |
| Negocio | `test.business@damecodigo.dev` | `TestBusiness2026!` | Panel negocio |
| Superusuario | `test.superuser@damecodigo.dev` | `TestSuper2026!` | Panel superusuario |

Definidas en `src/config/authTestUsers.ts`.

Con dev mode, el JWT es local (`dev.{userId}.{timestamp}`) y **no** llama al API para login. El panel influencer contra API real requiere además perfil vinculado en backend (`POST /api/influencers/app/verify-session`).

---

## 3. Escenarios de verificación manual

### Escenario A — Usuario consumidor

1. Menú → **Iniciar sesión** → cuenta `test.user@damecodigo.dev`.
2. Debe abrir **Panel usuario** con saldo LUXAE y estado KYC.
3. Menú debe mostrar: Inicio, Cupones, Wallet, NYC, Influencers; **no** Subir promoción ni Panel negocio.
4. Tocar **Subir promoción** (si se navega por deep link): pantalla “Acceso restringido”.
5. Cerrar sesión desde el panel.

### Escenario B — Influencer

1. Login con `test.influencer@damecodigo.dev`.
2. Debe abrir **Panel influencer** (`InfluencerIdentityScreen`).
3. Menú: Panel influencer, Monetización visibles; **no** Subir promoción.
4. Monetización muestra el panel embebido (no solo WebView de registro).
5. Sin perfil API vinculado: estados `needsAuth` / `notLinked` / `pendingVerification` según respuesta del servidor.

### Escenario C — Negocio

1. Login con `test.business@damecodigo.dev`.
2. Debe abrir **Panel negocio** con bloque KYB.
3. Menú: Subir promoción, Panel negocio; **no** Panel influencer ni NYC obligatorio.
4. **Subir promoción** abre el flujo completo (sin `RoleGate` bloqueando).
5. En dev mode: botón “Marcar KYB demo” alterna verificación KYB local.

### Escenario D — Superusuario

1. Login con `test.superuser@damecodigo.dev`.
2. Debe abrir **Panel superusuario** con lista de permisos y enlace CRM.
3. Menú: todos los paneles + Subir promoción + Monetización.
4. Desde superuser panel, navegar a cada sub-dashboard (user / influencer / business).
5. “Abrir CRM web” abre `{SITE}/admin/crm`.

### Escenario E — Invitado (sin login)

1. Sin sesión: menú muestra **Iniciar sesión** y rutas de usuario (inicio, wallet, KYC).
2. **No** aparecen Panel negocio, Panel influencer, Panel superusuario, Subir promoción.

### Escenario F — API real (producción)

1. `EXPO_PUBLIC_AUTH_DEV_MODE=false`.
2. `POST /api/auth/login` con credenciales reales.
3. `GET /api/auth/me` debe devolver `primaryRole` y/o `profileTypes`.
4. Influencer: verificar `verify-session` y `dashboardAccess` según [APP_INFLUENCER_IDENTITY_AND_STORY_CARDS.md](./APP_INFLUENCER_IDENTITY_AND_STORY_CARDS.md).

---

## 4. Verificación automática (matriz)

```bash
node scripts/verify-auth-roles.mjs
```

Comprueba la matriz de permisos y que existan las cuatro cuentas de prueba.

---

## 5. Información requerida por rol

| Rol | Datos / APIs | Pantallas clave |
|-----|--------------|-----------------|
| **user** | KYC local (`NYCScreen`), wallet LUXAE, promociones (`GET /api/promotions`) | `UserDashboard`, `Home`, `Wallet`, `NYC` |
| **influencer** | JWT + `GET /api/influencers/me`, `POST verify-session`, campañas, settlements | `InfluencerDashboard`, `Monetization` |
| **business** | KYB (`setKybVerified`), `POST /api/promotions` (sin deal) | `BusinessDashboard`, `UploadPromotions` |
| **superuser** | Mismos JWT + CRM web | `SuperuserDashboard`, acceso a todos los anteriores |

---

## 6. Archivos tocados

| Pieza | Archivo |
|-------|---------|
| Tipos y permisos | `src/types/authRoles.ts` |
| Sesión JWT | `src/context/AuthContext.tsx` |
| Login in-app | `src/screens/LoginScreen.tsx` |
| Dashboards | `UserDashboardScreen`, `InfluencerDashboardScreen`, `BusinessDashboardScreen`, `SuperuserDashboardScreen` |
| Gate por rol | `src/components/RoleGate.tsx` |
| Menú drawer | `src/navigation/drawerNavConfig.ts`, `CustomDrawerContent.tsx` |
| Cuentas dev | `src/config/authTestUsers.ts` |

---

## 7. Checklist QA

- [ ] `EXPO_PUBLIC_AUTH_DEV_MODE=true` y login con las 4 cuentas
- [ ] Cada rol abre su dashboard por defecto
- [ ] Menú filtrado según rol (Escenarios A–E)
- [ ] `node scripts/verify-auth-roles.mjs` → OK
- [ ] Influencer con API real: campañas tras `dashboardAccess: true`
- [ ] Business: upload promoción sin deal funcional
- [ ] Superuser: enlace CRM y acceso a todos los paneles
