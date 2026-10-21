import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

/**
 * .what = the depth the clone or brain THIS spawn is about to mint would be born at
 * .why =
 *   - depth is a FACT a clone carries about its place in the chain, never a limit. a
 *     work clone at any depth may spawn one level deeper; only a leaf may not
 *     (ehmpathy/rhachet#577, `assertCloneSpawnAllowed`)
 *   - one read of depth for both spawn doors (`rhx enroll` and the repl seam), so the
 *     two can never disagree on who is top-level
 *   - a tty is the signal a brain's tool shell lacks: a human at a keyboard has one, and
 *     claude's shell tool hands its commands none (measured; a tool that allocates a pty
 *     would need its own read, Q10). so a tty `rhx enroll` with no depth var mints a
 *     top-level clone (0), and every no-tty spawn is at least depth 1
 *   - a tty that carries a depth var is a pty a clone opened with its env kept (a pty
 *     wrap such as `unbuffer` or node-pty), so it reads that var + 1, as a no-tty spawn
 *     does (fulcrum F13). a clone cannot reach depth 0 by a pty wrap that keeps its env
 *   - it is a record, not a security boundary: a pty whose env lacks the var still
 *     reads as a human. a pane of a tmux server a human started may take
 *     the server's env rather than the caller's; that path is unmeasured and open (F13)
 *   - the value read is the CALLER's depth; the value returned is the CHILD's
 *
 * .note = the repl door never mints 0. a repl brain is always a spawn, never a
 *   top-level clone, even when a human runs its skill at a terminal. like the enroll
 *   door, it reads a depth var a tty carries, so a pane a clone opened stays below it
 *
 * .note = a detached enroll host has no tty, so it must not re-read one. its caller
 *   decided the depth in the foreground and handed it over as `depthMinted`
 *
 * ⚠️ .note = with no tty, an ABSENT, UNPARSEABLE, or NEGATIVE depth var reads as a
 *   depth-0 caller: a smudge misreads the record by a level at most, and never a
 *   lockout — depth gates no spawn. at a tty a smudge reads as no var
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
 * .why = both depth keys share one strict parse: only a whole run of digits is a depth,
 *   so `9x` is a smudge, never a depth of 9
 */
const asDepthParsed = (input: { raw: string | undefined }): number | null => {
  if (input.raw === undefined) return null;
  if (!/^\d+$/.test(input.raw)) return null;
  return Number(input.raw);
};
