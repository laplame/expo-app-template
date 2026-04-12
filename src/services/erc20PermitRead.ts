import { Contract, JsonRpcProvider } from 'ethers';
import { POLYGON_RPC_URL } from '../constants/paidContent';

const NONCES_ABI = ['function nonces(address owner) view returns (uint256)'];

export async function readErc20PermitNonce(
  tokenAddress: string,
  ownerAddress: string,
  rpcUrl: string = POLYGON_RPC_URL
): Promise<bigint> {
  const provider = new JsonRpcProvider(rpcUrl);
  const c = new Contract(tokenAddress, NONCES_ABI, provider);
  const n = await c.nonces!(ownerAddress);
  return BigInt(n.toString());
}
