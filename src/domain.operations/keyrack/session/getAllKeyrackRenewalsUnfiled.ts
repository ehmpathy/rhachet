import type { KeyrackDaemonUnlockRenewal } from '@src/domain.objects/keyrack/KeyrackDaemonUnlockRenewal';

/**
 * .what = the slugs sent for renew that the daemon did not file
 * .why = a daemon from a prior build stays alive while it holds keys, and it ignores
 *        `renewals`; its keys then die at their first upstream expiry with no mark in
 *        status. the unlock reply names what was filed, so the gap is computable here
 *
 * .note = `renewable: null` is a daemon too old to reply with the field, so every slug
 *         sent is unfiled
 */
export const getAllKeyrackRenewalsUnfiled = (input: {
  renewalsSent: KeyrackDaemonUnlockRenewal[];
  renewable: string[] | null;
}): string[] => {
  const renewable = new Set(input.renewable ?? []);
  return input.renewalsSent
    .map((renewal) => renewal.slug)
    .filter((slug) => !renewable.has(slug));
};
