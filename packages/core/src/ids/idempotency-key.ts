// Lightweight client-side idempotency key. Not cryptographically strong —
// good enough to pair a single user action with one server-side outcome.
export const idempotencyKey = (prefix = 'idem'): string => {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
};
