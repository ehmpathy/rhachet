import { readFileSync } from 'node:fs';
import { asBootDriftFaultCause } from './asBootDriftFaultCause';
import { asBootDriftSweepSummary } from './asBootDriftSweepSummary';
import type { BootDriftFault, BootDriftSweep } from './BrainDirBootRender';
import { getActorBootRevisionDir } from './getActorBootRevisionDir';
import { getAllActorBootRevisionHashes } from './getAllActorBootRevisionHashes';
import { setActorBootDrift } from './setActorBootDrift';

/**
 * .what = re-write the drift of every boot revision an actor holds, against its current boot
 * .why = a boot render changes what every live clone of the actor should hold; each clone
 *        refers to the revision it spawned on, so one write per revision reaches them all
 *
 * .note = a filesystem fault on one revision is collected, so the rest still write, and the
 *         caller names each with its cause; any other error rethrows (`asBootDriftFaultCause`)
 * .note = an actor with no `boots/` dir has no clone to reach; the sweep is a no-op
 * .note = which clones refer to each revision is the init layer's join
 *         (`getOneActorBootDriftReach`), so the boot layer never reads a clone
 */
export const setActorBootDrifts = (input: {
  actorDir: string;
  bootMdPathCurrent: string;
}): BootDriftSweep => {
  // the revisions by hash; none means no clone has spawned on a revision yet
  const revisions = getAllActorBootRevisionHashes({ actorDir: input.actorDir });
  if (revisions.length === 0)
    return asBootDriftSweepSummary({ revisions, results: [] });

  // the current boot, read once, so every revision of this sweep drifts to the same bytes;
  //   an unreadable boot faults every revision, never a throw past the render
  const boot = getOneBootCurrentOrFault({ path: input.bootMdPathCurrent });
  if (boot.fault !== null)
    return asBootDriftSweepSummary({
      revisions,
      results: asResultsOfBootUnread({
        actorDir: input.actorDir,
        revisions,
        cause: boot.fault,
      }),
    });
  const bootCurrent = boot.bytes;

  // write each; collect a filesystem fault rather than stop the sweep
  const results = revisions.map((hash) =>
    setOneRevisionDrift({
      actorDir: input.actorDir,
      hash,
      bootCurrent,
    }),
  );

  // the revisions re-written, and the faults met
  return asBootDriftSweepSummary({ revisions, results });
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
 * .what = a fault result per revision, for a sweep whose current boot could not be read
 */
const asResultsOfBootUnread = (input: {
  actorDir: string;
  revisions: string[];
  cause: Error;
}): {
  hash: string;
  outcome: 'fault';
  fault: BootDriftFault;
}[] =>
  input.revisions.map((hash) => ({
    hash,
    outcome: 'fault',
    fault: {
      path: getActorBootRevisionDir({ actorDir: input.actorDir, hash }),
      reason: `drift not written, the current boot could not be read (${input.cause.message}) — its clones keep their prior drift`,
      cause: input.cause,
    },
  }));

/**
 * .what = write one revision's drift, or the fault that stopped it
 */
const setOneRevisionDrift = (input: {
  actorDir: string;
  hash: string;
  bootCurrent: string;
}): {
  hash: string;
  outcome: 'rewritten' | 'unchanged' | 'fault';
  fault: BootDriftFault | null;
} => {
  const revisionDir = getActorBootRevisionDir({
    actorDir: input.actorDir,
    hash: input.hash,
  });
  try {
    const { outcome } = setActorBootDrift({
      revisionDir,
      bootCurrent: input.bootCurrent,
    });
    return { hash: input.hash, outcome, fault: null };
  } catch (error) {
    // a defect in the code rethrows; only a filesystem fault is collected
    const cause = asBootDriftFaultCause({ error });
    if (cause === null) throw error;
    return {
      hash: input.hash,
      outcome: 'fault',
      fault: {
        path: revisionDir,
        reason: `drift not written (${cause.message}) — its clones keep their prior drift`,
        cause,
      },
    };
  }
};
