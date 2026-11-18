import { existsSync, readdirSync } from 'node:fs';
import { asBootDriftFaultCause } from './asBootDriftFaultCause';
import { asBootRevisionHashFromDirName } from './asBootRevisionHashFromDirName';
import type { BootDriftFault } from './BrainDirBootRender';
import { getActorBootRevisionDir } from './getActorBootRevisionDir';
import { getActorBootRevisionsRootDir } from './getActorBootRevisionsRootDir';
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
 *         (`getActorBootDriftReach`), so the boot layer never reads a clone
 */
export const setActorBootDrifts = (input: {
  actorDir: string;
  bootMdPathCurrent: string;
}): {
  revisions: string[];
  rewritten: string[];
  faults: BootDriftFault[];
} => {
  // enumerate the revisions by hash; none means no clone has spawned on a revision yet
  const rootDir = getActorBootRevisionsRootDir({ actorDir: input.actorDir });
  if (!existsSync(rootDir)) return { revisions: [], rewritten: [], faults: [] };
  const revisions = readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const hash = asBootRevisionHashFromDirName({ name: entry.name });
      return hash === null ? [] : [hash];
    })
    .sort();

  // write each; collect a filesystem fault rather than stop the sweep
  const results = revisions.map((hash) =>
    setOneRevisionDrift({
      actorDir: input.actorDir,
      hash,
      bootMdPathCurrent: input.bootMdPathCurrent,
    }),
  );

  return {
    revisions,
    rewritten: results.flatMap((result) =>
      result.outcome === 'rewritten' ? [result.hash] : [],
    ),
    faults: results.flatMap((result) =>
      result.fault === null ? [] : [result.fault],
    ),
  };
};

/**
 * .what = write one revision's drift, or the fault that stopped it
 */
const setOneRevisionDrift = (input: {
  actorDir: string;
  hash: string;
  bootMdPathCurrent: string;
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
      bootMdPathCurrent: input.bootMdPathCurrent,
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
        revisionDir,
        reason: `drift not written (${cause.message}) — its clones keep their prior drift`,
        cause,
      },
    };
  }
};
