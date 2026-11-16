import { ConstraintError } from 'helpful-errors';

import type { KeyrackGrantMechanism } from '@src/domain.objects/keyrack';

import { asKeyrackMechOfSource } from './asKeyrackMechOfSource';

/**
 * .what = refuse a mech that disagrees with the mech its stored source names
 * .why = `get` refuses a host-manifest mech that a blob contradicts; `set` must refuse the same
 *        pair up front, or it stores a key every later `get` refuses
 *
 * .note = a source that names no mech (a plain value) agrees with any mech, save one: a
 *         github-app blob that names no mech is still a github-app blob, so a replica mech over
 *         it would hand the private key out as the "token"
 */
export const assertOsSecureMechAgreesWithSource = (input: {
  mech: KeyrackGrantMechanism | null;
  source: string;
  slug: string;
}): void => {
  // a mech the source names; a mech-less blob of github-app shape reads as github-app
  const mechOfSource = asKeyrackMechOfSource({ source: input.source });
  if (input.mech === null) return;
  if (mechOfSource === 'PERMANENT_VIA_REPLICA') return;
  if (input.mech === mechOfSource) return;

  // the two disagree; the blob's own mech is the one a set can honor
  throw new ConstraintError('mech mismatch: host manifest and blob disagree', {
    hostManifestMech: input.mech,
    blobMech: mechOfSource,
    slug: input.slug,
    hint: `the blob is ${mechOfSource}: set the key with --mech ${mechOfSource}, or drop --mech to read it from the blob`,
  });
};
