import type { BootStats } from './BootStats';

/**
 * .what = the scope of one brain dir render — the repo actor, one hash actor, or the
 *         actor enumeration itself
 * .why = a census line and a failure line each name which brain dir they speak of
 */
export type BrainDirBootScope =
  | { kind: 'repo'; actorExid: string }
  | { kind: 'actor'; actorExid: string }
  | { kind: 'actors' };

/**
 * .what = one corpus written into one brain dir
 * .why = init, upgrade, roles link and enroll each print one census line per render
 */
export type BrainDirBootRender = {
  scope: BrainDirBootScope;
  bootMdPath: string;
  stats: BootStats;
  agentsMdReset: boolean;
  /**
   * .what = true where this render WROTE boot.md for the first time
   * .why = "created" and "upgraded" are different facts to a human: one says a brain
   *        dir is new, the other says a live one just changed under its clones. the
   *        distinction is knowable only at write time, so it is captured here
   */
  bootMdCreated: boolean;
  /**
   * .what = true where this render wrote bytes that differ from the boot.md it replaced
   *         (always true on a create)
   * .why = a corpus that changed under a live brain dir is news — its clones boot a new roleset;
   *        an identical re-render is not. like `bootMdCreated`, it is knowable only at write time
   */
  bootMdChanged: boolean;
  /**
   * .what = the drift fan-out this render triggered: the actor, the clones that hold a spawn
   *         boot and the ones whose drift was re-written (by serial), and each write that faulted
   * .why = the editor's question after a render is "do my live clones get this?"; each clone
   *        holds its own drift, so the sweep's own counts answer it
   * .note = null where the brain dir sits outside the actor layout, so no actor holds it
   */
  drift: (BootDriftSweep & { actorDir: string }) | null;
};

/**
 * .what = what one drift sweep over an actor's clones did: every clone that holds a spawn boot,
 *         the ones whose drift was re-written, and each write that faulted; all by serial
 * .why = the sweep, its summary, and the render each carry this one shape
 */
export type BootDriftSweep = {
  clones: string[];
  rewritten: string[];
  faults: BootDriftFault[];
};

/**
 * .what = one drift the fan-out could not deliver: the path at fault, why, and the cause
 * .why = a fault names where and why a clone misses the drift; each one raises the exit code of
 *        the sync that met it
 * .note = `path` is the spawn boot dir whose drift write failed
 */
export type BootDriftFault = {
  path: string;
  reason: string;
  cause: Error;
};

/**
 * .what = one brain dir that failed to render, with its cause
 * .why = a sweep collects failures and continues; the caller names each and picks the exit code
 */
export type BrainDirBootFailure = {
  scope: BrainDirBootScope;
  cause: Error;
};
