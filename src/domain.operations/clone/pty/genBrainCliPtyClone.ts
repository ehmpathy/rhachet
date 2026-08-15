import type { IPty } from 'node-pty';

import { delFileSync } from '@src/infra/filesystem/delFileSync';
import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { genCloneSocketServer } from '../socket/genCloneSocketServer';
import type { PtyModule } from './getPtyModuleOrNull';

/**
 * .what = the host-side io a pty clone streams through — the human's terminal,
 *   abstracted so a test drives it without a real tty
 * .why =
 *   - genBrainCliPtyClone hijacks the human's stdin/stdout + process signals to
 *     mirror the brain invisibly. injected as a host, those global effects become
 *     a seam a test observes (a capture sink) instead of the real process
 *   - each subscribe returns its own unsubscribe, so the clone tears every wire
 *     down on exit and never leaks a listener across runs
 */
export interface PtyCloneHost {
  /**
   * .what = mirror one chunk of the child's output to the human
   */
  writeOut: (data: string) => void;

  /**
   * .what = forward the human's keystrokes into the child; returns an unsubscribe
   */
  onInput: (fn: (data: string) => void) => () => void;

  /**
   * .what = the host terminal size, for the initial pty geometry + each resize
   */
  size: () => { cols: number; rows: number };

  /**
   * .what = re-flow on a host resize; returns an unsubscribe
   */
  onResize: (fn: () => void) => () => void;

  /**
   * .what = forward an interrupt/terminate to the child; returns an unsubscribe
   */
  onSignal: (fn: (signal: NodeJS.Signals) => void) => () => void;

  /**
   * .what = put the host tty in raw mode for the clone's life; returns a restore
   */
  enterRawMode: () => () => void;
}

/**
 * .what = spawn a brain-cli through a managed pty — mirror it to the human
 *   invisibly, stand up its dispatch socket, and own its whole child lifecycle
 * .why =
 *   - this IS the "stream through invisibly" seam: the human sees the brain in
 *     their terminal exactly as a direct spawn, but the pty in the middle lets a
 *     socket carry `say` into the child and lets `get` read its transcript. the
 *     one artifact that makes an enrolled clone reachable by a machine
 *   - the socket is stood up BEFORE the handle returns, so a caller that reaches
 *     the clone right after spawn never races the bind
 *   - the child's env carries its own serial + socket path (CLONE_ENV_KEYS), so a
 *     process spawned AS this clone can name itself (`clone whoami`) and reach its
 *     own socket — the self-management primitive
 *
 * .note = every host wire (input, resize, signal, raw-mode) is torn down on exit,
 *   the socket server is closed, and the socket file is unlinked — so a dead clone
 *   leaves no live listener and no orphan socket. `waitForExit` settles with the
 *   child's exit code (exit-code parity), so the caller can forward it
 * .note = a pty-DEVICE allocation failure at spawn propagates to the caller
 *   (genClone), which owns the fallback to a plain spawn — the fallback lives with
 *   the pty-vs-plain decision, in one place, not split across two files
 */
export const genBrainCliPtyClone = async (
  input: {
    command: string;
    args: string[];
    cwd: string;
    serial: string;
    socketPath: string;
  },
  context: { pty: PtyModule; host: PtyCloneHost },
): Promise<{
  socketPath: string;
  pid: number;
  waitForExit: Promise<number>;
  dispose: () => Promise<void>;
}> => {
  // the child inherits the human's env plus its own self-identity vars
  const env = {
    ...process.env,
    [CLONE_ENV_KEYS.serial]: input.serial,
    [CLONE_ENV_KEYS.socket]: input.socketPath,
  };

  // a stale socket from a prior crash must go before the server binds this path
  delFileSync({ path: input.socketPath });

  // spawn the brain through the pty at the host's current geometry
  const { cols, rows } = context.host.size();
  const child: IPty = context.pty.spawn(input.command, input.args, {
    name: 'xterm-color',
    cols,
    rows,
    cwd: input.cwd,
    env,
  });

  // the brain-cli's liveness — the ONE fact the socket's dispatch-gate consults.
  // set false the instant the child exits, so a `say` that lands as the exit
  // fires is NACK'd, never written to a defunct pty
  // (define.invariant.clone-socket-brain-cli-only)
  // .note = deliberate mutation — a single lifecycle latch for this child; it flips
  //   once (alive→dead) in the exit handler and never escapes this closure
  let brainCliAlive = true;

  // stand up the dispatch socket — a `say` writes framed bytes to the child, but
  // ONLY while the brain-cli is the live peer (the liveness gate below)
  const socketServer = genCloneSocketServer({
    socketPath: input.socketPath,
    write: (bytes) => child.write(bytes),
    isBrainCliAlive: () => brainCliAlive,
  });
  await new Promise<void>((done) => {
    if (socketServer.server.listening) return done();
    socketServer.server.once('listening', () => done());
  });

  // mirror the child's output to the human (the invisible stream)
  const mirror = child.onData((data) => context.host.writeOut(data));

  // forward the human's keystrokes into the child
  const offInput = context.host.onInput((data) => child.write(data));

  // re-flow the child on a host resize (fidelity under a mid-run resize)
  const offResize = context.host.onResize(() => {
    const next = context.host.size();
    child.resize(next.cols, next.rows);
  });

  // forward an interrupt/terminate to the child, not the wrapper
  const offSignal = context.host.onSignal((signal) => child.kill(signal));

  // put the host tty in raw mode so the brain's own prompts drive the keys
  const restoreRaw = context.host.enterRawMode();

  // tear every host wire down — run on exit AND on an explicit dispose
  const unwire = (): void => {
    mirror.dispose();
    offInput();
    offResize();
    offSignal();
    restoreRaw();
  };

  // close the socket + unlink its file, so a dead clone leaves no orphan
  const finalize = async (): Promise<void> => {
    unwire();
    await socketServer.close();
    delFileSync({ path: input.socketPath });
  };

  // settle waitForExit with the child's code once cleanup is done (parity)
  // .note = deliberate mutation — the standard promise-capture idiom: the executor
  //   runs synchronously, so `settleExit` is bound to `done` before any caller can
  //   await it; the reassignment is local and never observed mid-flight
  let settleExit: (code: number) => void = () => undefined;
  const waitForExit = new Promise<number>((done) => {
    settleExit = done;
  });
  child.onExit(({ exitCode }) => {
    // the brain-cli is gone — flip the latch FIRST, so any say still in flight is
    // NACK'd by the liveness gate before finalize closes the socket
    brainCliAlive = false;
    void finalize().then(() => settleExit(exitCode));
  });

  // dispose = kill the child, then let its exit handler finalize
  const dispose = async (): Promise<void> => {
    child.kill();
    await waitForExit;
  };

  return { socketPath: input.socketPath, pid: child.pid, waitForExit, dispose };
};
