/** Default public relays for read/write fan-out (resilient if one is down). */
export const DEFAULT_NOSTR_RELAYS: string[] = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://nostr.mom',
];

export const NOSTR_RELAY_STORAGE_KEY = '@link4deal/nostr_extra_relays';
