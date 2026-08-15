import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { spawn } from 'node:child_process';

/**
 * .what = spawn a brain-cli the plain way — inherited stdio, NO managed pty, NO
 *   socket — and return a composable handle (never a process.exit)
 * .why =
 *   - this is the fallback branch genClone takes when a socket cannot be stood up:
 *     the pty addon is absent, the brain is not socket-capable, the run is headless,
 *     or `--no-socket`. the human still gets the brain in their terminal, just
 *     without a reach socket
 *   - it hands back a handle (waitForExit + dispose) rather than an exit of the
 *     process, so genClone stays composable and the CALLER forwards the exit code —
 *     one owner of process lifecycle, not a spawn buried in a leaf
 *
 * .note = the child still carries its own serial (CLONE_ENV_KEYS.serial), so even a
 *   socket-less clone can name itself via `clone whoami`. the env-injection shape is
 *   WET across this + genBrainCliPtyClone by design; a THIRD spawn branch (the
 *   dream's `wake`) is the rule-of-three trigger to extract a shared genCloneChildEnv
 */
export const genBrainCliPlainClone = (input: {
  command: string;
  args: string[];
  cwd: string;
  serial: string;
}): {
  socketPath: null;
  pid: number;
  waitForExit: Promise<number>;
  dispose: () => Promise<void>;
} => {
  const env = { ...process.env, [CLONE_ENV_KEYS.serial]: input.serial };

  const child = spawn(input.command, input.args, {
    cwd: input.cwd,
    stdio: 'inherit',
    env,
  });

  // settle waitForExit with the child's code (exit-code parity); no exit here
  // .note = deliberate mutation — the standard promise-capture idiom: the executor
  //   runs synchronously, so `settleExit` is bound to `done` before any caller can
  //   await it; the reassignment is local and never observed mid-flight
  let settleExit: (code: number) => void = () => undefined;
  const waitForExit = new Promise<number>((done) => {
    settleExit = done;
  });
  child.on('close', (code) => settleExit(code ?? 0));
  child.on('error', () => settleExit(1));

  const dispose = async (): Promise<void> => {
    child.kill();
    await waitForExit;
  };

  return { socketPath: null, pid: child.pid ?? -1, waitForExit, dispose };
};
