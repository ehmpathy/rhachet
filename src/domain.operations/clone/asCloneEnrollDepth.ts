import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

/**
 * .what = the deepest enroll chain this repo permits — a human's clone may enroll a
 *   peer, and that peer may enroll no one
 * .why =
 *   - an enroll chain is unbounded by nature: every clone carries the same CLI, so
 *     a clone that may enroll can enroll a clone that may enroll. with no bound the
 *     chain forks until the host runs out of ptys, and each link costs a real brain
 *   - depth 1 is the budget the wisher named. it buys the ONE capability the peer
 *     motive needs — a clone stands up a peer and talks to it — and buys no more
 *
 * .note = a BUDGET, never a fact about a clone. the depth a clone sits at is a fact
 *   (`CLONE_ENV_KEYS.depth`); this is the largest such fact we permit to be minted
 */
export const CLONE_ENROLL_DEPTH_MAX = 1;

/**
 * .what = the depth the clone THIS enroll is about to mint would be born at
 * .why =
 *   - the enroll needs one number to check against the budget, and the only honest
 *     source is the caller's own env: a process the spawn injected `depth` into was
 *     spawned AS a clone, so whatever it enrolls sits one level below it
 *   - named rather than inlined because the +1 is the whole subtlety — the value
 *     read is the CALLER's depth and the value returned is the CHILD's, and an
 *     inline `Number(env[...]) + 1` at the call site reads as neither
 *     (rule.require.named-transformers)
 *
 * .note = an ABSENT key returns `0`, never a fault. a human at a terminal has no
 *   clone depth at all, and the clone they enroll is the root of its chain
 *
 * ⚠️ .note = an UNPARSEABLE or NEGATIVE value also returns `0`. this is the one
 *   permissive read in the file, and it is deliberate: the var is injected by our
 *   own spawn, so a malformed one means the env was hand-edited or inherited from
 *   a foreign tool — neither of which is evidence of a deep chain. to fault here
 *   would convert a cosmetic env smudge into an enroll that cannot run at all,
 *   and to treat it as MAX would lock a human out of their first clone
 */
export const asCloneEnrollDepth = (input: {
  env: Record<string, string | undefined>;
}): number => {
  const raw = input.env[CLONE_ENV_KEYS.depth];
  if (raw === undefined) return 0;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;

  return parsed + 1;
};
