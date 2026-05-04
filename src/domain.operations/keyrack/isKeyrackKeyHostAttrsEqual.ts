import type { KeyrackKeyHost } from '@src/domain.objects/keyrack';

/**
 * .what = compares keyrack key host attributes for findsert equality
 * .why = extracts decode-friction from orchestrator
 *
 * .note = compares mech, vault, exid, env, org, vaultRecipient
 * .note = ignores timestamps (createdAt, updatedAt), maxDuration, slug
 */
export const isKeyrackKeyHostAttrsEqual = (input: {
  hostFound: KeyrackKeyHost;
  attrs: {
    mech: KeyrackKeyHost['mech'];
    vault: KeyrackKeyHost['vault'];
    exid: KeyrackKeyHost['exid'];
    env: KeyrackKeyHost['env'];
    org: KeyrackKeyHost['org'];
    vaultRecipient: KeyrackKeyHost['vaultRecipient'];
  };
}): boolean =>
  input.hostFound.mech === input.attrs.mech &&
  input.hostFound.vault === input.attrs.vault &&
  input.hostFound.exid === input.attrs.exid &&
  input.hostFound.env === input.attrs.env &&
  input.hostFound.org === input.attrs.org &&
  input.hostFound.vaultRecipient === input.attrs.vaultRecipient;
