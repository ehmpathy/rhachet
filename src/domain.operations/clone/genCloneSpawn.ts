import { asCloneSocketBindFaultError } from './asCloneSocketBindFaultError';
import { asPtyDeviceRefusedError } from './asPtyDeviceRefusedError';
import { genBrainCliPlainClone } from './pty/genBrainCliPlainClone';
import {
  genBrainCliPtyClone,
  type PtyCloneHost,
} from './pty/genBrainCliPtyClone';
import { getPtyHostTupleFromProcess } from './pty/getPtyHostTupleFromProcess';
import type { PtyModule } from './pty/getPtyModuleOrNull';
import { isPtyDeviceRefusedError } from './pty/isPtyDeviceRefusedError';
import { isCloneSocketBindFaultError } from './socket/isCloneSocketBindFaultError';

/**
 * .what = a handle to a live spawn — the caller forwards its exit and can dispose
 */
export interface CloneSpawnHandle {
  socketPath: string | null;
  pid: number;
  waitForExit: Promise<number>;
  dispose: () => Promise<void>;
}

/**
 * .what = spawn the clone's brain — through a managed pty when a socket is reachable,
 *   plain otherwise — and re-report the two fault classes that block can raise, each to
 *   the party that owns it
 *
 * 🚨 the pty branch is GUARDED, and the guard never falls through to the plain one. the
 *   addon can load and the DEVICE still be refused at spawn (a restricted container, an
 *   exhausted pty limit, a denied openpty). that lands AFTER the caller's socket gate has
 *   already refused to enroll without a socket, so a fall-through would hand back exactly
 *   the talk-less clone that gate exists to refuse — the same degrade, one branch later,
 *   and silent.
 *
 * 🚨 the catch ALLOWLISTS, never catches all — and it carries TWO allowlists, because the
 *   guarded block runs OUR code too (the socket bind, the host wires, the raw-mode enter).
 *   each allowlist re-reports exactly one fault class, and every other throw propagates
 *   with its stack. to relabel ours as the host's would name the wrong party in the one
 *   place a human reads (`rule.forbid.failhide`).
 *
 *   | recognized by                 | class        | who fixes | the next move                    |
 *   |-------------------------------|--------------|-----------|----------------------------------|
 *   | `isCloneSocketBindFaultError` | malfunction  | us        | report it; --no-socket meanwhile |
 *   | `isPtyDeviceRefusedError`     | constraint   | caller    | --no-socket, or free a pty       |
 *   | neither                       | unclassified | us        | its own stack, untouched         |
 *
 * ⚠️ the two are DISJOINT by construction, never merely by convention: the bind allowlist
 *   reads node's structured `syscall` field, the pty one reads node-pty's prose. so no
 *   error can satisfy both, and their order decides no outcome.
 *
 * ⚠️ a pty refusal is a `ConstraintError` because the next move is the CALLER's — pass
 *   `--no-socket`, or free the pty devices this host is out of. a kernel with no pty to
 *   give is not ours to repair, and a retry with the same request fails identically. a
 *   bind fault is the opposite: the gate ALREADY cleared a socket for this enroll, so the
 *   fault says our own gate or our own path was wrong (`rule.require.exit-code-semantics`).
 *
 * ⚠️ it deletes NO directory. the staged dir belongs to the caller, which deletes it on a
 *   failure of any party — one owner for that lifecycle, at both of its sites.
 */
export const genCloneSpawn = async (
  input: {
    command: string;
    args: string[];
    cwd: string;
    serial: string;
    /** the socket to bind, or null when this enroll gets no socket */
    socketPath: string | null;
    /** whether the caller's gate cleared a socket for this enroll */
    socketEligible: boolean;
    /** the loaded addon, or null when the host could not load it */
    pty: PtyModule | null;
  },
  context: { host: PtyCloneHost },
): Promise<CloneSpawnHandle> => {
  // all three must hold; any one absent means this enroll gets a plain spawn
  if (
    !(input.socketEligible && input.pty !== null && input.socketPath !== null)
  )
    return genBrainCliPlainClone({
      command: input.command,
      args: input.args,
      cwd: input.cwd,
      serial: input.serial,
    });

  try {
    return await genBrainCliPtyClone(
      {
        command: input.command,
        args: input.args,
        cwd: input.cwd,
        serial: input.serial,
        socketPath: input.socketPath,
      },
      { pty: input.pty, host: context.host },
    );
  } catch (error) {
    // the socket gate's own fault — OURS, and classified rather than left a bare stack.
    // it is read FIRST because the two allowlists answer different questions and only
    // this one can be settled from structure: node stamps every errno exception with the
    // `syscall` that failed, so a match here is a fact rather than a match on prose
    if (isCloneSocketBindFaultError(error))
      throw asCloneSocketBindFaultError({
        error,
        hostTuple: getPtyHostTupleFromProcess(),
      });

    if (!isPtyDeviceRefusedError(error)) throw error;

    throw asPtyDeviceRefusedError({
      error,
      hostTuple: getPtyHostTupleFromProcess(),
    });
  }
};
