import { getKycForm, getQuickProfile, getUserName } from '../services/storage';

/**
 * Nombre público alineado con registro / KYC (NYC), para mostrar en Nostr sin exponer npub como titular.
 */
export async function getNostrLinkedDisplayName(): Promise<string> {
  const kyc = await getKycForm();
  const fromKyc = (kyc.fullName ?? kyc.name ?? kyc.nombre ?? '').trim();
  if (fromKyc) return fromKyc;
  const uname = (await getUserName())?.trim() ?? '';
  if (uname) return uname;
  const qp = await getQuickProfile();
  const qn = (qp?.name ?? '').trim();
  if (qn) return qn;
  return '';
}
