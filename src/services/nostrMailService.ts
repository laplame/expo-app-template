import { nip05, nip59, type Event } from 'nostr-tools';
import type { SimplePool } from 'nostr-tools';
import { parseFollowPubkey } from '../utils/nostrFollowInput';
import { buildRfc2822Message, parseRfc2822Message } from './nostrMailMime';
import { upsertEmailDexMessage } from './nostrMailStorage';
import type { NostrMailMessage } from '../types/nostrMail';
import { EMAILDEX_RELAYS } from '../constants/nostrMailRelays';

/** Resuelve destinatario: hex, npub, nprofile o NIP-05 (usuario@dominio). */
export async function resolveMailRecipient(input: string): Promise<string | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (nip05.isNip05(trimmed)) {
    try {
      const ptr = await nip05.queryProfile(trimmed);
      return ptr?.pubkey?.toLowerCase() ?? null;
    } catch {
      return null;
    }
  }
  return parseFollowPubkey(trimmed);
}

function rumorToMailMessage(
  rumor: Event,
  direction: 'in' | 'out',
  ownerPubkey: string,
  peerPubkey: string
): NostrMailMessage {
  const parsed = parseRfc2822Message(rumor.content || '');
  return {
    id: rumor.id,
    eventId: rumor.id,
    fromPubkey: direction === 'in' ? rumor.pubkey : ownerPubkey,
    toPubkey: direction === 'in' ? ownerPubkey : peerPubkey,
    subject: parsed.subject || '(sin asunto)',
    body: parsed.body || rumor.content || '',
    receivedAt: rumor.created_at,
    read: direction === 'out',
    direction,
  };
}

/** Envía correo Nostr (NIP-59) y guarda copia local. */
export async function sendEmailDexMessage(params: {
  pool: SimplePool;
  senderSecretKey: Uint8Array;
  senderPubkey: string;
  fromHint: string;
  toInput: string;
  subject: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const recipient = await resolveMailRecipient(params.toInput);
  if (!recipient) {
    return { ok: false, error: 'invalid_recipient' };
  }

  const mime = buildRfc2822Message({
    from: params.fromHint,
    to: params.toInput.trim(),
    subject: params.subject.trim() || '(sin asunto)',
    body: params.body,
  });

  const wrap = nip59.wrapEvent(
    {
      kind: 14,
      content: mime,
      tags: [['subject', params.subject.trim()]],
    },
    params.senderSecretKey,
    recipient
  );

  try {
    await params.pool.publish(EMAILDEX_RELAYS, wrap);
    await upsertEmailDexMessage({
      id: wrap.id,
      eventId: wrap.id,
      fromPubkey: params.senderPubkey,
      toPubkey: recipient,
      subject: params.subject.trim() || '(sin asunto)',
      body: params.body,
      receivedAt: Math.floor(Date.now() / 1000),
      read: true,
      direction: 'out',
    });
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'publish_failed' };
  }
}

/** Sincroniza gift-wraps entrantes (kind 1059) hacia almacenamiento local. */
export async function syncEmailDexInbox(params: {
  pool: SimplePool;
  recipientSecretKey: Uint8Array;
  recipientPubkey: string;
  limit?: number;
}): Promise<{ imported: number; error?: string }> {
  const limit = params.limit ?? 40;
  try {
    const wraps = await params.pool.querySync(EMAILDEX_RELAYS, {
      kinds: [1059],
      '#p': [params.recipientPubkey],
      limit,
    });

    let imported = 0;
    for (const wrap of wraps) {
      try {
        const rumor = nip59.unwrapEvent(wrap, params.recipientSecretKey);
        if (rumor.pubkey === params.recipientPubkey) continue;
        const msg = rumorToMailMessage(rumor, 'in', params.recipientPubkey, rumor.pubkey);
        await upsertEmailDexMessage(msg);
        imported += 1;
      } catch {
        // gift-wrap no destinado a esta clave o formato distinto
      }
    }
    return { imported };
  } catch (e: unknown) {
    return { imported: 0, error: e instanceof Error ? e.message : 'sync_failed' };
  }
}
