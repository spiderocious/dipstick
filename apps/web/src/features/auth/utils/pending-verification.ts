// Carries the phone (and dev OTP, in non-prod) from register → verify across a navigation,
// without a global store. Keyed by a const so the storage key is never inlined.

const PENDING_KEY = 'dipstick.pending_verification' as const;

export interface PendingVerification {
  readonly phone: string;
  readonly devOtp?: string;
}

export function setPendingVerification(value: PendingVerification): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(value));
}

export function getPendingVerification(): PendingVerification | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(PENDING_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as PendingVerification;
    return typeof parsed.phone === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingVerification(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(PENDING_KEY);
}
