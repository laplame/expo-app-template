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
  AUTH_ACCESS_TOKEN: '@link4deal/auth_access_token',
  AUTH_REFRESH_TOKEN: '@link4deal/auth_refresh_token',
  DESPENSA_CART: '@link4deal/despensa_cart',
  INFLUENCER_VOTES: '@link4deal/influencer_votes',
  /** Contadores locales de “quiero su promoción” por influencer (complementa API). */
  INFLUENCER_VOTE_TALLIES: '@link4deal/influencer_vote_tallies',
  /** Caché del perfil influencer vinculado (GET /me) para el panel en app. */
  INFLUENCER_SESSION_CACHE: '@link4deal/influencer_session_cache',
  /** Historial local de cupones QR emitidos por campaña (panel influencer). */
  INFLUENCER_QR_ISSUE_HISTORY: '@link4deal/influencer_qr_issue_history',
  WALLET_DISCLOSURES_ACK: '@link4deal/wallet_disclosures_ack',
  PAYMENT_LIMIT_LUXAE: '@link4deal/payment_limit_luxae',
  /** Historial local LUXAE (ingresos, pagos, redenciones, fidelidad). */
  WALLET_LEDGER: '@link4deal/wallet_ledger',
  /** Preferencias de UI: sobreviven al cerrar la app (AsyncStorage; no al desinstalar salvo respaldo del SO). */
  SETTINGS_LANGUAGE: '@link4deal/settings_language',
  SETTINGS_CURRENCY: '@link4deal/settings_currency',
  SETTINGS_COLOR_SCHEME: '@link4deal/settings_color_scheme',
  SETTINGS_APP_BACKGROUND_URI: '@link4deal/settings_app_background_uri',
  /** Verificación KYB (negocio) aprobada; permite ver direcciones completas como el KYC. */
  KYB_VERIFIED: '@link4deal/kyb_verified',
} as const;

const WHATSAPP_KYC_REQUIRED = process.env.EXPO_PUBLIC_KYC_WHATSAPP_REQUIRED === 'true';

/** Límite por defecto para un pago en LUXAE (configurable en Ajustes). */
export const DEFAULT_PAYMENT_LIMIT_LUXAE = 20;

export type StoredUiLanguage = 'en' | 'es';
export type StoredUiCurrency = 'USD' | 'MXN';
/** Tema de entorno (colores del sistema en app). */
export type StoredAppTheme =
  | 'gold'
  | 'dark'
  | 'light'
  | 'forest'
  | 'ocean'
  | 'sunset'
  | 'violet'
  | 'midnight';

/** @deprecated Use StoredAppTheme */
export type StoredColorScheme = StoredAppTheme;

export async function getSettingsLanguage(): Promise<StoredUiLanguage | null> {
  try {
    const v = await AsyncStorage.getItem(KEYS.SETTINGS_LANGUAGE);
    if (v === 'en' || v === 'es') return v;
    return null;
  } catch {
    return null;
  }
}

export async function setSettingsLanguage(lang: StoredUiLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS_LANGUAGE, lang);
  } catch {
    // ignore
  }
}

export async function getSettingsCurrency(): Promise<StoredUiCurrency | null> {
  try {
    const v = await AsyncStorage.getItem(KEYS.SETTINGS_CURRENCY);
    if (v === 'USD' || v === 'MXN') return v;
    return null;
  } catch {
    return null;
  }
}

export async function setSettingsCurrency(curr: StoredUiCurrency): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS_CURRENCY, curr);
  } catch {
    // ignore
  }
}

export async function getSettingsAppTheme(): Promise<StoredAppTheme | null> {
  try {
    const v = await AsyncStorage.getItem(KEYS.SETTINGS_COLOR_SCHEME);
    const allowed: StoredAppTheme[] = [
      'gold',
      'dark',
      'light',
      'forest',
      'ocean',
      'sunset',
      'violet',
      'midnight',
    ];
    if (v && (allowed as string[]).includes(v)) return v as StoredAppTheme;
    return null;
  } catch {
    return null;
  }
}

export async function setSettingsAppTheme(theme: StoredAppTheme): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS_COLOR_SCHEME, theme);
  } catch {
    // ignore
  }
}

/** @deprecated Use getSettingsAppTheme */
export async function getSettingsColorScheme(): Promise<StoredColorScheme | null> {
  return getSettingsAppTheme();
}

/** @deprecated Use setSettingsAppTheme */
export async function setSettingsColorScheme(scheme: StoredColorScheme): Promise<void> {
  return setSettingsAppTheme(scheme);
}

export async function getSettingsAppBackgroundUri(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(KEYS.SETTINGS_APP_BACKGROUND_URI);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export async function setSettingsAppBackgroundUri(uri: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS_APP_BACKGROUND_URI, uri.trim());
  } catch {
    // ignore
  }
}

export interface DespensaCart {
  storeId: string;
  items: Record<string, number>; // productId -> quantity
}

export type WalletAddressSource = 'metamask' | 'manual' | 'link4deal';

/** ethereum / polygon: misma dirección EVM; polygon para MATIC y tokens en Polygon. */
export type WalletChain =
  | 'ethereum'
  | 'bitcoin'
  | 'polygon'
  | 'bitcoin-cash'
  | 'ripple'
  | 'solana';

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
  /** Lista mock cercana vs catálogo BizneAI (cafés / programa 10=1). */
  source?: 'nearby_mock' | 'bizneai';
  fullAddress?: string;
  latitude?: number;
  longitude?: number;
  bizneStoreType?: string;
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

/** KYC completo: datos mínimos; WhatsApp OTP se exige solo cuando hay proveedor configurado. */
export async function isKycComplete(): Promise<boolean> {
  const k = await getKycForm();
  const fullName = (k.fullName ?? '').trim();
  const phone = (k.phone ?? '').trim();
  const dob = (k.dateOfBirth ?? '').trim();
  const hasMinimumKyc = Boolean(fullName && phone && dob);
  if (!WHATSAPP_KYC_REQUIRED) return hasMinimumKyc;
  const whatsappVerified = k.phoneWhatsappVerified === 'true';
  return Boolean(hasMinimumKyc && whatsappVerified);
}

export async function getKybVerified(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEYS.KYB_VERIFIED);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setKybVerified(verified: boolean): Promise<void> {
  try {
    if (verified) {
      await AsyncStorage.setItem(KEYS.KYB_VERIFIED, 'true');
    } else {
      await AsyncStorage.removeItem(KEYS.KYB_VERIFIED);
    }
  } catch {
    // ignore
  }
}

/** Mostrar dirección completa en UI solo tras KYC o KYB. */
export async function canRevealWalletAddresses(): Promise<boolean> {
  if (await getKybVerified()) return true;
  return isKycComplete();
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

export async function getAuthAccessToken(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(KEYS.AUTH_ACCESS_TOKEN);
    return v?.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export async function getAuthRefreshToken(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(KEYS.AUTH_REFRESH_TOKEN);
    return v?.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export async function setAuthTokens(accessToken: string | null, refreshToken?: string | null): Promise<void> {
  try {
    if (accessToken?.trim()) {
      await AsyncStorage.setItem(KEYS.AUTH_ACCESS_TOKEN, accessToken.trim());
    } else {
      await AsyncStorage.removeItem(KEYS.AUTH_ACCESS_TOKEN);
    }
    if (refreshToken === undefined) return;
    if (refreshToken?.trim()) {
      await AsyncStorage.setItem(KEYS.AUTH_REFRESH_TOKEN, refreshToken.trim());
    } else {
      await AsyncStorage.removeItem(KEYS.AUTH_REFRESH_TOKEN);
    }
  } catch {
    // ignore
  }
}

export async function clearAuthTokens(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEYS.AUTH_ACCESS_TOKEN, KEYS.AUTH_REFRESH_TOKEN]);
  } catch {
    // ignore
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

export interface InfluencerVoteTallies {
  [influencerId: string]: number;
}

/** IDs de influencers por los que el usuario votó (quiero promoción de este influencer). */
export async function getInfluencerVotes(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.INFLUENCER_VOTES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((id) => typeof id === 'string');
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { votedIds?: string[] }).votedIds)) {
      return (parsed as { votedIds: string[] }).votedIds;
    }
    return [];
  } catch {
    return [];
  }
}

/** Contadores guardados en el dispositivo (personas que quieren promoción). */
export async function getInfluencerVoteTallies(): Promise<InfluencerVoteTallies> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.INFLUENCER_VOTE_TALLIES);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as InfluencerVoteTallies;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: InfluencerVoteTallies = {};
    for (const [k, v] of Object.entries(parsed)) {
      const n = typeof v === 'number' ? v : parseInt(String(v), 10);
      if (Number.isFinite(n) && n >= 0) out[k] = n;
    }
    return out;
  } catch {
    return {};
  }
}

async function setInfluencerVoteTallies(tallies: InfluencerVoteTallies): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.INFLUENCER_VOTE_TALLIES, JSON.stringify(tallies));
  } catch {
    // ignore
  }
}

/**
 * Registra o quita voto y actualiza contador local.
 * @returns Nuevo total mostrable para ese influencer.
 */
export async function setInfluencerVote(
  influencerId: string,
  voted: boolean,
  options?: { serverBaseline?: number }
): Promise<{ votedIds: string[]; displayCount: number }> {
  const baseline = Math.max(0, options?.serverBaseline ?? 0);
  try {
    const current = await getInfluencerVotes();
    const tallies = await getInfluencerVoteTallies();
    const wasVoted = current.includes(influencerId);
    let count = tallies[influencerId] ?? baseline;

    const nextIds = voted
      ? wasVoted
        ? current
        : [...current, influencerId]
      : current.filter((id) => id !== influencerId);

    if (voted && !wasVoted) {
      count = Math.max(count, baseline) + 1;
    } else if (!voted && wasVoted) {
      count = Math.max(baseline, count - 1);
    }

    tallies[influencerId] = count;
    await AsyncStorage.setItem(KEYS.INFLUENCER_VOTES, JSON.stringify(nextIds));
    await setInfluencerVoteTallies(tallies);
    return { votedIds: nextIds, displayCount: count };
  } catch {
    return { votedIds: await getInfluencerVotes(), displayCount: baseline };
  }
}

/** Sincroniza contadores con datos del API sin bajar totales ya guardados. */
export async function mergeInfluencerVoteTalliesFromServer(
  items: { id: string; serverCount?: number }[]
): Promise<InfluencerVoteTallies> {
  const tallies = await getInfluencerVoteTallies();
  let changed = false;
  for (const { id, serverCount } of items) {
    if (!id) continue;
    const base = Math.max(0, serverCount ?? 0);
    const prev = tallies[id];
    if (prev == null || prev < base) {
      tallies[id] = Math.max(prev ?? 0, base);
      changed = true;
    }
  }
  if (changed) await setInfluencerVoteTallies(tallies);
  return tallies;
}

export interface InfluencerSessionCache {
  savedAt: number;
  influencerId?: string;
  publicSlug?: string;
  displayName?: string;
  dashboardAccess?: boolean;
  identityVerificationStatus?: 'pending' | 'approved' | 'rejected';
  payoutWallet?: string;
  preferredNetwork?: string;
  pendingAmountUsd?: number;
  paidAmountUsd?: number;
}

export async function getInfluencerSessionCache(): Promise<InfluencerSessionCache | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.INFLUENCER_SESSION_CACHE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InfluencerSessionCache;
    return parsed?.savedAt ? parsed : null;
  } catch {
    return null;
  }
}

export async function setInfluencerSessionCache(cache: InfluencerSessionCache | null): Promise<void> {
  try {
    if (!cache) {
      await AsyncStorage.removeItem(KEYS.INFLUENCER_SESSION_CACHE);
      return;
    }
    await AsyncStorage.setItem(KEYS.INFLUENCER_SESSION_CACHE, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export interface InfluencerQrIssueRecord {
  id: string;
  shortCode: string;
  campaignTitle?: string;
  qrValue: string;
  referralCode?: string;
  createdAt: number;
}

const INFLUENCER_QR_HISTORY_MAX = 30;

export async function getInfluencerQrIssueHistory(): Promise<InfluencerQrIssueRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.INFLUENCER_QR_ISSUE_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const rows = parsed.filter((row): row is InfluencerQrIssueRecord => {
      if (!row || typeof row !== 'object') return false;
      const r = row as InfluencerQrIssueRecord;
      return (
        typeof r.id === 'string' &&
        typeof r.shortCode === 'string' &&
        typeof r.qrValue === 'string' &&
        typeof r.createdAt === 'number' &&
        Number.isFinite(r.createdAt)
      );
    });
    rows.sort((a, b) => b.createdAt - a.createdAt);
    return rows;
  } catch {
    return [];
  }
}

export async function appendInfluencerQrIssue(
  entry: Omit<InfluencerQrIssueRecord, 'id' | 'createdAt'> & {
    id?: string;
    createdAt?: number;
  }
): Promise<void> {
  try {
    const prev = await getInfluencerQrIssueHistory();
    const row: InfluencerQrIssueRecord = {
      id: entry.id ?? `qr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      shortCode: entry.shortCode.trim().replace(/^#/, ''),
      campaignTitle: entry.campaignTitle?.trim() || undefined,
      qrValue: entry.qrValue,
      referralCode: entry.referralCode?.trim() || undefined,
      createdAt: entry.createdAt ?? Date.now(),
    };
    const next = [row, ...prev.filter((p) => p.id !== row.id)].slice(0, INFLUENCER_QR_HISTORY_MAX);
    await AsyncStorage.setItem(KEYS.INFLUENCER_QR_ISSUE_HISTORY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function resolveInfluencerDisplayVoteCount(
  influencerId: string,
  tallies: InfluencerVoteTallies,
  serverCount?: number
): number {
  const base = Math.max(0, serverCount ?? 0);
  const local = tallies[influencerId];
  if (local != null) return Math.max(local, base);
  return base;
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

/** Límite máximo de LUXAE por operación de pago (QR «Pagar»). */
export async function getPaymentLimitLuxae(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(KEYS.PAYMENT_LIMIT_LUXAE);
    if (v == null) return DEFAULT_PAYMENT_LIMIT_LUXAE;
    const n = parseFloat(v);
    if (!Number.isFinite(n) || n < 1) return DEFAULT_PAYMENT_LIMIT_LUXAE;
    return Math.min(n, 1e9);
  } catch {
    return DEFAULT_PAYMENT_LIMIT_LUXAE;
  }
}

export async function setPaymentLimitLuxae(amount: number): Promise<void> {
  try {
    const n = Math.max(1, Math.min(Math.floor(amount), 999999999));
    await AsyncStorage.setItem(KEYS.PAYMENT_LIMIT_LUXAE, String(n));
  } catch {
    // ignore
  }
}

/** Saldo del token LUXAE en disco (AsyncStorage); sobrevive al cerrar la app. Desinstalar la app suele borrar estos datos salvo respaldo automático del sistema. */
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

const WALLET_LEDGER_MAX = 500;

export type WalletLedgerKind = 'income' | 'payment' | 'redemption' | 'loyalty';

export interface WalletLedgerEntry {
  id: string;
  kind: WalletLedgerKind;
  /** LUXAE: positivo ingreso; negativo cargo (pago/redención con coste en token). 0 si solo informativo (p. ej. fidelidad). */
  amountLuxae: number;
  titleEs: string;
  titleEn: string;
  details?: string;
  createdAt: number;
}

export async function getWalletLedger(): Promise<WalletLedgerEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.WALLET_LEDGER);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const rows = parsed.filter((row): row is WalletLedgerEntry => {
      if (!row || typeof row !== 'object') return false;
      const r = row as WalletLedgerEntry;
      const k = r.kind;
      return (
        typeof r.id === 'string' &&
        (k === 'income' || k === 'payment' || k === 'redemption' || k === 'loyalty') &&
        typeof r.amountLuxae === 'number' &&
        Number.isFinite(r.amountLuxae) &&
        typeof r.titleEs === 'string' &&
        typeof r.titleEn === 'string' &&
        typeof r.createdAt === 'number' &&
        Number.isFinite(r.createdAt)
      );
    });
    rows.sort((a, b) => b.createdAt - a.createdAt);
    return rows;
  } catch {
    return [];
  }
}

export async function appendWalletLedgerEntry(
  entry: Omit<WalletLedgerEntry, 'id' | 'createdAt'> & { id?: string; createdAt?: number }
): Promise<void> {
  try {
    const prev = await getWalletLedger();
    const row: WalletLedgerEntry = {
      id: entry.id ?? `wl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      kind: entry.kind,
      amountLuxae: entry.amountLuxae,
      titleEs: entry.titleEs,
      titleEn: entry.titleEn,
      details: entry.details,
      createdAt: entry.createdAt ?? Date.now(),
    };
    const next = [row, ...prev.filter((p) => p.id !== row.id)].slice(0, WALLET_LEDGER_MAX);
    await AsyncStorage.setItem(KEYS.WALLET_LEDGER, JSON.stringify(next));
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

/** Bitcoin Cash: CashAddr (q/p… o prefijo bitcoincash:) o legacy 1/3 (sin bc1). */
export function isValidBchAddress(address: string): boolean {
  const t = (address || '').trim();
  const lower = t.toLowerCase();
  if (/^bitcoincash:(q|p)[a-z0-9]{41}$/.test(lower)) return true;
  if (/^(q|p)[a-z0-9]{41}$/i.test(t)) return true;
  if (t.length < 26 || t.length > 35) return false;
  return /^(1|3)[a-zA-HJ-NP-Z0-9]{25,34}$/.test(t);
}

/** XRP Ledger: cuenta clásica r… */
export function isValidXrpAddress(address: string): boolean {
  const t = (address || '').trim();
  return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(t);
}

/** Solana: cuenta base58 (pública típica 32–44 caracteres). */
export function isValidSolanaAddress(address: string): boolean {
  const t = (address || '').trim();
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(t);
}

function isValidAddressForChain(chain: WalletChain, trimmed: string): boolean {
  switch (chain) {
    case 'bitcoin':
      return isValidBtcAddress(trimmed);
    case 'bitcoin-cash':
      return isValidBchAddress(trimmed);
    case 'ripple':
      return isValidXrpAddress(trimmed);
    case 'solana':
      return isValidSolanaAddress(trimmed);
    case 'ethereum':
    case 'polygon':
      return isValidEvmAddress(trimmed);
    default:
      return false;
  }
}

export async function addWalletAddress(
  address: string,
  source: WalletAddressSource,
  label?: string,
  chain: WalletChain = 'ethereum'
): Promise<WalletAddressItem | null> {
  const trimmed = address.trim();
  if (!isValidAddressForChain(chain, trimmed)) return null;
  const list = await getWalletAddresses();
  const sameChain = list.filter((w) => (w.chain ?? 'ethereum') === chain);
  const isDuplicate =
    chain === 'ethereum' || chain === 'polygon'
      ? sameChain.some((w) => w.address.toLowerCase() === trimmed.toLowerCase())
      : sameChain.some((w) => w.address.trim() === trimmed);
  if (isDuplicate) return null;
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
