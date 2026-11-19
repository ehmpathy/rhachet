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
   * .what = the drift fan-out this render triggered: the actor, the boot revisions it holds
   *         and the ones whose drift was re-written (by hash), and each write that faulted
   * .why = the editor's question after a render is "do my live clones get this?"; the init
   *        layer joins this to the clones that refer to each revision (`getOneActorBootDriftReach`)
   * .note = null where the brain dir sits outside the actor layout, so no actor holds it
   */
  drift: (BootDriftSweep & { actorDir: string }) | null;
};

/**
 * .what = what one drift sweep over an actor's revisions did: every revision it held, the ones
 *         whose drift was re-written, and each write that faulted; all by hash
 * .why = the sweep, its summary, and the render each carry this one shape
 */
export type BootDriftSweep = {
  revisions: string[];
  rewritten: string[];
  faults: BootDriftFault[];
};

/**
 * .what = one drift the fan-out could not deliver: the path at fault, why, and the cause
 * .why = a fault names where and why its clones miss the drift: a write failed, or a ref is
 *        unreadable. each one raises the exit code of the sync that met it
 * .note = `path` is a revision dir where a drift write failed, or the clones dir where a ref
 *         read failed
 */
export type BootDriftFault = {
  path: string;
  reason: string;
  cause: Error;
};

/**
 * .what = how far one actor's drift reaches its clones: how many refer to a re-written revision,
 *         the revisions a ref names that are gone, and the faults of the read
 * .why = init's readout and exit code read one shape; four sites carry it
 * .note = `clones` is null where a ref read faulted: the count is unknown, never a false zero
 * .note = `gone` holds revision hashes, as `rewritten` does; the readout spells each label
 * .note = a gone revision is a row, never a fault: its clone may be dead, and a dead clone needs
 *         a prune, not an exit 1 on every init
 * .note = `unreached` counts the clones that hold no ref — spawned before boot drift, or by a
 *         resume — which take no drift at any compaction; null where a ref read faulted
 */
export type BootDriftReach = {
  clones: number | null;
  unreached: number | null;
  gone: string[];
  faults: BootDriftFault[];
};

/**
 * .what = one brain dir that failed to render, with its cause
 * .why = a sweep collects failures and continues; the caller names each and picks the exit code
 */
export type BrainDirBootFailure = {
  scope: BrainDirBootScope;
  cause: Error;
};
