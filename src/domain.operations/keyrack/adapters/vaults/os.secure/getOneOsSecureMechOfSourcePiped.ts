import { ConstraintError } from 'helpful-errors';

import type { KeyrackGrantMechanism } from '@src/domain.objects/keyrack';

import { asKeyrackMechOfSource } from './asKeyrackMechOfSource';

/**
 * .what = the mech a piped source names for a set with no --mech, or a refusal
 * .why = a pipe with no --mech must never fall back to a plain replica: ciphertext from an
 *        `aws ssm get-parameter` run without `--with-decryption`, or a truncated blob, would be
 *        stored as a "valid" secret and handed back verbatim as the token
 *
 * .note = the mech comes from `asKeyrackMechOfSource`; where it reads replica, the value names
 *         no mech, so the caller must. the refusal never echoes the value
 */
export const getOneOsSecureMechOfSourcePiped = (input: {
  source: string;
  slug: string;
}): KeyrackGrantMechanism => {
  // the mech the source names
  const mechOfSource = asKeyrackMechOfSource({ source: input.source });
  if (mechOfSource !== 'PERMANENT_VIA_REPLICA') return mechOfSource;

  // no mech can be read from the value: the caller must name it
  throw new ConstraintError('--source @stdin names no mech; pass --mech', {
    slug: input.slug,
    hint: 'for a github-app blob, pass --mech EPHEMERAL_VIA_GITHUB_APP; the value was not stored; if it came from aws ssm, check --with-decryption',
  });
};
