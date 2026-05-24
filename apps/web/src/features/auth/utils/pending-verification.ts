// Carries the verification queue (which channels still need an OTP, each with its target and
// — in non-prod — the dev code) from register/login → verify across navigations, without a
// global store. Keyed by a const so the storage key is never inlined.
//
// The backend's verification policy (none|email|phone|both) decides the queue: it may be
// empty (policy `none` → no verify step), one channel, or two (policy `both`). The verify
// screen works through the queue in order and only routes onward when it's empty.

const PENDING_KEY = 'dipstick.pending_verification' as const;

export type OtpChannel = 'email' | 'phone';

export interface PendingChannel {
  readonly channel: OtpChannel;
  readonly target: string;
  readonly devOtp?: string;
}

export interface PendingVerification {
  readonly channels: readonly PendingChannel[];
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
    return Array.isArray(parsed.channels) && parsed.channels.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingVerification(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(PENDING_KEY);
}
