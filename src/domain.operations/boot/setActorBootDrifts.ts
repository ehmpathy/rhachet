import { readFileSync } from 'node:fs';
import { asBootContentHash } from './asBootContentHash';
import { asBootDriftFaultCause } from './asBootDriftFaultCause';
import { asBootDriftSweepSummary } from './asBootDriftSweepSummary';
import type { BootDriftFault, BootDriftSweep } from './BrainDirBootRender';
import { getActorBootSpawnedPaths } from './getActorBootSpawnedPaths';
import { getAllActorBootSpawnedSerials } from './getAllActorBootSpawnedSerials';
import { setActorBootDrift } from './setActorBootDrift';

/**
 * .what = re-write the drift of every clone of an actor that holds a spawn boot, against its
 *         current boot
 * .why = a boot render changes what every live clone of the actor should hold; each clone holds
 *        its own spawn boot and drift, so one write per clone reaches it
 *
 * .note = the current boot is hashed once per sweep; a clone whose drift is already keyed to that
 *         hash costs one meta read (`setActorBootDrift`)
 * .note = a filesystem fault on one clone is collected, so the rest still write, and the caller
 *         names each with its cause; any other error rethrows (`asBootDriftFaultCause`)
 * .note = an actor with no `boots/` dir has no clone to reach; the sweep is a no-op
 * .note = the boot layer reads no clone dir: the spawn boots are keyed by serial, so the sweep
 *         needs naught from the clone layer
 */
export const setActorBootDrifts = (input: {
  actorDir: string;
  bootMdPathCurrent: string;
}): BootDriftSweep => {
  // the clones by serial; none means no clone has spawned on a boot yet
  const clones = getAllActorBootSpawnedSerials({ actorDir: input.actorDir });
  if (clones.length === 0)
    return asBootDriftSweepSummary({ clones, results: [] });

  // the current boot, read and hashed once, so every clone of this sweep drifts to the same
  //   bytes; an unreadable boot faults every clone, never a throw past the render
  const boot = getOneBootCurrentOrFault({ path: input.bootMdPathCurrent });
  if (boot.fault !== null)
    return asBootDriftSweepSummary({
      clones,
      results: asResultsOfBootUnread({
        actorDir: input.actorDir,
        clones,
        cause: boot.fault,
      }),
    });
  const bootCurrent = boot.bytes;
  const bootCurrentHash = asBootContentHash({ bytes: bootCurrent });

  // write each; collect a filesystem fault rather than stop the sweep
  const results = clones.map((serial) =>
    setOneCloneDrift({
      actorDir: input.actorDir,
      serial,
      bootCurrent,
      bootCurrentHash,
    }),
  );

  // the clones re-written, and the faults met
  return asBootDriftSweepSummary({ clones, results });
};

/**
 * .what = the current boot's bytes, or the filesystem fault that stopped the read
 */
const getOneBootCurrentOrFault = (input: {
  path: string;
}): { bytes: string; fault: null } | { bytes: null; fault: Error } => {
  try {
    return { bytes: readFileSync(input.path, 'utf8'), fault: null };
  } catch (error) {
    // a defect in the code rethrows; only a filesystem fault is collected
    const cause = asBootDriftFaultCause({ error });
    if (cause === null) throw error;
    return { bytes: null, fault: cause };
  }
};

/**
 * .what = a fault result per clone, for a sweep whose current boot could not be read
 */
const asResultsOfBootUnread = (input: {
  actorDir: string;
  clones: string[];
  cause: Error;
}): {
  serial: string;
  outcome: 'fault';
  fault: BootDriftFault;
}[] =>
  input.clones.map((serial) => ({
    serial,
    outcome: 'fault',
    fault: {
      path: getActorBootSpawnedPaths({ actorDir: input.actorDir, serial }).dir,
      reason: `drift not written, the current boot could not be read (${input.cause.message}) — the clone keeps its prior drift`,
      cause: input.cause,
    },
  }));

/**
 * .what = write one clone's drift, or the fault that stopped it
 */
const setOneCloneDrift = (input: {
  actorDir: string;
  serial: string;
  bootCurrent: string;
  bootCurrentHash: string;
}): {
  serial: string;
  outcome: 'rewritten' | 'unchanged' | 'fault';
  fault: BootDriftFault | null;
} => {
  try {
    const { outcome } = setActorBootDrift(input);
    return { serial: input.serial, outcome, fault: null };
  } catch (error) {
    // a defect in the code rethrows; only a filesystem fault is collected
    const cause = asBootDriftFaultCause({ error });
    if (cause === null) throw error;
    return {
      serial: input.serial,
      outcome: 'fault',
      fault: {
        path: getActorBootSpawnedPaths({
          actorDir: input.actorDir,
          serial: input.serial,
        }).dir,
        reason: `drift not written (${cause.message}) — the clone keeps its prior drift`,
        cause,
      },
    };
  }
};
