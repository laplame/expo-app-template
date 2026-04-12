/**
 * Direcciones en pantalla: ocultas hasta KYC/KYB; el valor real sigue usándose en QR y lógica.
 */
export function formatAddressForUi(address: string | null | undefined, revealFull: boolean): string {
  if (!address?.trim()) return '';
  const a = address.trim();
  if (revealFull) return a;
  if (a.length < 8) return '••••••••';
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}
