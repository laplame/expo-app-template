import 'react-native-get-random-values';
import { Wallet } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import { ERC20_TOKEN_NAME, TOKEN_SYMBOL } from '../constants/luxToken';
import { addWalletAddress, type WalletAddressItem } from './storage';

const PK_KEY_PREFIX = 'link4deal_polygon_pk_';

export async function createLink4DealPolygonWallet(): Promise<WalletAddressItem> {
  const w = Wallet.createRandom();
  const item = await addWalletAddress(
    w.address,
    'link4deal',
    `${TOKEN_SYMBOL} · ERC-20 ${ERC20_TOKEN_NAME}`,
    'polygon'
  );
  if (!item) {
    throw new Error('DUPLICATE_OR_INVALID');
  }
  await SecureStore.setItemAsync(`${PK_KEY_PREFIX}${item.id}`, w.privateKey);
  return item;
}

export async function deleteStoredPolygonPrivateKey(walletId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(`${PK_KEY_PREFIX}${walletId}`);
  } catch {
    // ignore
  }
}
