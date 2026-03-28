import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  KYC_FORM: '@link4deal/kyc_form',
  PROMO_SIGNUP_SEEN: '@link4deal/promo_signup_seen',
  USER_NAME: '@link4deal/user_name',
  COFFEE_PUNCHES: '@link4deal/coffee_punches',
  PREFERRED_MALL: '@link4deal/preferred_mall',
  USER_QUICK_PROFILE: '@link4deal/user_quick_profile',
  PROMOTIONS_CACHE: '@link4deal/promotions_cache',
  WALLET_ADDRESSES: '@link4deal/wallet_addresses',
  LUXAE_BALANCE: '@link4deal/luxae_balance',
  WELCOME_BONUS_GRANTED: '@link4deal/welcome_bonus_granted',
  THREE_FIELDS_BONUS_GRANTED: '@link4deal/three_fields_bonus_granted',
  USER_ID: '@link4deal/user_id',
  DESPENSA_CART: '@link4deal/despensa_cart',
  INFLUENCER_VOTES: '@link4deal/influencer_votes',
  WALLET_DISCLOSURES_ACK: '@link4deal/wallet_disclosures_ack',
} as const;

export interface DespensaCart {
  storeId: string;
  items: Record<string, number>; // productId -> quantity
}

export type WalletAddressSource = 'metamask' | 'manual' | 'link4deal';

/** ethereum / polygon: misma dirección EVM; polygon para MATIC y tokens en Polygon. */
export type WalletChain = 'ethereum' | 'bitcoin' | 'polygon';

export interface WalletAddressItem {
  id: string;
  address: string;
  label?: string;
  source: WalletAddressSource;
  isDefault: boolean;
  addedAt: number;
  /** Red: ethereum (EVM) o bitcoin. Por defecto ethereum para compatibilidad. */
  chain?: WalletChain;
}

export interface PreferredMall {
  id: string;
  name: string;
  nameEs?: string;
}

export interface QuickProfile {
  name: string;
  age: string;
  phone: string;
}

export async function getKycForm(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.KYC_FORM);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export async function setKycForm(data: Record<string, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.KYC_FORM, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export async function getPromoSignupSeen(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEYS.PROMO_SIGNUP_SEEN);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setPromoSignupSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PROMO_SIGNUP_SEEN, 'true');
  } catch {
    // ignore
  }
}

export async function getUserName(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.USER_NAME);
  } catch {
    return null;
  }
}

export async function setUserName(name: string | null): Promise<void> {
  try {
    if (name == null || name.trim() === '') {
      await AsyncStorage.removeItem(KEYS.USER_NAME);
    } else {
      await AsyncStorage.setItem(KEYS.USER_NAME, name.trim());
    }
  } catch {
    // ignore
  }
}

/** ID único del usuario (se asigna al darse de alta / completar KYC). */
export async function getUserId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.USER_ID);
  } catch {
    return null;
  }
}

export async function setUserId(id: string | null): Promise<void> {
  try {
    if (id == null || id.trim() === '') {
      await AsyncStorage.removeItem(KEYS.USER_ID);
    } else {
      await AsyncStorage.setItem(KEYS.USER_ID, id.trim());
    }
  } catch {
    // ignore
  }
}

export async function getCoffeePunches(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(KEYS.COFFEE_PUNCHES);
    if (v == null) return 4;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? 4 : Math.max(0, n);
  } catch {
    return 4;
  }
}

export async function setCoffeePunches(punches: number): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.COFFEE_PUNCHES, String(Math.max(0, Math.floor(punches))));
  } catch {
    // ignore
  }
}

export async function getPreferredMall(): Promise<PreferredMall | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PREFERRED_MALL);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PreferredMall;
    return parsed?.id && parsed?.name ? parsed : null;
  } catch {
    return null;
  }
}

export async function setPreferredMall(mall: PreferredMall | null): Promise<void> {
  try {
    if (mall == null) await AsyncStorage.removeItem(KEYS.PREFERRED_MALL);
    else await AsyncStorage.setItem(KEYS.PREFERRED_MALL, JSON.stringify(mall));
  } catch {
    // ignore
  }
}

export async function getDespensaCart(storeId: string): Promise<DespensaCart | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.DESPENSA_CART);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DespensaCart;
    if (parsed?.storeId === storeId && typeof parsed?.items === 'object') return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function setDespensaCart(cart: DespensaCart): Promise<void> {
  try {
    const hasItems = Object.keys(cart.items).some((k) => cart.items[k] > 0);
    if (!hasItems) await AsyncStorage.removeItem(KEYS.DESPENSA_CART);
    else await AsyncStorage.setItem(KEYS.DESPENSA_CART, JSON.stringify(cart));
  } catch {
    // ignore
  }
}

export async function getQuickProfile(): Promise<QuickProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER_QUICK_PROFILE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuickProfile;
    return parsed?.name != null ? parsed : null;
  } catch {
    return null;
  }
}

/** true si el usuario tiene registro básico (QuickProfile o KYC) para recompensas en token LUXAE por influencer */
export async function hasBasicRegistration(): Promise<boolean> {
  const quick = await getQuickProfile();
  if (quick?.name?.trim() && quick?.age?.trim() && quick?.phone?.trim()) return true;
  const kyc = await getKycForm();
  const fullName = (kyc.fullName ?? kyc.name ?? kyc.nombre ?? '').trim();
  const phone = (kyc.phone ?? kyc.telefono ?? kyc.teléfono ?? '').trim();
  const dob = (kyc.dateOfBirth ?? kyc.fechaNacimiento ?? kyc.edad ?? '').trim();
  return Boolean(fullName && phone && dob);
}

export async function setQuickProfile(profile: QuickProfile | null): Promise<void> {
  try {
    if (profile == null) await AsyncStorage.removeItem(KEYS.USER_QUICK_PROFILE);
    else await AsyncStorage.setItem(KEYS.USER_QUICK_PROFILE, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

/** IDs de influencers por los que el usuario votó (quiero promoción de este influencer). */
export async function getInfluencerVotes(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.INFLUENCER_VOTES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setInfluencerVote(influencerId: string, voted: boolean): Promise<void> {
  try {
    const current = await getInfluencerVotes();
    const next = voted
      ? (current.includes(influencerId) ? current : [...current, influencerId])
      : current.filter((id) => id !== influencerId);
    await AsyncStorage.setItem(KEYS.INFLUENCER_VOTES, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/** Promociones en caché local; se actualizan al abrir la app */
export async function getCachedPromotions(): Promise<unknown[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PROMOTIONS_CACHE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setCachedPromotions(docs: unknown[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PROMOTIONS_CACHE, JSON.stringify(docs));
  } catch {
    // ignore
  }
}

/** Direcciones de wallet guardadas (EVM, compatible MetaMask) */
export async function getWalletAddresses(): Promise<WalletAddressItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.WALLET_ADDRESSES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WalletAddressItem[]) : [];
  } catch {
    return [];
  }
}

export async function setWalletAddresses(items: WalletAddressItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.WALLET_ADDRESSES, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/** Usuario completó el flujo de advertencias de billetera (riesgos, respaldo, direcciones). */
export async function getWalletDisclosuresAck(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEYS.WALLET_DISCLOSURES_ACK);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setWalletDisclosuresAck(ack: boolean): Promise<void> {
  try {
    if (ack) {
      await AsyncStorage.setItem(KEYS.WALLET_DISCLOSURES_ACK, 'true');
    } else {
      await AsyncStorage.removeItem(KEYS.WALLET_DISCLOSURES_ACK);
    }
  } catch {
    // ignore
  }
}

/** Saldo del token LUXAE (recompensas; ERC-20 LXD en cadena). Bono de bienvenida al completar KYC. */
export async function getLuxaeBalance(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(KEYS.LUXAE_BALANCE);
    if (v == null) return 0;
    const n = parseFloat(v);
    return Number.isNaN(n) ? 0 : Math.max(0, n);
  } catch {
    return 0;
  }
}

export async function setLuxaeBalance(amount: number): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.LUXAE_BALANCE, String(Math.max(0, amount)));
  } catch {
    // ignore
  }
}

/** Si ya se otorgó el bono de bienvenida (25 unidades LUXAE) por completar KYC. */
export async function getWelcomeBonusGranted(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEYS.WELCOME_BONUS_GRANTED);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setWelcomeBonusGranted(granted: boolean): Promise<void> {
  try {
    if (granted) {
      await AsyncStorage.setItem(KEYS.WELCOME_BONUS_GRANTED, 'true');
    } else {
      await AsyncStorage.removeItem(KEYS.WELCOME_BONUS_GRANTED);
    }
  } catch {
    // ignore
  }
}

/** Si ya se otorgaron 50 unidades LUXAE por tener los 3 primeros datos (nombre, fecha nacimiento, teléfono). */
export async function getThreeFieldsBonusGranted(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEYS.THREE_FIELDS_BONUS_GRANTED);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setThreeFieldsBonusGranted(granted: boolean): Promise<void> {
  try {
    if (granted) {
      await AsyncStorage.setItem(KEYS.THREE_FIELDS_BONUS_GRANTED, 'true');
    } else {
      await AsyncStorage.removeItem(KEYS.THREE_FIELDS_BONUS_GRANTED);
    }
  } catch {
    // ignore
  }
}

export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test((address || '').trim());
}

/** Dirección Bitcoin: legacy (1...), P2SH (3...), bech32 (bc1...) */
export function isValidBtcAddress(address: string): boolean {
  const t = (address || '').trim();
  if (t.length < 26 || t.length > 62) return false;
  return /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(t);
}

export async function addWalletAddress(
  address: string,
  source: WalletAddressSource,
  label?: string,
  chain: WalletChain = 'ethereum'
): Promise<WalletAddressItem | null> {
  const trimmed = address.trim();
  if (chain === 'bitcoin') {
    if (!isValidBtcAddress(trimmed)) return null;
  } else {
    if (!isValidEvmAddress(trimmed)) return null;
  }
  const list = await getWalletAddresses();
  const sameChain = list.filter((w) => (w.chain ?? 'ethereum') === chain);
  if (chain === 'bitcoin') {
    if (sameChain.some((w) => w.address.trim() === trimmed)) return null;
  } else {
    if (sameChain.some((w) => w.address.toLowerCase() === trimmed.toLowerCase())) return null;
  }
  const isFirst = list.length === 0;
  const item: WalletAddressItem = {
    id: `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    address: trimmed,
    label: label?.trim() || undefined,
    source,
    isDefault: isFirst,
    addedAt: Date.now(),
    chain,
  };
  const next = list.map((w) => ({ ...w, isDefault: false }));
  next.push(item);
  if (isFirst) item.isDefault = true;
  await setWalletAddresses(next);
  return item;
}

export async function removeWalletAddress(id: string): Promise<void> {
  const list = await getWalletAddresses();
  const removed = list.find((w) => w.id === id);
  let next = list.filter((w) => w.id !== id);
  if (removed?.isDefault && next.length > 0) {
    next = next.map((w, i) => ({ ...w, isDefault: i === 0 }));
  }
  await setWalletAddresses(next);
}

export async function setDefaultWalletAddress(id: string): Promise<void> {
  const list = await getWalletAddresses();
  const next = list.map((w) => ({ ...w, isDefault: w.id === id }));
  await setWalletAddresses(next);
}
