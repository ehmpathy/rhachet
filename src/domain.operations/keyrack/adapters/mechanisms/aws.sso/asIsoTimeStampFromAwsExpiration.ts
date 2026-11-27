import { asIsoTimeStamp, type IsoTimeStamp } from 'iso-time';

/**
 * .what = cast the aws cli's AWS_CREDENTIAL_EXPIRATION into an IsoTimeStamp
 * .why = the cli writes an offset form (`2026-11-15T01:32:06+00:00`), which the strict
 *        IsoTimeStamp check rejects. cast it to utc `Z` form, so the real expiry is kept
 *        and never swapped for a guess
 *
 * .note = `null` for an absent or unparseable value; the caller picks the fallback
 */
export const asIsoTimeStampFromAwsExpiration = (input: {
  raw: string | null;
}): IsoTimeStamp | null => {
  if (!input.raw) return null;
  if (Number.isNaN(Date.parse(input.raw))) return null;
  return asIsoTimeStamp(input.raw);
};
