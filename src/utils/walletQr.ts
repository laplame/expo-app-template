import type { WalletAddressItem } from '../services/storage';

export function pickDefaultWalletAddress(list: WalletAddressItem[]): string | null {
  if (!list?.length) return null;
  const def = list.find((w) => w.isDefault);
  if (def) return def.address;
  const poly = list.find((w) => w.chain === 'polygon');
  if (poly) return poly.address;
  return list[0].address;
}

/** QR identificación / pago: modo PAY incluye importe en payload cuando aplica. */
export function buildIdentificationQr(
  intent: 'pay' | 'receive',
  address: string | null,
  uid: string,
  deviceId: string,
  amountLuxae?: number | null
): string {
  const mode = intent === 'pay' ? 'PAY' : 'RECEIVE';
  if (address) {
    if (intent === 'pay' && amountLuxae != null && amountLuxae > 0 && Number.isFinite(amountLuxae)) {
      return `LINK4DEAL:${mode}:${address}:${uid || 'user'}:${deviceId || 'device'}:AMT:${amountLuxae}`;
    }
    return `LINK4DEAL:${mode}:${address}:${uid || 'user'}:${deviceId || 'device'}`;
  }
  return `LINK4DEAL-USER.${uid || 'user'}.${deviceId || 'device'}`;
}
