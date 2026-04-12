import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { canRevealWalletAddresses } from '../services/storage';

type VerificationAccessValue = {
  revealWalletAddresses: boolean;
  refreshVerificationAccess: () => Promise<void>;
};

const VerificationAccessContext = createContext<VerificationAccessValue | null>(null);

export function VerificationAccessProvider({ children }: { children: React.ReactNode }) {
  const [revealWalletAddresses, setReveal] = useState(false);

  const refreshVerificationAccess = useCallback(async () => {
    const ok = await canRevealWalletAddresses();
    setReveal(ok);
  }, []);

  useEffect(() => {
    refreshVerificationAccess();
  }, [refreshVerificationAccess]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshVerificationAccess();
    });
    return () => sub.remove();
  }, [refreshVerificationAccess]);

  const value = useMemo(
    () => ({ revealWalletAddresses, refreshVerificationAccess }),
    [revealWalletAddresses, refreshVerificationAccess]
  );

  return (
    <VerificationAccessContext.Provider value={value}>{children}</VerificationAccessContext.Provider>
  );
}

export function useVerificationAccess(): VerificationAccessValue {
  const ctx = useContext(VerificationAccessContext);
  if (!ctx) {
    return { revealWalletAddresses: false, refreshVerificationAccess: async () => {} };
  }
  return ctx;
}
