import {
  CLONE_TRACE_FALLBACK_DIR,
  getOneCloneTraceSinkForDaemon,
} from './getOneCloneTraceSinkForDaemon';

/**
 * .what = the clone daemon's default trace sink: the trace log under this process's cwd, with
 *   the per-user fallback dir
 * .why = every daemon part (pty host, socket server, write queue, screen feed) defaults to this
 *   one sink; one owner keeps where a daemon's lines land a single edit
 * .note = `process.cwd()`, the same root every prior trace used, so one daemon's lines all land
 *   in one log
 * .note = `clone` is the address the stamp names; the pty host passes its own, a part built
 *   alone passes null
 */
export const getOneCloneTraceSinkForDaemonAtCwd = (input: {
  clone: string | null;
}): ((line: string) => void) =>
  getOneCloneTraceSinkForDaemon({
    repoPath: process.cwd(),
    fallbackDir: CLONE_TRACE_FALLBACK_DIR,
    clone: input.clone,
  });
