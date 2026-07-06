import { ConstraintError, MalfunctionError } from 'helpful-errors';
import type { PickOne } from 'type-fns';

import { asKeyrackAttemptSlug } from '../asKeyrackAttemptSlug';
import { asKeyrackKeyName } from '../asKeyrackKeyName';
import { formatKeyrackGetAllOutput } from '../cli/formatKeyrackGetOneOutput';
import { getKeyrackKeyGrants } from '../getKeyrackKeyGrants/getKeyrackKeyGrants';
import { isKeyrackGrantAttemptLocked } from '../isKeyrackGrantAttemptLocked';
import { asKeyrackAttemptDetail } from './asKeyrackAttemptDetail';
import { isKeyrackGrantAttemptCallerFix } from './isKeyrackGrantAttemptCallerFix';

/**
 * .what = the secrets projection over the get-or-unlock core: grant each selected key (with an
 *         optional auto-unlock) and hand back a { keyName: secret } map
 * .why = the brain creds path needs plain secret values, not grant attempts — this frees it from
 *        a manual `rhx keyrack unlock` step and from an over-unlock of the whole env (which drags
 *        in interactive keys like an aws sso profile)
 *
 * .note = absent (never set) / blocked (firewall) keys are caller-fix -> ConstraintError ✋
 * .note = a locked key with `with.unlock: false` is also caller-fix -> ConstraintError ✋
 *         (the caller must enable unlock or unlock manually)
 * .note = a key still locked after `with.unlock: true` ran -> MalfunctionError 💥
 * .note = unlock work + narrow-key scope live in the core (`getKeyrackKeyGrants`); this op only
 *         projects the attempts it returns into secrets or the right error
 */
export const getKeyrackKeySecrets = async (input: {
  for: PickOne<{ keys: string[]; repo: true }>;
  with: { unlock: boolean };
  owner: string;
  env: string;
}): Promise<Record<string, string>> => {
  const { owner, env } = input;

  // grant every selected key via the core (auto-unlock when opted in)
  const attempts = await getKeyrackKeyGrants({
    for: input.for,
    with: input.with,
    owner,
    env,
  });

  // caller-fix: absent/blocked always; a locked key too when unlock was not opted into —
  // an unlock cannot help (absent/blocked) or was not permitted (locked, unlock off)
  const callerFixAttempts = attempts.filter(
    (attempt) =>
      isKeyrackGrantAttemptCallerFix({ attempt }) ||
      (!input.with.unlock && isKeyrackGrantAttemptLocked({ attempt })),
  );
  if (callerFixAttempts.length)
    // forward keyrack's own treestruct stdout as the message — the exact output a caller
    // would see from `rhx keyrack get`, with each key's status + `tip` (fix) inline
    throw new ConstraintError(
      formatKeyrackGetAllOutput({ attempts: callerFixAttempts }),
      {
        // keys in alphabetical order so the serialized message body matches jest's
        // alphabetized `metadata` snapshot — one mental model, not two
        attempts: callerFixAttempts.map((attempt) =>
          asKeyrackAttemptDetail({
            key: asKeyrackKeyName({ slug: asKeyrackAttemptSlug({ attempt }) }),
            attempt,
          }),
        ),
        env,
        owner,
      },
    );

  // each ungranted key left over means unlock ran but the key stayed locked — a genuine malfunction
  const ungrantedAttempts = attempts.filter(
    (attempt) => attempt.status !== 'granted',
  );
  if (ungrantedAttempts.length)
    throw new MalfunctionError(
      `keyrack keys could not be unlocked: ${ungrantedAttempts
        .map((attempt) => asKeyrackAttemptSlug({ attempt }))
        .join(', ')}`,
      {
        // keys in alphabetical order so the serialized message body matches jest's
        // alphabetized `metadata` snapshot — one mental model, not two
        attempts: ungrantedAttempts.map((attempt) =>
          asKeyrackAttemptDetail({
            key: asKeyrackKeyName({ slug: asKeyrackAttemptSlug({ attempt }) }),
            attempt,
          }),
        ),
        env,
        owner,
      },
    );

  // every key is granted — collect secrets by key name
  return Object.fromEntries(
    attempts.map((attempt) => {
      if (attempt.status !== 'granted')
        throw new MalfunctionError('key unexpectedly not granted', { attempt });
      return [
        asKeyrackKeyName({ slug: attempt.grant.slug }),
        attempt.grant.key.secret,
      ];
    }),
  );
};
