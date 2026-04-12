import { nip19 } from 'nostr-tools';

/** Resolves npub / hex pubkey / nprofile… to 64-char hex pubkey, or null. */
export function parseFollowPubkey(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  if (/^[a-f0-9]{64}$/i.test(t)) return t.toLowerCase();
  try {
    const d = nip19.decode(t);
    if (d.type === 'npub') return d.data;
    if (d.type === 'nprofile') return d.data.pubkey;
  } catch {
    return null;
  }
  return null;
}

/** Contenido típico de un QR (texto plano, `nostr:…`, URL con npub). */
export function parseNostrPubkeyFromQrPayload(data: string): string | null {
  const raw = data.trim();
  if (!raw) return null;
  const direct = parseFollowPubkey(raw);
  if (direct) return direct;
  const nostrPart = raw.toLowerCase().startsWith('nostr:')
    ? raw.slice('nostr:'.length).trim()
    : raw;
  try {
    const d = nip19.decode(nostrPart);
    if (d.type === 'npub') return d.data;
    if (d.type === 'nprofile') return d.data.pubkey;
  } catch {
    // ignore
  }
  const npubInUrl = raw.match(/npub1[a-z0-9]+/i);
  if (npubInUrl) return parseFollowPubkey(npubInUrl[0]);
  return null;
}

