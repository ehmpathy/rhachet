import { MalfunctionError } from 'helpful-errors';

import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { spawn } from 'node:child_process';
import type { Readable } from 'node:stream';

/**
 * .what = release a child stdio pipe's hold on this process's event loop
 * .why =
 *   - `child.unref()` frees the child's PROCESS handle only. each stdio pipe is a
 *     separate libuv handle this process owns, and while one is ref'd the loop stays
 *     open — so a caller that has already read what it needs still cannot exit
 *   - node types the pipe as a bare `Readable`, which declares no `unref`, while the
 *     runtime object is a `Socket` and has one. so the capability is PROBED rather
 *     than asserted through a cast (`rule.forbid.as-cast`): if a future node types it
 *     honestly, this keeps working; if a future node drops the method, this degrades
 *     to a no-op rather than a crash
 */
const unrefPipe = (pipe: Readable | null | undefined): void => {
  if (!pipe) return;
  if (!('unref' in pipe)) return;
  const { unref } = pipe;
  if (typeof unref !== 'function') return;
  unref.call(pipe);
};

/**
 * .what = how long a caller awaits the detached host's address before it calls the
 *   detach failed
 * .why = the host prints its handoff the instant the socket binds, which follows a
 *   pty spawn and a role boot — seconds on a warm host, longer on a cold one where
 *   the brain-cli's own startup is in the path. 60s is generous against that and
 *   still bounded, so a host that never binds fails loud rather than hangs the
 *   caller it exists to free
 */
export const CLONE_ENROLL_DETACH_TIMEOUT_MS = 60_000;

/**
 * .what = re-exec THIS enroll as a detached host process, and hand back the address
 *   it reports
 * .why =
 *   - an `--async` enroll cannot detach by a return. the pty master and the reach
 *     socket are live libuv handles owned by the enroller, so node holds the loop
 *     open for them and the caller blocks on a session it never watches — the exact
 *     hang a detached enroll exists to avoid
 *     (`define.invariant.clone-attendance-is-a-mode-never-a-reach`)
 *   - and the handles cannot merely be `unref`d: to drop them is to close the pty
 *     master, which hangs up the child. the clone must be held by SOME process, so
 *     the only honest detach is to make that process a different one
 *
 * ⇒ so the caller re-execs itself, marked as the host, and reads the host's own
 *   json handoff off its stdout. the caller then reports and exits; the host stays.
 *
 * .note = the handoff is the SAME single-line json the enroll already emits for a
 *   machine caller — it is printed the moment the socket is up, which is precisely
 *   the instant the address becomes reachable. so this reads a paved surface rather
 *   than a second channel invented for it
 *
 * ⇒ the detach has TWO honest terminations, so the return is a union rather than a
 *   throw for one of them:
 *   - `addressed` — the host bound a socket and reported where
 *   - `spoke` — the host REFUSED and already rendered its own cause on the stderr it
 *     inherited. that is not a fault of this operation; it is the host's verdict,
 *     heard correctly. a throw here would make the caller narrate a SECOND error over
 *     the host's own, so a machine that reads stderr would find two json objects and
 *     could parse neither (measured 2026-09-16 on a slug collision)
 */
export const genCloneEnrollDetached = async (input: {
  /** the interpreter to re-exec — `process.argv[0]` */
  execPath: string;
  /** the argv tail to replay verbatim — `process.argv.slice(1)` */
  argv: string[];
  cwd: string;
  /** how long to await the host's handoff before we call the detach failed */
  timeoutMs: number;
}): Promise<
  | { outcome: 'addressed'; handoff: string; pid: number }
  | { outcome: 'spoke'; code: number; pid: number }
> => {
  const child = spawn(input.execPath, input.argv, {
    cwd: input.cwd,
    // a NEW session, so the host survives the caller's terminal and its signals
    detached: true,
    // stdin is closed (no human types at a detached host); stdout is piped only
    // until the handoff arrives; stderr rides through so a spawn fault is visible
    // to the caller rather than swallowed
    stdio: ['ignore', 'pipe', 'inherit'],
    // 🔴 the caller's env passes through WHOLE, and one key in it carries the budget:
    //   `CLONE_ENV_KEYS.depth`. the host is a faithful REPLAY of the caller, so it
    //   re-derives the child's depth from the same `asCloneEnrollDepth({ env })` read —
    //   which returns the CALLER's depth + 1. strip that key and the host reads 0, so a
    //   depth-1 clone's `--async` peer is minted at depth 0, and every detached link
    //   resets the counter. ⇒ the enroll-depth budget would leak through this seam, and
    //   an unbounded chain is exactly what `CLONE_ENROLL_DEPTH_MAX` exists to refuse.
    //
    //   `serial` and `socket` ride along and are INERT here — the host runs `enroll`,
    //   whose path reads neither, and the pty spawn overwrites all three for the child
    //   it stands up (`genBrainCliPtyClone`). so a tidy-the-env sweep looks free and is
    //   not: the one key that reads as noise is the one the budget rests on.
    env: { ...process.env, [CLONE_ENV_KEYS.hostDetached]: '1' },
  });

  const pid = child.pid;
  if (pid === undefined)
    return MalfunctionError.throw('the detached enroll host reported no pid', {
      execPath: input.execPath,
    });

  return await new Promise<
    | { outcome: 'addressed'; handoff: string; pid: number }
    | { outcome: 'spoke'; code: number; pid: number }
  >((done, fail) => {
    let buffer = '';
    let settled = false;

    // one settle, whatever the cause — the handoff line and an early exit can land
    // in the same tick, and a second settle would be a silent no-op that hides
    // which of the two actually won
    const settle = (act: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout?.removeAllListeners('data');
      // 🔴 the pipe must be UNREF'd, never destroyed, and `child.unref()` does NOT
      //   cover it. `unref` on the child frees the PROCESS handle; the stdio pipe is
      //   a separate libuv handle this process owns, and while it is ref'd the
      //   caller's loop stays open — the exact hang this whole operation exists to
      //   end (measured 2026-09-16: the caller sat forever on a host it had already
      //   heard from). a `destroy()` would close the read end instead, and the host's
      //   next write would take an EPIPE, which kills the clone we just stood up
      unrefPipe(child.stdout);
      // 🔴 the child handle is released HERE, never at the end of the executor. an
      //   unresolved promise does NOT hold node's event loop open — only a ref'd handle
      //   does. so an early `child.unref()` left the stdout pipe as the sole ref, and
      //   a host that DIED closed that pipe on EOF: the loop drained, the caller exited
      //   0, and the `exit` listener below never ran. the host's failure then reported
      //   as a success, with only its inherited stderr to hint otherwise
      //   (`rule.forbid.failhide`). measured 2026-09-16 — a slug collision refused by
      //   the host exited 0 at the caller, with the ConstraintError on stderr
      child.unref();
      act();
    };

    const timer = setTimeout(
      () =>
        settle(() =>
          fail(
            new MalfunctionError(
              'the detached enroll host reported no address in time',
              {
                timeoutMs: input.timeoutMs,
                pid,
                sawOnStdout: buffer.slice(0, 2000),
                hint: 'the host may still be alive — check `rhx clone list`',
              },
            ),
          ),
        ),
      input.timeoutMs,
    );
    timer.unref();

    child.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      // the handoff is ONE line by design, so a complete line is the unit — a
      // partial chunk must not be parsed, and must not be dropped either
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      const handoff = lines.find((line) => line.trimStart().startsWith('{'));
      if (handoff !== undefined)
        settle(() => done({ outcome: 'addressed', handoff, pid }));
    });

    // the host ended before it reported an address — the caller must hear that,
    // never a timeout that misnames a crash as a slow start
    child.on('exit', (code) =>
      settle(() => {
        // 🔴 a NON-ZERO code means the host REFUSED and already said why, verbatim, on
        //   the stderr it inherited — a ConstraintError frame or its json twin, in the
        //   exact shape an attended enroll would have printed. so the caller's whole job
        //   is to wear that code; a second error of our own would stack one json object
        //   on another and leave stderr unparseable (`rule.forbid.failhide` cuts both
        //   ways — a report that cannot be read is as good as absent)
        if (code !== null && code !== 0)
          return done({ outcome: 'spoke', code, pid });

        // a clean exit or a signal with no address is genuinely UNEXPLAINED — nobody
        // rendered a cause, so this is the only account the caller will ever get
        //
        // 🔴 the field is `hostExitCode`, never `code`. `code` is RESERVED by
        //   helpful-errors: it is stripped from the serialized message AND from the
        //   `.metadata` getter, then re-read as the error's own CLASSIFICATION code
        //   (`HelpfulError.js` — `omit(metadata, ['cause', 'code'])` at construction,
        //   `omit(raw, ['code'])` at the getter). so under the name `code`, the one fact
        //   this error exists to carry — a clean 0 versus a signal — reached no reader at
        //   all, on either channel (`rule.forbid.failhide`)
        return fail(
          new MalfunctionError(
            'the detached enroll host exited before it reported an address',
            { hostExitCode: code, pid, sawOnStdout: buffer.slice(0, 2000) },
          ),
        );
      }),
    );

    child.on('error', (error: Error) =>
      settle(() =>
        fail(
          new MalfunctionError('the detached enroll host could not spawn', {
            error: error.message,
            execPath: input.execPath,
          }),
        ),
      ),
    );

    // ⚠️ no `child.unref()` here. the release belongs in `settle` — until the caller
    //   HAS its answer, the ref'd child handle is the one thing that guarantees this
    //   process lives long enough to hear the host's exit
  });
};
