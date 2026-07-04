# Backlog de gaps — soluciones para versiones futuras

Gaps detectados en la revisión de las pantallas Inicio / Cupones / Tienda.
Cada item incluye contexto técnico, impacto actual y propuesta de solución.

---

## GAP-01 · `hasActiveOrder` hardcodeado — sin API de pedidos

**Pantalla:** `HomeScreen` ([src/screens/HomeScreen.tsx:806](../src/screens/HomeScreen.tsx))

**Situación actual**
```ts
const hasActiveOrder = true;   // línea 806
```
El banner de "relax, ya estamos procesando tu pedido" siempre se muestra, sin importar si el usuario tiene o no un pedido activo. No hay ninguna llamada a API de órdenes.

**Impacto**
- UX engañosa: usuarios sin pedidos ven el banner.
- El flujo de "Pedir" en `MallOrderScreen` tampoco envía pedidos, por lo que los datos no existen en backend.

**Solución propuesta**
1. Crear endpoint `GET /api/orders/active?deviceId=` (o `userId=`) que devuelva:
   ```ts
   { hasActive: boolean; order?: { id, storeId, items, status, estimatedAt } }
   ```
2. En `HomeScreen`, reemplazar el hardcode por:
   ```ts
   const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
   // useFocusEffect → fetchActiveOrder(deviceId)
   ```
3. Mostrar el banner solo si `activeOrder !== null`.
4. En `MallOrderScreen`, el botón "Pedir" debe llamar `POST /api/orders` con `{ storeId, items: cartItems }`.

**Archivos a tocar**
- `src/screens/HomeScreen.tsx` — state + fetch
- `src/screens/MallOrderScreen.tsx` — `onPress` del botón Pedir
- `src/services/ordersApi.ts` — nuevo servicio (crear)
- Backend — nuevo endpoint de órdenes

**Prioridad:** Media — cosmética ahora, bloqueante cuando se implemente el flujo real de pedidos.

---

## GAP-02 · Sección "Recomendaciones para ti" — placeholder sin datos

**Pantalla:** `HomeScreen` ([src/screens/HomeScreen.tsx:1196](../src/screens/HomeScreen.tsx))

**Situación actual**
```tsx
<Text fontSize="$sm" color="$textLight500" textAlign="center">
  {t.noRecommendations}
</Text>
```
El bloque siempre muestra el mensaje vacío. No hay ninguna fuente de datos conectada.

**Impacto**
- Sección muerta que ocupa espacio sin valor para el usuario.
- Oportunidad perdida de aumentar conversión en cupones.

**Solución propuesta — opción A (servidor)**
1. Endpoint `GET /api/recommendations?deviceId=&limit=4` que devuelva `ApiPromotionDoc[]` ordenados por relevancia (categoría KYC, historial de redenciones, proximidad).
2. En `HomeScreen`, añadir state `recommendations: ApiPromotionDoc[]` y renderizar con el mismo `PromotionCard` ya usado en la sección de cupones.

**Solución propuesta — opción B (local, sin backend nuevo)**
1. Filtrar `specialProducts` ya cargadas: mostrar las 4 con mayor `discountPercentage` que no sean GPS-required (más fáciles de redimir).
2. Implementación sin nueva llamada de red:
   ```ts
   const recommendations = useMemo(() =>
     specialProducts.filter(p => !isInStoreGpsCoupon(p))
       .sort((a, b) => (b.discountPercentage ?? 0) - (a.discountPercentage ?? 0))
       .slice(0, 4),
     [specialProducts]
   );
   ```

**Archivos a tocar**
- `src/screens/HomeScreen.tsx` — estado + lógica de filtro o fetch
- _(opcional)_ `src/services/recommendationsApi.ts` — nuevo servicio (opción A)

**Prioridad:** Baja — es una mejora de producto, no un error.

---

## GAP-03 · Botón "Pedir" en Tienda sin `onPress`

**Pantalla:** `MallOrderScreen` ([src/screens/MallOrderScreen.tsx:259](../src/screens/MallOrderScreen.tsx))

**Situación actual**
```tsx
<Pressable bg={brand} borderRadius="$lg" px="$4" py="$3" alignSelf="flex-start" opacity={mainStore ? 1 : 0.6}>
  {/* Sin onPress */}
</Pressable>
```
El botón no hace nada al tocarlo.

**Impacto**
- UX rota: el usuario puede creer que la app no responde.
- El carrito de despensa se guarda localmente pero nunca se envía.

**Solución propuesta**
1. Conectar con el endpoint de órdenes del GAP-01.
2. Al tocar "Pedir":
   ```ts
   onPress={async () => {
     if (!mainStore || Object.keys(cartItems).length === 0) return;
     const res = await createOrder({ storeId: mainStore.id, items: cartItems });
     if (res.ok) {
       Alert.alert('Pedido enviado', `Tu orden #${res.orderId} está en proceso.`);
       setCartItems({});
       saveCart(mainStore.id, {});
     }
   }}
   ```
3. Mientras no exista la API, como paso intermedio mostrar un `Alert` informativo o abrir WhatsApp de la tienda si `store.whatsapp` está disponible:
   ```ts
   if (mainStore.whatsapp) {
     Linking.openURL(`https://wa.me/${mainStore.whatsapp}?text=...`);
   }
   ```

**Archivos a tocar**
- `src/screens/MallOrderScreen.tsx` — agregar `onPress`
- `src/services/ordersApi.ts` — compartido con GAP-01

**Prioridad:** Alta — botón roto visible para todos los usuarios.

---

## GAP-04 · `nearbyStores` con coordenadas CDMX hardcodeadas

**Pantalla:** `MallOrderScreen`, `PromotionsMapScreen`
**Archivo de datos:** [src/data/nearbyStores.ts](../src/data/nearbyStores.ts)

**Situación actual**
```ts
export const CDMX_CENTER = { lat: 19.4326, lng: -99.1332 };

const STORES_BASE = [
  { id: '1', name: 'Liverpool', ... },
  { id: '2', name: 'Walmart', ... },
  // ... 12 tiendas fijas en CDMX
];
```
Las coordenadas son estáticas y estimadas manualmente alrededor del centro de Ciudad de México.

**Impacto**
- Usuarios fuera de CDMX ven tiendas que no existen cerca de ellos.
- Las distancias calculadas son incorrectas para cualquier otra ciudad.
- `PromotionsMapScreen` mezcla estas tiendas mock con los resultados reales de la API.

**Solución propuesta — Fase 1 (corto plazo)**
1. Reemplazar los datos mock por una fuente semi-dinámica: endpoint propio `GET /api/stores/nearby?lat=&lng=&radius=20` que consulte una colección MongoDB de tiendas registradas.
2. Mantener `MOCK_NEARBY_STORES` como fallback si no hay conexión o el endpoint falla.

**Solución propuesta — Fase 2 (largo plazo)**
1. Integrar Google Places API o Foursquare/Yelp para descubrimiento real de tiendas.
2. Cachear resultados con TTL de 24h en AsyncStorage para reducir llamadas.
3. En `nearbyStores.ts`, exportar `getStoresNearUser` como función async que llama a la API y cae al mock:
   ```ts
   export async function getStoresNearUser(lat, lng, max): Promise<NearbyStore[]> {
     const res = await fetch(`/api/stores/nearby?lat=${lat}&lng=${lng}`);
     if (res.ok) return res.json();
     return MOCK_NEARBY_STORES;  // fallback
   }
   ```

**Archivos a tocar**
- `src/data/nearbyStores.ts` — convertir función a async con fetch
- `src/screens/MallOrderScreen.tsx` — await para nearbyStores
- `src/screens/PromotionsMapScreen.tsx` — await para nearbyStores
- Backend — nuevo endpoint `/api/stores/nearby`

**Prioridad:** Media — funcional en CDMX, inútil en otras ciudades.

---

## GAP-05 · `EXPO_PUBLIC_AUTH_DEV_MODE` ausente en `.env`

**Archivo afectado:** `.env` (raíz del proyecto)
**Config:** [src/config/authTestUsers.ts](../src/config/authTestUsers.ts)

**Situación actual**
El `.env` activo no incluye la variable:
```bash
# Falta en .env
EXPO_PUBLIC_AUTH_DEV_MODE=true
```
La función `isAuthDevModeEnabled()` devuelve `false`, así que:
- El panel de cuentas de prueba no aparece en `LoginScreen`.
- Solo funciona el login real contra la API de producción.
- No es posible probar los 4 roles sin credenciales reales.

**Impacto**
- Desarrollo y QA sin acceso a cuentas de prueba.
- Riesgo de probar flujos con datos reales de producción.

**Solución inmediata**
Agregar al `.env`:
```bash
EXPO_PUBLIC_AUTH_DEV_MODE=true
```
Reiniciar Metro después: `npm start -- --reset-cache`.

**Solución a largo plazo**
1. Crear `.env.development` con `EXPO_PUBLIC_AUTH_DEV_MODE=true` y `.env.production` sin ella.
2. En `app.config.js` / `app.json` (Expo), seleccionar el archivo según el perfil de build:
   ```js
   // app.config.js
   export default ({ config }) => ({
     ...config,
     extra: {
       authDevMode: process.env.EXPO_PUBLIC_AUTH_DEV_MODE === 'true',
     },
   });
   ```
3. Documentar en `README.md` que el `.env.development` se requiere para desarrollo local.
4. Agregar `.env.development.example` al repo con la variable ya incluida.

**Archivos a tocar**
- `.env` — agregar variable (inmediato)
- `.env.development.example` — crear (largo plazo)
- `README.md` o `CONTRIBUTING.md` — documentar requisito

**Prioridad:** Alta — bloquea desarrollo y QA de roles.

---

## Resumen de prioridades

| # | Gap | Prioridad | Esfuerzo |
|---|-----|-----------|----------|
| GAP-05 | `AUTH_DEV_MODE` ausente | 🔴 Alta | 5 min |
| GAP-03 | Botón "Pedir" sin acción | 🔴 Alta | 2–4 h |
| GAP-01 | `hasActiveOrder` hardcodeado | 🟡 Media | 1–2 días |
| GAP-04 | Tiendas CDMX estáticas | 🟡 Media | 2–3 días |
| GAP-02 | Recomendaciones placeholder | 🟢 Baja | 4 h (opción B) / 2 días (opción A) |
