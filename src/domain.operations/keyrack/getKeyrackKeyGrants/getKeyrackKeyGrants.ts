import type { PickOne } from 'type-fns';

import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { asKeyrackKeyReachExid } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachExid';
import { getGitRepoRootOrNull } from '@src/infra/git/getGitRepoRootOrNull';

import { asKeyrackAttemptSlug } from '../asKeyrackAttemptSlug';
import { asKeyrackKeyEnv } from '../asKeyrackKeyEnv';
import { asKeyrackKeyName } from '../asKeyrackKeyName';
import { genContextKeyrack } from '../genContextKeyrack';
import { genContextKeyrackGrantGet } from '../genContextKeyrackGrantGet';
import { getAllKeyrackGrantsByRepo } from '../getAllKeyrackGrantsByRepo';
import { getKeyrackKeyGrant } from '../getKeyrackKeyGrant';
import { getOneKeyrackGrantByKey } from '../getOneKeyrackGrantByKey';
import { isKeyrackGrantAttemptLocked } from '../isKeyrackGrantAttemptLocked';
import {
  asKeyrackAttemptAddress,
  asKeyrackAttemptReach,
} from '../reach/asKeyrackAttemptAddress';
import { assertKeyrackReachRequiresKey } from '../reach/assertKeyrackReachRequiresKey';
import { unlockKeyrackKeys } from '../session/unlockKeyrackKeys';
import { assertKeyrackUnlockIdentityAvailable } from './assertKeyrackUnlockIdentityAvailable';

/**
 * .what = the shared get-or-unlock core: get each selected key, and if `with.unlock` is set,
 *         unlock just the locked ones by name then re-get
 * .why = one place holds the unlock capability so every surface (brain secrets, sdk keyrack.get,
 *        cli keyrack get) projects from the same core rather than a duplicate of the unlock logic
 *
 * .note = returns raw KeyrackGrantAttempt[] and never throws on a key's status — each surface
 *         decides how to project (secrets map, stdout treestruct, exit codes)
 * .note = the first-pass get uses the light grant-get context (unlocked sources only, never the
 *         vault); unlock lazily escalates to the heavy context only on a lock miss, and only when
 *         the caller opted in via `with.unlock`
 * .note = only `locked` keys are unlock-fixable; `absent`/`blocked` pass through untouched
 * .note = a reach is an identity axis of one key, so it applies to the `keys` selector only.
 *         a repo sweep has no one reach to name — the same asymmetry that makes
 *         `unlock --reach` require `--key` (q2). the cli rejects the pair before it gets here
 */
export const getKeyrackKeyGrants = async (input: {
  for: PickOne<{ keys: string[]; repo: true }>;

  /**
   * .what = `unlock` escalates a locked key; `reaches` enumerates every declared reach
   * .why = `reaches` is opt-in per SURFACE, because the answer depends on the namespace the
   *        caller emits into. a structured surface (tree, json) holds N reaches per key
   *        and must show them all; a flat one (`export FOO=`, a secret map) holds ONE value
   *        per bare name and physically cannot, so it keeps the reachless value and
   *        announces the rest
   * .note = it applies to BOTH selectors. a `keys` ask that names no `reach` is exactly as
   *         reach-blind as a repo sweep, and to enumerate for one and not the other made the
   *         narrower ask return less truth about the same key
   * .note = default absent, so every extant caller sweeps exactly as it does today (e1)
   */
  with: { unlock: boolean; reaches?: boolean };

  owner: string | null;
  env: string | null;
  org?: string;

  /**
   * .what = the reach asked for; absent means the reachless key
   * .why = OPTIONAL, not nullable — and this is the one axis where that is a deliberate
   *        exception to `rule.forbid.undefined-inputs`. `reach` rides all the way into
   *        `KeyrackKeyGrant` and onto the daemon wire, where e16 requires it be DROPPED
   *        by `JSON.stringify` when absent. `null` survives serialization; `undefined`
   *        does not — so a nullable input would have to convert at every object seam,
   *        which reintroduces the same silent `undefined` one layer down
   * .note = the drop hazard the rule guards is covered structurally instead: a reach-ask
   *         that finds no key THROWS (e6), and `os.envvar` refuses one outright (e20/q9),
   *         so a dropped reach cannot be answered by another reach's credential
   */
  reach?: KeyrackKeyReach;

  allow?: { dangerous?: boolean };
}): Promise<KeyrackGrantAttempt[]> => {
  const { for: selector, owner, env, org, reach, allow } = input;

  // a reach names ONE reach of ONE key, so it cannot ride a whole-repo sweep (q2). the cli
  // guards this too, but an sdk caller reaches this operation directly — and without a guard
  // here the reach would be threaded into the sweep and silently narrow keys it was never
  // meant to touch. the domain operation owns its own invariant, as unlockKeyrackKeys does
  //
  // ⚠️ `keyed` is a ONE-key test, not a not-repo test, and the difference is the whole guard.
  //    a `keys: ['A','B','C']` ask names keys, so `!selector.repo` reads it as keyed and lets
  //    it through — after which the loop below threads the SAME reach into all three. that is
  //    the exact bulk-reach ambiguity this assert exists to refuse, merely spelled with a
  //    literal list instead of a repo flag. an N-key ask IS a sweep of N
  //
  // .note = no production caller can reach the tightened branch today: `getKeyrackKeySecrets`
  //         passes many keys but holds no `reach` at all, and the sdk narrows `for.key` to a
  //         one-element array. so this closes a hole before it opens, which is the only clean
  //         time to close it — `assertKeyrackReachRequiresKey`'s own note says the strict form
  //         is the loosenable direction, and that to tighten after callers depend on the
  //         looseness is not a clean rework
  assertKeyrackReachRequiresKey({
    reach,
    keyed: selector.keys?.length === 1,
    hint: reach
      ? `name exactly one key — rhx keyrack get --key $KEY --reach ${asKeyrackKeyReachExid({ reach })}`
      : '',
  });

  // derive gitroot + light get-context (reads unlocked sources only, never the vault).
  // null-tolerant: a machine-wide @all key must be gettable from a cwd that is not a git repo
  // (a credential helper from a bare clone) — a null gitroot yields a null repo manifest, and
  // the @all read path needs no repo manifest.
  const gitroot = await getGitRepoRootOrNull({ from: process.cwd() });
  const contextGet = await genContextKeyrackGrantGet({ gitroot, owner });

  // first pass: get every selected key from already-unlocked sources
  const attemptsInitial = await (async (): Promise<KeyrackGrantAttempt[]> => {
    if (selector.repo)
      return getAllKeyrackGrantsByRepo(
        { env, allow, with: { reaches: input.with.reaches } },
        contextGet,
      );
    // a named key on a STRUCTURED surface enumerates every reach it declares, exactly as the
    // repo sweep does. before this, the two branches of ONE command disagreed — `--for repo`
    // carried `reaches: true` and `--key` did not — so a human who narrowed a sweep to one
    // key silently lost every reach of it. the narrower ask returned LESS truth about the
    // same key, which is the surprise `rule.forbid.surprises` exists to refuse
    // .note = an explicit `reach` never expands: the caller named ONE reach and gets it
    // .note = `reaches` defaults absent, so every flat surface (`source`, the secrets map)
    //         and every extant caller is byte-identical (e1)
    const attemptsPerKey = await Promise.all(
      selector.keys.map(async (key) => {
        const attemptAsAsked = await getOneKeyrackGrantByKey(
          { key, env, org, reach, allow },
          contextGet,
        );
        if (reach || !input.with.reaches) return [attemptAsAsked];

        // the repo manifest is the only store a GET context holds — it is deliberately built
        // without the host manifest so `get` never prompts for a passphrase. so this
        // enumerates what the repo DECLARED; a reach held off-manifest stays invisible here.
        // that is a bound of `reaches: true`, not a defect — a caller that wants an off-manifest
        // reach names it, and `keyrack list` renders every reach this host holds
        const slug = asKeyrackAttemptSlug({ attempt: attemptAsAsked });
        const reachesDeclared = contextGet.repoManifest?.keys[slug]?.reaches;
        if (!reachesDeclared?.length) return [attemptAsAsked];

        const attemptsAtReach = await Promise.all(
          reachesDeclared.map((reachDeclared) =>
            getKeyrackKeyGrant(
              { for: { key: slug }, reach: reachDeclared, allow },
              contextGet,
            ),
          ),
        );
        return [attemptAsAsked, ...attemptsAtReach];
      }),
    );
    return attemptsPerKey.flat();
  })();

  // without an unlock opt-in, return the pure first-pass result unchanged
  if (!input.with.unlock) return attemptsInitial;

  // locked is the only status an unlock can advance to granted
  const lockedAttempts = attemptsInitial.filter((attempt) =>
    isKeyrackGrantAttemptLocked({ attempt }),
  );
  if (!lockedAttempts.length) return attemptsInitial;

  // build one shared heavy context so the host manifest decrypts at most once.
  // a null gitroot (non-repo cwd) means no repo manifest — the @all unlock path handles it.
  const repoManifest = gitroot
    ? await daoKeyrackRepoManifest.get({ gitroot })
    : null;
  const contextUnlock = genContextKeyrack({ owner, repoManifest, gitroot });

  // derive each locked key's ADDRESS — its slug and the reach it asked for
  // .why = a repo sweep that enumerates reaches yields several attempts per slug, so a
  //        slug-keyed unlock would unlock one reach and then report its status for every
  //        peer. the unlock is per (slug, reach), and so is the merge below
  // .note = a reachless attempt's reach is `undefined`, so this is byte-identical for every
  //         key that declares no reach (e1)
  const lockedTargets = lockedAttempts.map((attempt) => ({
    slug: asKeyrackAttemptSlug({ attempt }),
    reach: asKeyrackAttemptReach({ attempt }),
    address: asKeyrackAttemptAddress({ attempt }),
  }));
  const lockedKeyNames = lockedTargets.map((target) =>
    asKeyrackKeyName({ slug: target.slug }),
  );

  // assert an unlock identity is discoverable before the unlock loop runs
  await assertKeyrackUnlockIdentityAvailable(
    { owner, env: env ?? 'all', keys: lockedKeyNames },
    contextUnlock,
  );

  // unlock each locked key at its own reach (sequential; context reused so manifest
  // decrypts once)
  // .note = the reach comes from the ATTEMPT, never from the caller's `reach`. under a
  //         repo sweep the caller names no reach at all (q2), yet each attempt knows the
  //         one it asked for — so the attempt is the only honest source
  for (const target of lockedTargets)
    await unlockKeyrackKeys(
      {
        owner,
        env: asKeyrackKeyEnv({ slug: target.slug }) || 'all',
        key: asKeyrackKeyName({ slug: target.slug }),
        reach: target.reach,
      },
      contextUnlock,
    );

  // re-get each unlocked key at its own address now that the daemon holds it
  const attemptsRegotByAddress = new Map<string, KeyrackGrantAttempt>(
    await Promise.all(
      lockedTargets.map(
        async (target) =>
          [
            target.address,
            await getKeyrackKeyGrant(
              { for: { key: target.slug }, reach: target.reach, allow },
              contextGet,
            ),
          ] as const,
      ),
    ),
  );

  // merged view: a re-got attempt overrides its initial locked status, order preserved
  // .why = keyed by ADDRESS, not slug. a slug key would let one reach's re-got status
  //        overwrite every peer that shares its slug — the silent eviction reach-as-identity
  //        exists to remove, reintroduced at the very last line of the pipeline
  return attemptsInitial.map(
    (attempt) =>
      attemptsRegotByAddress.get(asKeyrackAttemptAddress({ attempt })) ??
      attempt,
  );
};
