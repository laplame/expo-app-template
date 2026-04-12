import { getAddress, Signature, TypedDataDomain, TypedDataField } from 'ethers';
import type { Http402Eip2612Challenge } from '../types/http402Payment';

export const PERMIT_PRIMARY_TYPE = 'Permit';

export function buildPermitTypedData(
  challenge: Http402Eip2612Challenge,
  owner: string,
  nonce: bigint
): {
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  primaryType: string;
  message: Record<string, bigint | string>;
} {
  const ownerAddr = getAddress(owner);
  const spender = getAddress(challenge.spender);
  const token = getAddress(challenge.token);
  const domain: TypedDataDomain = {
    name: challenge.name,
    version: challenge.version,
    chainId: challenge.chainId,
    verifyingContract: token,
  };
  const types: Record<string, TypedDataField[]> = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };
  const message = {
    owner: ownerAddr,
    spender,
    value: BigInt(challenge.value),
    nonce,
    deadline: BigInt(challenge.deadline),
  };
  return { domain, types, primaryType: PERMIT_PRIMARY_TYPE, message };
}

/** Payload para `eth_signTypedData_v4` (MetaMask / EIP-1193). */
export function typedDataForWalletV4(payload: ReturnType<typeof buildPermitTypedData>) {
  return {
    domain: {
      name: payload.domain.name,
      version: payload.domain.version,
      chainId: Number(payload.domain.chainId),
      verifyingContract: payload.domain.verifyingContract,
    },
    types: payload.types,
    primaryType: payload.primaryType,
    message: {
      owner: payload.message.owner,
      spender: payload.message.spender,
      value: (payload.message.value as bigint).toString(),
      nonce: (payload.message.nonce as bigint).toString(),
      deadline: (payload.message.deadline as bigint).toString(),
    },
  };
}

export function signatureToPermitParts(signatureHex: string): {
  v: number;
  r: string;
  s: string;
} {
  const sig = Signature.from(signatureHex);
  return { v: sig.v, r: sig.r, s: sig.s };
}

export function buildSettleBody(
  challenge: Http402Eip2612Challenge,
  owner: string,
  signatureHex: string
): Record<string, unknown> {
  const parts = signatureToPermitParts(signatureHex);
  const ownerAddr = getAddress(owner);
  return {
    scheme: challenge.scheme,
    resource: challenge.resource,
    owner: ownerAddr,
    signature: signatureHex,
    permit: {
      owner: ownerAddr,
      spender: getAddress(challenge.spender),
      value: challenge.value,
      deadline: String(challenge.deadline),
      v: parts.v,
      r: parts.r,
      s: parts.s,
    },
    ...(challenge.extra && typeof challenge.extra === 'object' ? challenge.extra : {}),
  };
}
