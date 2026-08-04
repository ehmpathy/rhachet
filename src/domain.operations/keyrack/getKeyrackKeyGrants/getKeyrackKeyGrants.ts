import type { PickOne } from 'type-fns';

import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';
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
 */
export const getKeyrackKeyGrants = async (input: {
  for: PickOne<{ keys: string[]; repo: true }>;
  with: { unlock: boolean };
  owner: string | null;
  env: string | null;
  org?: string;
  allow?: { dangerous?: boolean };
}): Promise<KeyrackGrantAttempt[]> => {
  const { for: selector, owner, env, org, allow } = input;

  // derive gitroot + light get-context (reads unlocked sources only, never the vault).
  // null-tolerant: a machine-wide @all key must be gettable from a cwd that is not a git repo
  // (a credential helper from a bare clone) — a null gitroot yields a null repo manifest, and
  // the @all read path needs no repo manifest.
  const gitroot = await getGitRepoRootOrNull({ from: process.cwd() });
  const contextGet = await genContextKeyrackGrantGet({ gitroot, owner });

  // first pass: get every selected key from already-unlocked sources
  const attemptsInitial = await (async (): Promise<KeyrackGrantAttempt[]> => {
    if (selector.repo)
      return getAllKeyrackGrantsByRepo({ env, allow }, contextGet);
    return Promise.all(
      selector.keys.map((key) =>
        getOneKeyrackGrantByKey({ key, env, org, allow }, contextGet),
      ),
    );
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

  // derive each locked key's slug (repo mode may span envs, so scope unlock per slug)
  const lockedSlugs = lockedAttempts.map((attempt) =>
    asKeyrackAttemptSlug({ attempt }),
  );
  const lockedKeyNames = lockedSlugs.map((slug) => asKeyrackKeyName({ slug }));

  // assert an unlock identity is discoverable before the unlock loop runs
  await assertKeyrackUnlockIdentityAvailable(
    { owner, env: env ?? 'all', keys: lockedKeyNames },
    contextUnlock,
  );

  // unlock each locked key by name+env (sequential; context reused so manifest decrypts once)
  for (const slug of lockedSlugs)
    await unlockKeyrackKeys(
      {
        owner,
        env: asKeyrackKeyEnv({ slug }) || 'all',
        key: asKeyrackKeyName({ slug }),
      },
      contextUnlock,
    );

  // re-get each unlocked key by its slug now that the daemon holds it
  const attemptsRegotBySlug = new Map<string, KeyrackGrantAttempt>(
    await Promise.all(
      lockedSlugs.map(
        async (slug) =>
          [
            slug,
            await getKeyrackKeyGrant({ for: { key: slug }, allow }, contextGet),
          ] as const,
      ),
    ),
  );

  // merged view: a re-got attempt overrides its initial locked status, order preserved
  return attemptsInitial.map(
    (attempt) =>
      attemptsRegotBySlug.get(asKeyrackAttemptSlug({ attempt })) ?? attempt,
  );
};
