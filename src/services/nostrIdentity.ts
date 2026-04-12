import * as SecureStore from 'expo-secure-store';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';

const SECRET_KEY = 'link4deal_nostr_sk_hex';

function bytesToHex(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i]!.toString(16).padStart(2, '0');
  }
  return s;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, '');
  if (clean.length % 2 !== 0) throw new Error('INVALID_HEX');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function getOrCreateNostrSecretKey(): Promise<Uint8Array> {
  const existing = await SecureStore.getItemAsync(SECRET_KEY);
  if (existing && /^[0-9a-f]{64}$/i.test(existing)) {
    return hexToBytes(existing);
  }
  const sk = generateSecretKey();
  await SecureStore.setItemAsync(SECRET_KEY, bytesToHex(sk));
  return sk;
}

export function publicKeyHexFromSecret(secretKey: Uint8Array): string {
  return getPublicKey(secretKey);
}

export function npubFromSecret(secretKey: Uint8Array): string {
  return nip19.npubEncode(getPublicKey(secretKey));
}

export function nsecFromSecret(secretKey: Uint8Array): string {
  return nip19.nsecEncode(secretKey);
}
