import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

/**
 * .what = the deepest spawn chain this repo permits — a top-level clone may spawn a
 *   clone or a repl brain, and that child may spawn no one
 * .why =
 *   - a spawn chain is unbounded by nature: every clone carries the same CLI, so
 *     a clone that may spawn can spawn a clone that may spawn. with no bound the
 *     chain forks until the host runs out of ptys, and each link costs a real brain
 *   - depth 1 is the limit the wisher named. it buys the ONE capability the peer
 *     motive needs — a clone stands up a reviewer or a peer — and buys no more
 *
 * .note = a LIMIT, never a fact about a clone. the depth a clone sits at is a fact
 *   (`CLONE_ENV_KEYS.depth`); this is the largest such fact we permit to be minted
 */
export const CLONE_SPAWN_DEPTH_MAX = 1;

/**
 * .what = the depth the clone or brain THIS spawn is about to mint would be born at
 * .why =
 *   - one read of depth for both spawn doors (`rhx enroll` and the repl seam), so the
 *     two can never disagree on who is top-level
 *   - a tty is the signal a brain's tool shell lacks: a human at a keyboard has one, and
 *     claude's shell tool hands its commands none (measured; a tool that allocates a pty
 *     would need its own read, Q10). so a tty `rhx enroll` with no depth var mints a
 *     top-level clone (0), and every no-tty spawn is at least depth 1
 *   - a tty that carries a depth var is a pty a clone opened (a `tmux new-window` or a
 *     pty wrap that keeps the env), so it reads that var + 1, as a no-tty spawn does
 *     (fulcrum F13). a clone cannot reach depth 0 by a pty wrap that keeps its env
 *   - it is a guardrail against recursion, not a security boundary: a pty whose env was
 *     scrubbed of the var still reads as a human
 *   - named rather than inlined because the +1 is the subtlety — the value read is the
 *     CALLER's depth and the value returned is the CHILD's
 *     (rule.require.named-transformers)
 *
 * .note = the repl door never mints 0. a review brain is always a spawn, never a
 *   top-level clone, even when a human runs `rhx review` at a terminal. like the enroll
 *   door, it reads a depth var a tty carries, so a pane a clone opened stays below it
 *
 * .note = a detached enroll host has no tty, so it must not re-read one. its caller
 *   decided the depth in the foreground and handed it over as `depthMinted`
 *
 * ⚠️ .note = with no tty, an ABSENT, UNPARSEABLE, or NEGATIVE depth var reads as a
 *   depth-0 caller. to fault would turn a cosmetic env smudge into a spawn that cannot
 *   run at all; to read it as a fresh chain (0 for the child) would let any unmarked
 *   spawn start a chain over. so a smudge is one level loose at most, never a lockout
 *   and never a reset. at a tty a smudge reads as no var, so it never locks a human out
 */
export const asCloneSpawnDepth = (input: {
  env: Record<string, string | undefined>;
  isTty: boolean;
  door: 'enroll' | 'repl';
}): number => {
  // a detached host replays the depth its caller decided. a guardrail, not a boundary:
  // a process that sets both handoff keys by hand replays them too
  const minted = asDepthParsed({ raw: input.env[CLONE_ENV_KEYS.depthMinted] });
  const isDetachedHost = input.env[CLONE_ENV_KEYS.hostDetached] !== undefined;
  if (input.door === 'enroll' && isDetachedHost && minted !== null)
    return minted;

  // a tty with no depth var is a human: at the enroll door, a top-level clone
  const depthVar = asDepthParsed({ raw: input.env[CLONE_ENV_KEYS.depth] });
  if (input.door === 'enroll' && input.isTty && depthVar === null) return 0;

  // else the child sits one level below its caller, at either door
  return (depthVar ?? 0) + 1;
};

/**
 * .what = a depth var read as a non-negative integer, or null when absent or smudged
 * .why = both depth keys share one strict parse: only a whole run of digits is a depth.
 *   a lenient parse would read `9x` as 9 and refuse its caller — the lockout the
 *   smudge note above forbids
 */
const asDepthParsed = (input: { raw: string | undefined }): number | null => {
  if (input.raw === undefined) return null;
  if (!/^\d+$/.test(input.raw)) return null;
  return Number(input.raw);
};
