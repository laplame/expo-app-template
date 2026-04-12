import { nip19 } from 'nostr-tools';
import { DEFAULT_NOSTR_RELAYS } from './nostrRelays';

/** Código para QR: nprofile con relays por defecto (mejor que solo npub para amigos). */
export function encodeNprofileQrPayload(pubkeyHex: string): string {
  const pk = pubkeyHex.replace(/^0x/i, '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(pk)) return '';
  return nip19.nprofileEncode({
    pubkey: pk,
    relays: DEFAULT_NOSTR_RELAYS.slice(0, 4),
  });
}
