/** Mensaje local E-mailDex (NIP-59 gift-wrap, interoperable con Nmail). */
export type NostrMailMessage = {
  id: string;
  eventId: string;
  fromPubkey: string;
  toPubkey: string;
  subject: string;
  body: string;
  receivedAt: number;
  read: boolean;
  direction: 'in' | 'out';
};
