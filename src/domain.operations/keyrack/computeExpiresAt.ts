import { asIsoTimeStamp, type IsoTimeStamp } from 'iso-time';

/**
 * .what = compute expiration timestamp with optional duration cap
 * .why = extracts date manipulation from orchestrators for narrative readability
 *
 * .note = returns ISO timestamp for expiresAt
 * .note = logs notice if capped to maxDuration
 */
export const computeExpiresAt = (input: {
  requestedDurationMs: number;
  maxDurationMs: number | null;
  effectiveSlug: string;
  maxDurationLabel: string | null;
}): { expiresAt: IsoTimeStamp; effectiveDurationMs: number } => {
  let effectiveDurationMs = input.requestedDurationMs;

  if (
    input.maxDurationMs !== null &&
    input.requestedDurationMs > input.maxDurationMs
  ) {
    effectiveDurationMs = input.maxDurationMs;
    console.warn(
      `⚠️ duration capped to ${input.maxDurationLabel} for key ${input.effectiveSlug} (maxDuration limit)`,
    );
  }

  const nowMs = Date.now();
  const expiresAtDate = new Date(nowMs + effectiveDurationMs);
  const expiresAt = asIsoTimeStamp(expiresAtDate);

  return { expiresAt, effectiveDurationMs };
};
