/**
 * .what = compute minutes until expiration from an ISO timestamp
 * .why = extracts date manipulation from orchestrators for narrative readability
 *
 * .note = returns null if expiresAt is null
 * .note = returns negative if already expired
 */
export const asExpiresInMinutes = (input: {
  expiresAt: string | null;
}): number | null => {
  if (!input.expiresAt) return null;
  const expiresAtMs = new Date(input.expiresAt).getTime();
  const nowMs = Date.now();
  return Math.round((expiresAtMs - nowMs) / 1000 / 60);
};
