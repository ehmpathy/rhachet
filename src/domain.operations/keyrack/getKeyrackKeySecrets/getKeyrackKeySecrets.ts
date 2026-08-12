import { ConstraintError, MalfunctionError } from 'helpful-errors';
import type { PickOne } from 'type-fns';

import { asKeyrackAttemptSlug } from '../asKeyrackAttemptSlug';
import { asKeyrackKeyName } from '../asKeyrackKeyName';
import { assertKeyrackExportNamesDistinct } from '../assertKeyrackExportNamesDistinct';
import { formatKeyrackGetAllOutput } from '../cli/formatKeyrackGetOneOutput';
import { getKeyrackKeyGrants } from '../getKeyrackKeyGrants/getKeyrackKeyGrants';
import { isKeyrackGrantAttemptLocked } from '../isKeyrackGrantAttemptLocked';
import { asKeyrackAttemptReach } from '../reach/asKeyrackAttemptAddress';
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
  // .note = `reaches: true` — this surface returns a FLAT map, one value per bare key name, so
  //         it cannot carry a reach. it asks for them anyway so each one can be ANNOUNCED
  //         below rather than dropped in silence. the flag applies to the repo sweep only; a
  //         `for.keys` ask is unaffected, so that branch is byte-identical (e1)
  const attemptsAtAnyReach = await getKeyrackKeyGrants({
    for: input.for,
    with: { ...input.with, reaches: true },
    owner,
    env,
  });

  // split by what a flat namespace can carry
  // .why = the returned map is keyed by BARE key name, so a reach-held key can never sit beside
  //        its reachless peer. the reach ones must stay OUTSIDE every gate below — a merely
  //        locked reach must not fail the whole secrets fetch, which is the credential a
  //        brain actually asked for. identical split, identical reason, as `sourceAllKeysIntoEnv`
  // .note = a repo that declares no reach yields no reach attempt at all, so every set below
  //         is identical to today's (e1)
  const attempts = attemptsAtAnyReach.filter(
    (attempt) => !asKeyrackAttemptReach({ attempt }),
  );

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

  // refuse to flatten when two keys would claim one secret-map key
  // .why = the map returned below is keyed by BARE key name, so it is the same flat namespace
  //        a shell export lands in — and `Object.fromEntries` resolves a clash by silently
  //        retention of the LAST. that is the identical loss the cli `source` guards (e23/q11),
  //        and it is worse here: a brain receives one credential with no hint another was lost
  // .note = before this call the three flatten surfaces disagreed — the cli THREW,
  //         `sourceAllKeysIntoEnv` kept the FIRST, and this kept the LAST. one collision, three
  //         answers. the assertion states it once for all three
  // .note = the hints name a keys-array fix rather than a `--key` flag, because this is the
  //         brain-creds path and its caller holds an input object, never a cli flag
  // .note = the REACH axis stays dead at THIS guard, and the hint says so rather than offer a
  //         fix this contract cannot accept. the guard is fed the FILTERED set, so a reach
  //         cannot reach it — and that filter carries weight rather than merely tidies: to hand
  //         it the raw enumerate would make it throw for every repo that declares a reach,
  //         which is the refusal `asKeyrackReachOmittedNotice` exists to avoid, arrived at by
  //         accident. verified 2026-08-07 at both entry paths, re-verified after the enumerate:
  //           - `for.keys`  — `getKeyrackKeyGrants` asks every key with ONE `reach` value, so
  //                           two attempts can never differ on it. `reaches` is repo-sweep-only
  //           - `for.repo`  — the sweep now DOES enumerate reaches, and every one of them
  //                           is filtered out above before this guard sees the set
  //         and this input holds no `reach` at all to thread, deliberately: a reach names one
  //         reach of ONE key (q2), so a single field beside `keys: string[]` would be the
  //         bulk-reach ambiguity `assertKeyrackReachRequiresKey` exists to refuse. so a reach
  //         collision here is a WIRE defect, never a caller's, and the hint points at the wire
  // .note = ⚠️ the ENV and ORG axes are BOTH live, and which one fires depends on whether the
  //         repo declares a keyrack.yml. an earlier draft of this note claimed the env axis was
  //         the only live one, which would have sent an org collision to a `narrow env` hint
  //         that cannot separate two orgs (rule.require.errors-name-the-fix):
  //           - ENV — `for.repo` with `env: 'all'` sweeps every declared env, so one key name
  //                   declared under two envs collides. this predates reach
  //           - ORG — with a repo manifest, `asKeyrackKeySlug` throws ORG_MISMATCH, so one
  //                   manifest means one org and the axis is closed. WITHOUT one, a full slug
  //                   passes through verbatim (`getOneKeyrackGrantByKey`), so a brain that
  //                   names `orgA.prep.FOO` and `orgB.prep.FOO` from a manifest-less repo
  //                   reaches it — a real shape, since a brain runs wherever it is invoked
  assertKeyrackExportNamesDistinct({
    attempts,
    hints: {
      forReachCollision:
        'this path asks reachlessly, so two reaches cannot both arrive here — a reach was threaded in upstream; fix the caller of getKeyrackKeySecrets, not the ask',
      forEnvCollision:
        'ask for one env at a time; narrow `env`, or name fewer keys',
      forOrgCollision:
        'ask for one org at a time; name fewer keys — `env` cannot separate two orgs, and a repo with a keyrack.yml refuses a foreign org outright',
    },
  });

  // .note = the returned `Record<string, string>` holds ONE value per bare key name, so a reach
  //         held beside a slug is not handed back, and this path says no word about it. that
  //         silence is DELIBERATE (2026-08-12), and identical on all three flatten surfaces —
  //         the cli `source`, the sdk `sourceAllKeysIntoEnv`, and here — so one fact reads one
  //         way (rule.forbid.ambiguous-labels). reach is opt-in; a caller who wants one fetches
  //         it by name, and `keyrack list` renders which reaches this host holds
  // .note = the value handed back is the CORRECT one. a reach is simply not among what a flat
  //         map can carry — "fewer than exist", never "the wrong one"

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
