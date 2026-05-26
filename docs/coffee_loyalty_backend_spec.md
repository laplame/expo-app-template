# Programa de lealtad de cafe - Especificacion Backend

## Objetivo

Implementar el programa **10 cafes = 1 gratis** para el cafe preferido del usuario, seleccionado en la seccion **Configuracion** de la app.

La app movil debe poder:

1. Recuperar el estado del contador de cafes por dispositivo y cafe.
2. Registrar eventos/transacciones del contador cuando el usuario muestra el QR del cafe.
3. Enviar detalle suficiente para auditar: dispositivo, cafe, ubicacion, QR, conteo previo y timestamp.

Base URL:

```text
https://www.damecodigo.com/api
```

## Endpoints requeridos

### 1. Recuperar estado del contador

```http
GET /api/loyalty/coffee?deviceId={deviceId}&cafeId={cafeId}
Accept: application/json
```

#### Query params

| Campo | Tipo | Requerido | Descripcion |
| --- | --- | --- | --- |
| `deviceId` | string | Si | ID unico del dispositivo generado por la app. |
| `cafeId` | string | Si | ID del cafe preferido seleccionado en Configuracion. |

#### Respuesta exitosa

```json
{
  "success": true,
  "data": {
    "programId": "coffee",
    "deviceId": "device_abc",
    "cafeId": "chalino-cafeteria-pugibet-82",
    "punches": 4,
    "threshold": 10,
    "freeCoffeesAvailable": 0,
    "lastTransactionAt": "2026-04-28T03:00:00.000Z",
    "transactions": []
  }
}
```

### 2. Registrar transaccion de cafe

```http
POST /api/loyalty/coffee/transactions
Content-Type: application/json
Accept: application/json
```

#### Body

```json
{
  "deviceId": "device_abc",
  "userName": "Cliente Demo",
  "cafeId": "chalino-cafeteria-pugibet-82",
  "cafeName": "Chalino Cafeteria",
  "cafeNameEs": "Chalino Cafeteria",
  "transactionId": "coffee-device_abc-chalino-cafeteria-pugibet-82-29300000",
  "transactionType": "qr_presented",
  "punchesBefore": 4,
  "threshold": 10,
  "qrValue": "LINK4DEAL-COFFEE-device_abc-chalino-cafeteria-pugibet-82-29300000-user-4",
  "occurredAt": "2026-04-28T03:00:00.000Z",
  "location": {
    "id": "chalino-cafeteria-pugibet-82",
    "name": "Chalino Cafeteria",
    "nameEs": "Chalino Cafeteria",
    "address": "Ernesto Pugibet 82 - Local M, Centro, Cuauhtemoc, CDMX 06070",
    "addressEs": "Ernesto Pugibet 82 - Local M, Centro, Cuauhtemoc, CDMX 06070",
    "latitude": 19.4300062,
    "longitude": -99.1468343,
    "type": "coffee"
  },
  "metadata": {
    "source": "home_coffee_card",
    "appSection": "10_coffees_1_free"
  }
}
```

#### `transactionType`

| Valor | Uso |
| --- | --- |
| `qr_presented` | La app mostro el QR del programa en el cafe preferido. No necesariamente suma cafe hasta que negocio lo confirme. |
| `purchase_confirmed` | El backend o lector del negocio confirma una compra valida y suma un punch. |
| `free_coffee_redeemed` | El usuario redime un cafe gratis y el backend descuenta 10 punches o reduce `freeCoffeesAvailable`. |

#### Respuesta exitosa

```json
{
  "success": true,
  "data": {
    "programId": "coffee",
    "deviceId": "device_abc",
    "cafeId": "chalino-cafeteria-pugibet-82",
    "transactionId": "coffee-device_abc-chalino-cafeteria-pugibet-82-29300000",
    "punches": 5,
    "threshold": 10,
    "freeCoffeesAvailable": 0,
    "createdAt": "2026-04-28T03:00:00.000Z"
  }
}
```

## Modelo sugerido

### `CoffeeLoyaltyAccount`

```ts
type CoffeeLoyaltyAccount = {
  deviceId: string;
  cafeId: string;
  programId: 'coffee';
  punches: number;
  threshold: number;
  freeCoffeesAvailable: number;
  cafeSnapshot: {
    name: string;
    nameEs?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  createdAt: Date;
  updatedAt: Date;
};
```

Indice unico recomendado:

```js
{ deviceId: 1, cafeId: 1, programId: 1 }
```

### `CoffeeLoyaltyTransaction`

```ts
type CoffeeLoyaltyTransaction = {
  transactionId: string;
  deviceId: string;
  cafeId: string;
  programId: 'coffee';
  transactionType: 'qr_presented' | 'purchase_confirmed' | 'free_coffee_redeemed';
  punchesBefore: number;
  punchesAfter: number;
  threshold: number;
  qrValue?: string;
  occurredAt: Date;
  location: {
    id: string;
    name: string;
    nameEs?: string;
    address?: string;
    addressEs?: string;
    latitude?: number;
    longitude?: number;
    type?: string;
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
};
```

Indice unico recomendado:

```js
{ transactionId: 1 }
```

## Reglas de negocio

- El contador se agrupa por `deviceId + cafeId`.
- El cafe valido es el cafe preferido guardado en Configuracion.
- `threshold` debe ser `10`.
- `qr_presented` puede registrar auditoria sin incrementar contador si el negocio aun no confirmo compra.
- `purchase_confirmed` incrementa `punches` en 1.
- Cuando `punches >= 10`, el backend puede:
  - incrementar `freeCoffeesAvailable`, y
  - reiniciar `punches` a `punches - 10`.
- `free_coffee_redeemed` consume un cafe gratis disponible.
- `transactionId` debe ser idempotente para evitar doble conteo por reintentos de red.

## Integracion app movil

Archivo cliente:

- `src/services/loyaltyApi.ts`

Pantalla:

- `src/screens/HomeScreen.tsx`

Flujo:

1. App carga `deviceId`.
2. App lee el cafe preferido desde `getPreferredMall()`.
3. App llama `GET /api/loyalty/coffee`.
4. Al tocar el QR de cafe, app llama `POST /api/loyalty/coffee/transactions` con `transactionType: "qr_presented"`.
5. App muestra el QR `LINK4DEAL-COFFEE...` para que el negocio lo lea.

## Checklist de aceptacion

- [ ] `GET /api/loyalty/coffee` recupera contador por `deviceId` y `cafeId`.
- [ ] `POST /api/loyalty/coffee/transactions` acepta transacciones idempotentes.
- [ ] El backend guarda snapshot de cafe y ubicacion.
- [ ] El backend no duplica punches con el mismo `transactionId`.
- [ ] El contador llega a 10 y genera un cafe gratis.
- [ ] El cafe gratis puede redimirse con una transaccion `free_coffee_redeemed`.
