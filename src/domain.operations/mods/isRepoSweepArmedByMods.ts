import { getAllRoleModEntries } from './getAllRoleModEntries';

/**
 * .what = whether the mods dir arms the stop sweep: a mod, a stray entry, or an unreadable path
 * .why = the sweep names every mod fault, and a fault no role carries has no other surface that
 *        repeats it, so each arms the sweep as a mod does
 *
 * .note = a mod fault is the repo's, never one actor's, so an armed sweep rides every actor: the
 *   hook sync attaches it, and each actor narrow keeps it (`isHookOfRepoModSweep`)
 */
export const isRepoSweepArmedByMods = (input: { gitroot: string }): boolean => {
  const entries = getAllRoleModEntries({ cwd: input.gitroot });
  return (
    entries.slugs.length > 0 ||
    entries.strays.length > 0 ||
    entries.fault !== null
  );
};
