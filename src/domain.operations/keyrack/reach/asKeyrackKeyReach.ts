import { ConstraintError } from 'helpful-errors';

import { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';

/**
 * .what = characters a reach exid may not hold
 * .why = the exid rides inside a key ADDRESS (`$slug@$exid`) and inside the encrypted
 *        host manifest's keys, so whitespace would make an address unreadable to a human
 *        who scans `keyrack status` or the manifest
 *
 * .note = `@` is ALLOWED, because an email is the obvious exid for an account juggle
 *         (`--reach beav@ehmpathy.com`). the address stays injective anyway: a slug never
 *         holds an `@` except as its leading `@all` wildcard, so `$slug@$exid` cannot be
 *         split two ways. and no reader ever splits it — the address is construct-only
 */
const REACH_EXID_FORBIDDEN = /\s/;

/**
 * .what = cast a plaintext reach exid into the reach it names
 * .why = one parser serves the cli flag, the repo manifest, and the store key — so a
 *        manifest can never legalize what the flag rejects, and there is no second
 *        implementation to drift
 *
 * .note = a reach is PLAINTEXT and opaque. keyrack does not interpret it, does not know
 *         what reach it names, and never guesses one. it is a qualifier on the key
 *         name — the store simply looks in a different spot for the value
 * .note = the ONE mech that interprets an exid is EPHEMERAL_VIA_GITHUB_APP, which
 *         must mint FOR a reach and so requires the `github://org=$org` convention.
 *         that check lives in the mech, not here — an exid is legal on its own terms
 */
export const asKeyrackKeyReach = (input: { exid: string }): KeyrackKeyReach => {
  const exid = input.exid.trim();

  if (!exid)
    throw new ConstraintError(
      'a reach exid may not be empty: a reach names which copy of a key this is, so an empty name names no copy',
      { hint: 'give it a plaintext exid — --reach $exid' },
    );

  if (REACH_EXID_FORBIDDEN.test(exid))
    throw new ConstraintError(
      `a reach exid may not hold whitespace: '${exid}' — the exid rides inside a key address ($slug@$exid) and inside the encrypted host manifest's keys, so a space would make the address unreadable to a human who scans keyrack status`,
      {
        exid,
        hint: 'use a plaintext exid with no spaces — e.g. --reach beav@ehmpathy.com',
      },
    );

  return new KeyrackKeyReach({ exid });
};
