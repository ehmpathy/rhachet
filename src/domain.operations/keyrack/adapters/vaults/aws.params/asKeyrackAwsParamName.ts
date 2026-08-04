import { ConstraintError } from 'helpful-errors';

import { isKeyrackAwsParamName } from './isKeyrackAwsParamName';

/**
 * .what = derive the SSM parameter name from a key's coordinates
 * .why = the autocompute path is a stable, versioned contract the out-of-band
 *        value-writer must match; one source of truth avoids drift
 *
 * .note = the '/v1/' segment is a fixed version marker: a future template change is
 *         additive ('/v2/') not destructive, so v1 params stay readable
 */
export const asKeyrackAwsParamName = (input: {
  owner: string;
  org: string;
  env: string;
  key: string;
}): string => {
  // owner is mandatory — an absent segment would strand the param
  if (!input.owner)
    ConstraintError.throw('aws.params requires an owner in the param name', {
      input,
      hint: 'pass --owner so the param name is complete',
    });

  // @all is the machine-wide (grove) org sentinel — a key scoped to the whole machine, retrievable
  // from any repo or none. its '@' is outside SSM's legal charset, so substitute a reserved legal
  // segment. @all keys are keyrack-owned (keyrack writes AND reads the blob), so this substitution
  // only has to stay stable across set/get — there is no out-of-band writer to coordinate with. a
  // literal org can never start with '@' (that prefix is the keyrack scope sentinel), so the
  // substitution is unambiguous
  const orgSegment = input.org === '@all' ? '_all_' : input.org;

  // hierarchy segments only, so every char stays within SSM's legal set
  const name = `/keyrack/infra/vault/aws.params/v1/${input.owner}/${orgSegment}/${input.env}/${input.key}`;

  // self-validate the output: coordinates are free-form upstream strings, so a stray
  // char (a space, an '=') would yield an illegal name — the same gate the explicit-exid
  // arm uses, so both call sites collapse onto one validation source
  return isKeyrackAwsParamName.assure(name);
};
