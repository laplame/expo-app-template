import { useCallback, useState } from 'react';
import { getInfluencerMe, type InfluencerDoc } from '../services/influencersApi';
import {
  verifyInfluencerSession,
  getInfluencerAppCampaigns,
  processInfluencerPendingSettlements,
  type InfluencerAppCampaign,
  type InfluencerSettlementsConfig,
  type VerifyInfluencerSessionResult,
} from '../services/influencerAppApi';
import {
  getAuthAccessToken,
  getWalletAddresses,
  setInfluencerSessionCache,
} from '../services/storage';
import { getOrCreateDeviceId } from '../services/deviceIdentity';

export type InfluencerAppSessionState = {
  loading: boolean;
  refreshing: boolean;
  needsAuth: boolean;
  notLinked: boolean;
  error: string | null;
  profile: InfluencerDoc | null;
  campaigns: InfluencerAppCampaign[];
  session: VerifyInfluencerSessionResult | null;
  settlements: InfluencerSettlementsConfig | undefined;
  dashboardAccess: boolean;
  accessMessage: string | null;
  lastUpdated: Date | null;
  accessToken: string | null;
  walletAddress: string | undefined;
};

const initialState: InfluencerAppSessionState = {
  loading: true,
  refreshing: false,
  needsAuth: false,
  notLinked: false,
  error: null,
  profile: null,
  campaigns: [],
  session: null,
  settlements: undefined,
  dashboardAccess: false,
  accessMessage: null,
  lastUpdated: null,
  accessToken: null,
  walletAddress: undefined,
};

export function useInfluencerAppSession() {
  const [state, setState] = useState<InfluencerAppSessionState>(initialState);

  const refresh = useCallback(async (isRefresh?: boolean) => {
    setState((s) => ({
      ...s,
      loading: isRefresh ? s.loading : true,
      refreshing: !!isRefresh,
      error: null,
      needsAuth: false,
      notLinked: false,
    }));

    const token = await getAuthAccessToken();
    if (!token) {
      setState({
        ...initialState,
        loading: false,
        refreshing: false,
        needsAuth: true,
      });
      return;
    }

    const deviceId = await getOrCreateDeviceId();
    const wallets = await getWalletAddresses();
    const defaultWallet = wallets.find((w) => w.isDefault) ?? wallets[0];
    const walletAddress = defaultWallet?.address;
    const preferredNetwork = defaultWallet?.chain === 'polygon' ? 'polygon' : 'ethereum';

    const [meRes, verifyRes, campRes] = await Promise.all([
      getInfluencerMe(token),
      verifyInfluencerSession({ deviceId, walletAddress, preferredNetwork }, token),
      getInfluencerAppCampaigns(token),
    ]);

    if (verifyRes.code === 'INFLUENCER_NOT_LINKED' || meRes.code === 'INFLUENCER_NOT_LINKED') {
      setState({
        ...initialState,
        loading: false,
        refreshing: false,
        notLinked: true,
        accessToken: token,
      });
      return;
    }

    const doc = meRes.ok ? meRes.data : verifyRes.influencer ?? null;
    if (!doc && !meRes.ok && !verifyRes.ok) {
      setState({
        ...initialState,
        loading: false,
        refreshing: false,
        error: meRes.error ?? verifyRes.error ?? 'Error',
        accessToken: token,
      });
      return;
    }

    const merged = doc ? { ...doc, ...(verifyRes.influencer ?? {}) } : null;
    const campList =
      verifyRes.dashboardAccess && campRes.ok && campRes.campaigns?.length
        ? campRes.campaigns
        : verifyRes.dashboardAccess
          ? verifyRes.campaigns ?? []
          : [];

    if (merged) {
      const id = merged._id ?? merged.id;
      await setInfluencerSessionCache({
        savedAt: Date.now(),
        influencerId: id,
        publicSlug: merged.publicSlug ?? merged.username,
        displayName: merged.displayName ?? merged.name,
        dashboardAccess: verifyRes.dashboardAccess,
        identityVerificationStatus: verifyRes.identityVerificationStatus,
        payoutWallet: verifyRes.settlements?.payoutWallet ?? verifyRes.wallet?.address,
        preferredNetwork: verifyRes.wallet?.preferredNetwork,
        pendingAmountUsd: verifyRes.settlements?.summary?.pendingAmountUsd,
        paidAmountUsd: verifyRes.settlements?.summary?.paidAmountUsd,
      });
    }

    setState({
      loading: false,
      refreshing: false,
      needsAuth: false,
      notLinked: false,
      error: null,
      profile: merged,
      campaigns: campList,
      session: verifyRes.ok ? verifyRes : null,
      settlements: verifyRes.settlements,
      dashboardAccess: verifyRes.dashboardAccess === true,
      accessMessage: verifyRes.accessMessage ?? null,
      lastUpdated: new Date(),
      accessToken: token,
      walletAddress,
    });
  }, []);

  const processPendingPayouts = useCallback(async () => {
    const token = state.accessToken ?? (await getAuthAccessToken());
    if (!token) return { ok: false, error: 'No auth' };
    const res = await processInfluencerPendingSettlements(token);
    if (res.ok) await refresh(true);
    return res;
  }, [refresh, state.accessToken]);

  return {
    ...state,
    refresh,
    processPendingPayouts,
  };
}
