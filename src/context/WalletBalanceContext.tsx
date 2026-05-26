import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getPricesInUsd, CoinPrices } from '../services/coingecko';
import { useSettings } from './SettingsContext';
import { TOKEN_SYMBOL } from '../constants/luxToken';
import {
  getLuxaeBalance,
  setLuxaeBalance,
  getWelcomeBonusGranted,
  setWelcomeBonusGranted,
  getThreeFieldsBonusGranted,
  setThreeFieldsBonusGranted,
  appendWalletLedgerEntry,
} from '../services/storage';
import type { WalletLedgerKind } from '../services/storage';

const USD_TO_MXN = 17;

/** 1 LUXAE = 1 USD → 25 = 25 USD (bono de bienvenida); nombre ERC-20 en cadena: LXD */
const LUXAE_PRICE_USD = 1;
const WELCOME_BONUS_LUXAE = 25;

/** Billetera empieza en 0; solo saldo token (storage) y MetaMask al conectar suman al total. */
const MOCK_BALANCES = {
  bitcoin: 0,
  wrappedBitcoin: 0,
  ethereum: 0,
  solana: 0,
  tether: 0,
  luxae: 0, // saldo real viene de storage (getLuxaeBalance)
};

const MOCK_PRICES_USD: CoinPrices = {
  bitcoin: { usd: 97000 },
  'bitcoin-cash': { usd: 450 },
  'wrapped-bitcoin': { usd: 97000 },
  ethereum: { usd: 3500 },
  'matic-network': { usd: 0.85 },
  solana: { usd: 140 },
  ripple: { usd: 2 },
  tether: { usd: 1 },
  luxae: { usd: LUXAE_PRICE_USD },
};

function formatMoney(value: number, currency: 'USD' | 'MXN'): string {
  const locale = currency === 'MXN' ? 'es-MX' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function computeTotalUsd(prices: CoinPrices, luxaeBalance: number): number {
  const btc = (prices.bitcoin?.usd ?? 0) * MOCK_BALANCES.bitcoin;
  const wbtc = (prices['wrapped-bitcoin']?.usd ?? 0) * MOCK_BALANCES.wrappedBitcoin;
  const eth = (prices.ethereum?.usd ?? 0) * MOCK_BALANCES.ethereum;
  const sol = (prices.solana?.usd ?? 0) * MOCK_BALANCES.solana;
  const usdt = (prices.tether?.usd ?? 0) * MOCK_BALANCES.tether;
  const luxae = (prices.luxae?.usd ?? LUXAE_PRICE_USD) * luxaeBalance;
  return btc + wbtc + eth + sol + usdt + luxae;
}

interface WalletBalanceContextData {
  prices: CoinPrices | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  totalUsd: number;
  pricesForCalculation: CoinPrices;
  luxaeBalance: number;
  /** Otorga 25 unidades TOKEN_SYMBOL (25 USD) una sola vez al completar KYC. */
  grantWelcomeBonus: () => Promise<boolean>;
  /** Otorga 50 unidades TOKEN_SYMBOL (50 USD) una sola vez al tener nombre, fecha nacimiento y teléfono. */
  grantThreeFieldsBonus: () => Promise<boolean>;
  /** Suma saldo TOKEN_SYMBOL (ej. 10 por subir promoción). Se refleja en Home y Wallet. */
  addLuxaeBalance: (
    amount: number,
    ledger?: { kind?: WalletLedgerKind; titleEs: string; titleEn: string; details?: string }
  ) => Promise<number>;
  /** Resta saldo LUXAE y registra pago o redención en el historial de Billetera. */
  subtractLuxaeBalance: (
    amount: number,
    ledger: { kind: 'payment' | 'redemption'; titleEs: string; titleEn: string; details?: string }
  ) => Promise<number>;
  /** Ya se leyó el saldo desde almacenamiento al menos una vez (evita parpadeos / lecturas concurrentes). */
  luxaeHydrated: boolean;
  /** Relee AsyncStorage y actualiza estado (encadenado con mutaciones para idempotencia). */
  refreshLuxaeBalance: () => Promise<number>;
}

export interface WalletBalanceContextValue extends WalletBalanceContextData {
  totalDisplay: number;
  formattedBalance: string;
  /** Saldo en moneda local correspondiente solo al token (para el módulo Recompensas). */
  formattedLuxaeBalance: string;
  currency: 'USD' | 'MXN';
}

const WalletBalanceContext = createContext<WalletBalanceContextData | null>(null);

export function WalletBalanceProvider({ children }: { children: React.ReactNode }) {
  const [prices, setPrices] = useState<CoinPrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [luxaeBalance, setLuxaeBalanceState] = useState(0);
  const [luxaeHydrated, setLuxaeHydrated] = useState(false);

  /** Cola FIFO: todas las lecturas/escrituras del saldo LUXAE pasan aquí para evitar carreras RMW. */
  const luxaeOpsTailRef = useRef(Promise.resolve<void>(undefined));
  const runLuxaeExclusive = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const next = luxaeOpsTailRef.current.then(() => fn());
    luxaeOpsTailRef.current = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }, []);

  const refreshLuxaeBalance = useCallback(async (): Promise<number> => {
    return runLuxaeExclusive(async () => {
      const v = await getLuxaeBalance();
      setLuxaeBalanceState(v);
      return v;
    });
  }, [runLuxaeExclusive]);

  useEffect(() => {
    let cancelled = false;
    runLuxaeExclusive(async () => {
      const v = await getLuxaeBalance();
      if (!cancelled) setLuxaeBalanceState(v);
      return v;
    })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLuxaeHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [runLuxaeExclusive]);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPricesInUsd();
      setPrices(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '');
      setPrices(MOCK_PRICES_USD);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') refreshLuxaeBalance().catch(() => {});
    });
    return () => sub.remove();
  }, [refreshLuxaeBalance]);

  const grantWelcomeBonus = useCallback(async (): Promise<boolean> => {
    return runLuxaeExclusive(async () => {
      const already = await getWelcomeBonusGranted();
      if (already) return false;
      const current = await getLuxaeBalance();
      const next = current + WELCOME_BONUS_LUXAE;
      await setLuxaeBalance(next);
      await setWelcomeBonusGranted(true);
      setLuxaeBalanceState(next);
      await appendWalletLedgerEntry({
        kind: 'income',
        amountLuxae: WELCOME_BONUS_LUXAE,
        titleEs: 'Bono de bienvenida (KYC)',
        titleEn: 'Welcome bonus (KYC)',
      });
      return true;
    });
  }, [runLuxaeExclusive]);

  const grantThreeFieldsBonus = useCallback(async (): Promise<boolean> => {
    return runLuxaeExclusive(async () => {
      const already = await getThreeFieldsBonusGranted();
      if (already) return false;
      const current = await getLuxaeBalance();
      const next = current + 50;
      await setLuxaeBalance(next);
      await setThreeFieldsBonusGranted(true);
      setLuxaeBalanceState(next);
      await appendWalletLedgerEntry({
        kind: 'income',
        amountLuxae: 50,
        titleEs: 'Bono perfil (nombre, fecha, teléfono)',
        titleEn: 'Profile bonus (name, birth date, phone)',
      });
      return true;
    });
  }, [runLuxaeExclusive]);

  const addLuxaeBalance = useCallback(
    async (
      amount: number,
      ledger?: { kind?: WalletLedgerKind; titleEs: string; titleEn: string; details?: string }
    ): Promise<number> => {
      return runLuxaeExclusive(async () => {
        const current = await getLuxaeBalance();
        const next = Math.max(0, current + amount);
        await setLuxaeBalance(next);
        setLuxaeBalanceState(next);
        if (amount !== 0) {
          const credit = amount > 0;
          await appendWalletLedgerEntry({
            kind: ledger?.kind ?? (credit ? 'income' : 'payment'),
            amountLuxae: amount,
            titleEs:
              ledger?.titleEs ??
              (credit ? `Ingreso ${TOKEN_SYMBOL}` : `Cargo ${TOKEN_SYMBOL}`),
            titleEn:
              ledger?.titleEn ?? (credit ? `${TOKEN_SYMBOL} credit` : `${TOKEN_SYMBOL} debit`),
            details: ledger?.details,
          });
        }
        return next;
      });
    },
    [runLuxaeExclusive]
  );

  const subtractLuxaeBalance = useCallback(
    async (
      amount: number,
      ledger: { kind: 'payment' | 'redemption'; titleEs: string; titleEn: string; details?: string }
    ): Promise<number> => {
      if (!Number.isFinite(amount) || amount <= 0) {
        return runLuxaeExclusive(async () => {
          const v = await getLuxaeBalance();
          setLuxaeBalanceState(v);
          return v;
        });
      }
      return runLuxaeExclusive(async () => {
        const current = await getLuxaeBalance();
        const next = Math.max(0, current - amount);
        await setLuxaeBalance(next);
        setLuxaeBalanceState(next);
        await appendWalletLedgerEntry({
          kind: ledger.kind,
          amountLuxae: -amount,
          titleEs: ledger.titleEs,
          titleEn: ledger.titleEn,
          details: ledger.details,
        });
        return next;
      });
    },
    [runLuxaeExclusive]
  );

  const value = useMemo(() => {
    const pricesForCalculation: CoinPrices = {
      ...(prices ?? MOCK_PRICES_USD),
      luxae: { usd: LUXAE_PRICE_USD },
    };
    const totalUsd = computeTotalUsd(pricesForCalculation, luxaeBalance);
    return {
      prices,
      loading,
      error,
      refetch: fetchPrices,
      pricesForCalculation,
      totalUsd,
      luxaeBalance,
      grantWelcomeBonus,
      grantThreeFieldsBonus,
      addLuxaeBalance,
      subtractLuxaeBalance,
      luxaeHydrated,
      refreshLuxaeBalance,
    };
  }, [
    prices,
    loading,
    error,
    fetchPrices,
    luxaeBalance,
    grantWelcomeBonus,
    grantThreeFieldsBonus,
    addLuxaeBalance,
    subtractLuxaeBalance,
    luxaeHydrated,
    refreshLuxaeBalance,
  ]);

  return (
    <WalletBalanceContext.Provider value={value}>
      {children}
    </WalletBalanceContext.Provider>
  );
}

export function useWalletBalance(): WalletBalanceContextValue {
  const ctx = useContext(WalletBalanceContext);
  const { currency } = useSettings();
  if (!ctx) {
    const pricesForCalculation = MOCK_PRICES_USD;
    const totalUsd = computeTotalUsd(pricesForCalculation, 0);
    const totalDisplay = currency === 'MXN' ? totalUsd * USD_TO_MXN : totalUsd;
    const luxaeDisplay = 0;
    return {
      prices: null,
      loading: false,
      error: null,
      refetch: async () => {},
      totalUsd,
      totalDisplay,
      formattedBalance: formatMoney(totalDisplay, currency),
      formattedLuxaeBalance: formatMoney(luxaeDisplay, currency),
      currency,
      pricesForCalculation: MOCK_PRICES_USD,
      luxaeBalance: 0,
      grantWelcomeBonus: async () => false,
      grantThreeFieldsBonus: async () => false,
      addLuxaeBalance: async () => 0,
      subtractLuxaeBalance: async () => 0,
      luxaeHydrated: true,
      refreshLuxaeBalance: async () => 0,
    };
  }
  const totalDisplay = currency === 'MXN' ? ctx.totalUsd * USD_TO_MXN : ctx.totalUsd;
  const luxaeUsd = ctx.luxaeBalance * (ctx.pricesForCalculation.luxae?.usd ?? LUXAE_PRICE_USD);
  const luxaeDisplay = currency === 'MXN' ? luxaeUsd * USD_TO_MXN : luxaeUsd;
  return {
    ...ctx,
    totalDisplay,
    formattedBalance: formatMoney(totalDisplay, currency),
    formattedLuxaeBalance: formatMoney(luxaeDisplay, currency),
    currency,
  };
}

export { TOKEN_SYMBOL, ERC20_TOKEN_NAME } from '../constants/luxToken';
export { MOCK_BALANCES, MOCK_PRICES_USD, USD_TO_MXN, LUXAE_PRICE_USD, WELCOME_BONUS_LUXAE, formatMoney };
