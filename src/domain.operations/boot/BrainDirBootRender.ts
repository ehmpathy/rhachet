import type { BootStats } from './BootStats';

/**
 * .what = the scope of one brain dir render — the repo actor, one hash actor, or the
 *         actor enumeration itself
 * .why = a census line and a failure line each name which brain dir they speak of
 */
export type BrainDirBootScope =
  | { kind: 'repo' }
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
   * .what = true where this render wrote bytes that differ from the prior boot.md
   * .why = `upgraded` claims a live brain dir just changed under its clones; a
   *        byte-identical re-render changed naught, so the report must not say so.
   *        like `bootMdCreated`, it is knowable only at write time
   */
  bootMdChanged: boolean;
};

/**
 * .what = one brain dir that failed to render, with its cause
 * .why = a sweep collects failures and continues; the caller names each and picks the exit code
 */
export type BrainDirBootFailure = {
  scope: BrainDirBootScope;
  cause: Error;
};
