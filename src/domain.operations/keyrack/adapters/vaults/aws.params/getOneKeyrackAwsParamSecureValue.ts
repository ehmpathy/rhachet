import { ConstraintError } from 'helpful-errors';

import type { KeyrackKeyHostMeta } from '@src/domain.objects/keyrack/KeyrackKeyHostMeta';

import { asKeyrackAwsParamCredsEnv } from './asKeyrackAwsParamCredsEnv';
import type { KeyrackAwsParamIdentity } from './asKeyrackAwsParamIdentity';
import { getOneKeyrackAwsParam } from './getOneKeyrackAwsParam';
import { getOneKeyrackAwsParamReadyContext } from './getOneKeyrackAwsParamReadyContext';

/**
 * .what = read + decrypt the SecureString the reference points at, through the org-scope identity,
 *         then run the value gates (5 absent, 6 not-SecureString, 6b empty) — the ONE seam shared
 *         by get() (unlock pulls into the daemon) and set() (a reference set verifies the pointer
 *         reads back before it registers)
 * .why = a reference stores only a pointer keyrack never wrote, so a typo'd exid/org/env/region
 *        would otherwise first surface at a later, possibly unattended, unlock. one shared read
 *        seam lets set verify the exact same path unlock will walk — same identity, same gates —
 *        so a broken pointer fails loud while a human is present
 *
 * .note = this is the read half only; the caller (get) maps the returned value through the mech
 *         adapter into a KeyrackKeyGrant, the caller (set) discards the value and keeps only the
 *         proof it read back
 */
export const getOneKeyrackAwsParamSecureValue = async (input: {
  slug: string;
  exid: string | null | undefined;
  meta: KeyrackKeyHostMeta | null;
  // the resolved AWS identity this read authenticates as (the --org hardcut) — imds for @all, the
  // org's declared profile for a specific org. resolved ONCE by the caller (the vault adapter at
  // set, the batch driver at unlock), so this leaf never re-derives org or re-decides the identity
  identity: KeyrackAwsParamIdentity;
}): Promise<{ value: string; type: string }> => {
  // shared pre-SSM prechecks (gate 0a exid present + gate 0 name + gate 1 peer + gate 3 region);
  // the seam returns the validated exid + region + the SSM endpoint (null in prod, emulator in test)
  const { declastruct, region, exid, endpoint } =
    await getOneKeyrackAwsParamReadyContext({
      exid: input.exid,
      meta: input.meta,
    });

  // project the resolved identity to the env overlay the SDK reads: a specific org's profile
  // selects AWS_PROFILE; @all clears it so the default chain derives the grove's IMDS role
  const credsEnv = asKeyrackAwsParamCredsEnv({ identity: input.identity });

  // fetch + decrypt; a raw AWS denial becomes a classed gate (2/4/7) inside this seam
  const result = await getOneKeyrackAwsParam(
    { exid, region, credsEnv, endpoint },
    { declastruct },
  );

  // gate 5 — param absent (ParameterNotFound → null)
  if (result === null)
    ConstraintError.throw('aws.params param is absent', {
      exid,
      region,
      hint: 'create/place the param at this path IN THIS REGION, or fix the reference (--exid) / region it points at',
    });

  // gate 6 — a plaintext String is never emitted as a secret
  if (result.type !== 'SecureString')
    ConstraintError.throw(
      'aws.params param must be a SecureString (a decryptable secret)',
      {
        exid,
        region,
        type: result.type,
        hint: 're-store the param as a SecureString (type String is never emitted as a secret)',
      },
    );

  // gate 6b — a present but empty value is never emitted as a valid grant
  if (result.value === '')
    ConstraintError.throw('aws.params param is present but empty', {
      exid,
      region,
      hint: 're-store a non-empty SecureString value at this path',
    });

  return { value: result.value, type: result.type };
};
