import React, { createContext, useContext } from 'react';

const MetaMaskUnavailableContext = createContext<boolean>(false);

export function MetaMaskUnavailableProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return (
    <MetaMaskUnavailableContext.Provider value={value}>
      {children}
    </MetaMaskUnavailableContext.Provider>
  );
}

export function useMetaMaskUnavailable(): boolean {
  return useContext(MetaMaskUnavailableContext);
}
