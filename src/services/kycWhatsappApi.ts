const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://damecodigo.com/api';

export interface RequestWhatsappCodeResult {
  ok: boolean;
  verificationId?: string;
  expiresAt?: string;
  message?: string;
  error?: string;
}

export interface VerifyWhatsappCodeResult {
  ok: boolean;
  verified?: boolean;
  verifiedAt?: string;
  message?: string;
  error?: string;
}

function errorFromJson(json: any, fallback: string): string {
  return String(json?.message ?? json?.error ?? fallback);
}

/**
 * Solicita al backend enviar un OTP por WhatsApp.
 * El envio real debe hacerse en servidor con WhatsApp Business/Twilio; la app
 * solo pide el codigo para no exponer credenciales.
 */
export async function requestKycWhatsappCode(phone: string): Promise<RequestWhatsappCodeResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/kyc/whatsapp/request-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) {
      return { ok: false, error: errorFromJson(json, `HTTP ${res.status}`) };
    }
    const data = json?.data ?? json;
    return {
      ok: true,
      verificationId: data?.verificationId ?? data?.id,
      expiresAt: data?.expiresAt,
      message: json?.message ?? data?.message,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Network error' };
  }
}

export async function verifyKycWhatsappCode(params: {
  phone: string;
  code: string;
  verificationId?: string;
}): Promise<VerifyWhatsappCodeResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/kyc/whatsapp/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) {
      return { ok: false, verified: false, error: errorFromJson(json, `HTTP ${res.status}`) };
    }
    const data = json?.data ?? json;
    return {
      ok: true,
      verified: data?.verified !== false,
      verifiedAt: data?.verifiedAt ?? new Date().toISOString(),
      message: json?.message ?? data?.message,
    };
  } catch (e: any) {
    return { ok: false, verified: false, error: e?.message ?? 'Network error' };
  }
}
