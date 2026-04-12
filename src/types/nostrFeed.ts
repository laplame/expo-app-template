import type { Event } from 'nostr-tools';

export type NostrFeedItem = {
  id: string;
  pubkey: string;
  createdAt: number;
  content: string;
  kind: number;
  imageUrls: string[];
  videoUrl?: string;
  videoPosterUrl?: string;
  repostOf?: { name: string };
  name: string;
  nip05?: string;
  avatarUrl?: string;
  likes: number;
  reposts: number;
  verified?: boolean;
  /** Present for relay notes; used for NIP-25 reactions. */
  sourceEvent?: Event;
};
