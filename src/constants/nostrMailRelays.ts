import { DEFAULT_NOSTR_RELAYS } from '../services/nostrRelays';

/** Relays recomendados por Nmail / uid.ovh (gift-wrap kind 1059). */
export const NMAIL_DM_RELAYS: string[] = [
  'wss://relay.nmail.li',
  'wss://nostr-01.uid.ovh',
  'wss://nostr-02.uid.ovh',
  'wss://auth.nostr1.com',
];

/** Fan-out al enviar / sincronizar bandeja E-mailDex. */
export const EMAILDEX_RELAYS: string[] = [
  ...new Set([...NMAIL_DM_RELAYS, ...DEFAULT_NOSTR_RELAYS]),
];

/** App hermana Nmail (Fase 4). */
export const NMAIL_WEB_APP_URL = 'https://app.nostrmail.org';
