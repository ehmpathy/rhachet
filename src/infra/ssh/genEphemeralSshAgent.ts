import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SSH_PROBE_TIMEOUT_MS } from './sshExecTimeouts';

/**
 * .what = the bound on how long the ssh-agent spawn may take before it is deemed wedged
 * .why  = an ssh-agent spawn is a fast local fork (daemonize + print env + return), so
 *         the probe tier is generous headroom even on a loaded CI box; a spawn slower
 *         than this is hung, not busy. a descriptive local alias of the shared probe
 *         tier — one value to audit (sshExecTimeouts), one name that says what it bounds
 */
const AGENT_SPAWN_TIMEOUT_MS = SSH_PROBE_TIMEOUT_MS;

/**
 * .what = spawn a throwaway ssh-agent on a private per-owner socket
 * .why  = gives keyrack an isolated agent it fully owns and can reap,
 *         so the loaded key never outlives the one invocation — the
 *         ephemeral unlock shape (vision q5): zero reuse window
 *
 * .note = the socket lives in a 0700 temp dir (mkdtemp is 0700 by default),
 *         so only this owner's processes can reach it
 * .note = registers teardown on process exit as a safety net
 *
 * .note = returns the agent handle: `sock` is the SSH_AUTH_SOCK to hand to
 *         ssh-add / the signer; call `teardown()` when done — it is
 *         idempotent and also runs on process exit, so a crash cannot leak
 *         the socket
 */
export const genEphemeralSshAgent = (input: {
  owner: string;
  // the env to spawn ssh-agent under; defaults to process.env. injected so the
  // ssh-agent-absent (ENOENT) path is testable via a bogus PATH — spawnSync uses
  // this env for the binary lookup, so an absent binary fails loud
  env?: NodeJS.ProcessEnv;
}): { sock: string; pid: number; teardown: () => void } => {
  // a short 0700 temp dir — unix socket paths cap near ~104 chars
  const dir = mkdtempSync(join(tmpdir(), `kr-agent-${input.owner}-`));
  const sock = join(dir, 'agent.sock');

  // spawn the agent bound to our socket; -s prints eval-able env lines.
  // the timeout is scaled to THIS call's work, not copied from the others: an
  // ssh-agent spawn is a fast local fork that daemonizes, prints its env lines,
  // and returns at once — no step here waits on a human or on key material. so a
  // spawn still unreturned after AGENT_SPAWN_TIMEOUT_MS is wedged, not slow, and
  // surfaces loud. this is deliberately SHORTER than the 30s on ssh-keygen (real
  // cpu work) and the ~120s on ssh-add (blocks on the human passphrase dialog).
  // env is passed explicitly (defaults to process.env) so spawnSync uses it for
  // the binary lookup — an absent ssh-agent then fails loud with ENOENT
  const spawned = spawnSync('ssh-agent', ['-a', sock, '-s'], {
    encoding: 'utf8',
    timeout: AGENT_SPAWN_TIMEOUT_MS,
    env: input.env ?? process.env,
  });
  // a timeout (or any spawn fault) sets spawned.error — surface it, never hang.
  // an ENOENT means the ssh-agent binary itself is absent — a caller-fixable
  // condition (install openssh-client), so a ConstraintError (exit 2) with a
  // named fix, NOT a MalfunctionError. any other spawn fault (e.g. the 10s
  // timeout) is a genuine tool malfunction (exit 1).
  if (spawned.error) {
    const absent = (spawned.error as NodeJS.ErrnoException).code === 'ENOENT';
    if (absent)
      throw new ConstraintError(asSshAgentAbsentMessage(), {
        owner: input.owner,
        sock,
        fix: 'install openssh-client (it provides ssh-agent), then retry',
      });
    throw new MalfunctionError('ssh-agent spawn failed', {
      owner: input.owner,
      sock,
      reason: spawned.error.message,
    });
  }
  if (spawned.status !== 0)
    throw new MalfunctionError('ssh-agent spawn failed', {
      owner: input.owner,
      sock,
      stderr: spawned.stderr,
    });

  // parse the agent pid from `SSH_AGENT_PID=1234; export SSH_AGENT_PID;`. this runs
  // BEFORE the teardown/exit nets are wired (they need the pid), so a status-0 spawn
  // whose stdout has no parseable pid — a contract-breaking ssh-agent — would leak the
  // just-spawned agent AND its 0700 socket dir. reap the dir before the throw so at least
  // the socket dir never leaks; the agent process cannot be killed without the pid it
  // declined to print, so the loud throw surfaces that residual for a human to clear
  const pid = ((): number => {
    try {
      return asAgentPidFromSpawnOutput({ output: spawned.stdout });
    } catch (error) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore cleanup faults — the parse error below is the one that matters
      }
      throw error;
    }
  })();

  // the abrupt-stop signals that must reap the agent before they kill Node.
  // ssh-add blocks synchronously for up to ~120s while the human answers the
  // passphrase dialog; a Ctrl+C (SIGINT) or a kill (SIGTERM/SIGHUP) in that
  // window would otherwise stop Node WITHOUT the 'exit' event, so the agent that
  // holds the key survives on a still-reachable socket (breaks vision q5 zero-reuse)
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];

  // teardown: kill the agent + remove the socket dir; idempotent by construction.
  // the caller's finally AND the exit/signal safety nets could each invoke it;
  // teardown first de-registers every net, so a later (exit- or signal-time) call
  // is a no-op — which matters because a repeat process.kill could land on a
  // recycled pid. no mutable latch needed (rule.require.immutable-vars)
  const teardown = (): void => {
    process.removeListener('exit', teardown);
    for (const signal of signals) process.removeListener(signal, onSignal);
    try {
      process.kill(pid);
    } catch {
      // already gone — fine
    }
    // best-effort cleanup — a cleanup fault must never mask the caller's original
    // error (rule.forbid.failhide); rmSync with force already ignores an absent dir
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  };

  // on an abrupt-stop signal: reap the agent first, then re-raise the same signal
  // with its default disposition (teardown already removed this handler) so the
  // process still exits as the signal intends. node hands the signal name to the
  // listener, so one handler serves all three signals
  const onSignal = (signal: NodeJS.Signals): void => {
    teardown();
    process.kill(process.pid, signal);
  };

  // safety nets: reap on normal exit AND on abrupt-stop signals, even if the
  // caller forgets — so the agent that holds the key cannot outlive the invocation
  process.once('exit', teardown);
  for (const signal of signals) process.once(signal, onSignal);

  return { sock, pid, teardown };
};

/**
 * .what = the treestruct fail-fast message shown when ssh-agent is not installed
 * .why  = names the why (the ephemeral-agent unlock shape) and the exact fix, per
 *         the ergonomist errors-name-the-fix rule — consistent with the askpass
 *         absent message, so the two prerequisites fail the same legible way
 */
const asSshAgentAbsentMessage = (): string =>
  [
    'keyrack needs ssh-agent to hold your key for the unlock, and it is not installed',
    '   ├─ why: keyrack loads your ssh key into a throwaway agent, asks it to',
    '   │       sign once, then tears it down — so the key never lingers',
    '   └─ fix: install openssh-client (it provides ssh-agent), then retry',
  ].join('\n');

/**
 * .what = extract the agent pid from ssh-agent -s stdout
 * .why  = teardown needs the pid to kill the agent
 */
const asAgentPidFromSpawnOutput = (input: { output: string }): number => {
  const match = input.output.match(/SSH_AGENT_PID=(\d+)/);
  if (!match)
    throw new MalfunctionError('could not parse SSH_AGENT_PID from ssh-agent', {
      output: input.output,
    });
  return Number(match[1]);
};
