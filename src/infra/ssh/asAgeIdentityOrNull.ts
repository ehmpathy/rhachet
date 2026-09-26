import { asAgeIdentityResult } from './asAgeIdentityResult';

/**
 * .what = convert an ssh key path to an age identity, or null when the key
 *         cannot be converted in-process for an EXPECTED reason
 * .why  = the DISCOVERY pool builders (discovery, roundtrip-verify) need the same
 *         "try to convert this key, skip it if it is not an in-process-convertible
 *         key" step, and do NOT surface a per-key hint (a machine holds many keys;
 *         a skip is silent by design). so this is the thin projection of
 *         asAgeIdentityResult that drops the hint — one seam, no drift
 *
 * .note = the allowlist boundary lives in asAgeIdentityResult: ONLY BadRequestError
 *         (the expected "cannot convert in-process" caller-condition) becomes a
 *         null; every genuine fault surfaces loud (rule.forbid.failhide). the
 *         PRESCRIBED path uses asAgeIdentityResult directly to keep the actionable
 *         hint, per errors-name-the-fix
 */
export const asAgeIdentityOrNull = (input: {
  keyPath: string;
}): string | null => asAgeIdentityResult({ keyPath: input.keyPath }).identity;
