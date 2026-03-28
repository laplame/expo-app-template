/** Tiendas departamentales y supermercados cercanos (mock inicial). */
export interface NearbyStore {
  id: string;
  name: string;
  nameEs: string;
  type: 'department' | 'supermarket';
  address: string;
  addressEs: string;
  latitude: number;
  longitude: number;
}

/** Datos base: coordenadas relativas a CDMX centro. En producción podrías usar Google Places API. */
const CDMX_CENTER = { lat: 19.4326, lng: -99.1332 };

const STORES_BASE: Omit<NearbyStore, 'latitude' | 'longitude'>[] = [
  { id: '1', name: 'Liverpool', nameEs: 'Liverpool', type: 'department', address: 'Av. Insurgentes Sur 1458', addressEs: 'Av. Insurgentes Sur 1458' },
  { id: '2', name: 'Walmart', nameEs: 'Walmart', type: 'supermarket', address: 'Av. Universidad 1000', addressEs: 'Av. Universidad 1000' },
  { id: '3', name: 'Soriana', nameEs: 'Soriana', type: 'supermarket', address: 'Av. División del Norte 2560', addressEs: 'Av. División del Norte 2560' },
  { id: '4', name: 'Chedraui', nameEs: 'Chedraui', type: 'supermarket', address: 'Av. Tlahuac 2200', addressEs: 'Av. Tlahuac 2200' },
  { id: '5', name: 'Palacio de Hierro', nameEs: 'Palacio de Hierro', type: 'department', address: 'Av. Masaryk 111', addressEs: 'Av. Masaryk 111' },
  { id: '6', name: 'Bodega Aurrera', nameEs: 'Bodega Aurrera', type: 'supermarket', address: 'Av. Central 500', addressEs: 'Av. Central 500' },
  { id: '7', name: 'Sanborns', nameEs: 'Sanborns', type: 'department', address: 'Av. Reforma 222', addressEs: 'Av. Reforma 222' },
  { id: '8', name: 'Sears', nameEs: 'Sears', type: 'department', address: 'Av. Juárez 42', addressEs: 'Av. Juárez 42' },
];

/** Offsets en grados (~0.01 ≈ 1 km) para simular ubicaciones cercanas */
const OFFSETS: [number, number][] = [
  [0.008, 0.012],
  [-0.006, -0.004],
  [0.012, 0.002],
  [-0.004, 0.014],
  [0.002, -0.010],
  [0.015, -0.006],
  [-0.008, -0.012],
  [0.005, 0.008],
];

export const MOCK_NEARBY_STORES: NearbyStore[] = STORES_BASE.map((s, i) => {
  const [dLat, dLng] = OFFSETS[i % OFFSETS.length];
  return {
    ...s,
    latitude: CDMX_CENTER.lat + dLat,
    longitude: CDMX_CENTER.lng + dLng,
  };
});

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Ordena tiendas por distancia al usuario y devuelve las más cercanas */
export function getStoresNearUser(
  userLat: number | null,
  userLng: number | null,
  limit = 8
): (NearbyStore & { distanceKm: number })[] {
  const center = userLat != null && userLng != null ? { lat: userLat, lng: userLng } : CDMX_CENTER;
  const withDist = MOCK_NEARBY_STORES.map((s) => ({
    ...s,
    distanceKm: haversineKm(center.lat, center.lng, s.latitude, s.longitude),
  }));
  withDist.sort((a, b) => a.distanceKm - b.distanceKm);
  return withDist.slice(0, limit);
}
