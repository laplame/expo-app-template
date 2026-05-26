import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NostrMailMessage } from '../types/nostrMail';

const KEY = '@link4deal/emaildex_messages';

export async function getEmailDexMessages(): Promise<NostrMailMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as NostrMailMessage[];
  } catch {
    return [];
  }
}

export async function saveEmailDexMessages(messages: NostrMailMessage[]): Promise<void> {
  const sorted = [...messages].sort((a, b) => b.receivedAt - a.receivedAt);
  await AsyncStorage.setItem(KEY, JSON.stringify(sorted));
}

export async function upsertEmailDexMessage(msg: NostrMailMessage): Promise<void> {
  const list = await getEmailDexMessages();
  const idx = list.findIndex((m) => m.id === msg.id || m.eventId === msg.eventId);
  if (idx >= 0) list[idx] = msg;
  else list.unshift(msg);
  await saveEmailDexMessages(list);
}

export async function markEmailDexRead(id: string): Promise<void> {
  const list = await getEmailDexMessages();
  const next = list.map((m) => (m.id === id ? { ...m, read: true } : m));
  await saveEmailDexMessages(next);
}
