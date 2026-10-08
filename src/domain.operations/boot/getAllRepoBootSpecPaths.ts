import glob from 'fast-glob';

/**
 * .what = the boot specs a repo can reach, by default
 * .why = the sweep is the REPO, never a role package's `src/domain.roles/` alone — the
 *        payload this whole behavior was written for is a route-scoped manifest, and a glob
 *        set narrowed to published role specs would miss it entirely.
 *
 * .note = `node_modules` is excluded rather than walked. a linked role's spec is reached
 *   through its `.agent/` symlink, which is the path a reader can actually address.
 *
 * .note = a REACH POLICY; the readout prints these globs (`asBootCostSweepReachLines`)
 */
const GLOBS_DEFAULT = [
  // a linked role, and a repo-local one
  '.agent/repo=*/role=*/boot.yml',

  // a route-scoped manifest — the payload this whole behavior was written for
  '.behavior/*/boot.yml',
  '.route/*/boot.yml',

  // a role package's own specs
  'src/domain.roles/*/boot.yml',
];
export const GLOBS_IGNORED = ['**/node_modules/**', '**/dist/**', '**/.git/**'];

/**
 * .what = every boot spec path this repo reaches, sorted, with the reach that found them
 * .why = the walk's four options are each a correction of a default that would have made the
 *        sweep silently short, so they are a POLICY rather than call sugar. inline in the
 *        sweep's body they read as decode-friction a caller must simulate
 *        (`rule.forbid.inline-decode-friction`); named here they have one owner and one test.
 *
 * 🔴 .note = the reach rides back WITH the paths, so a caller renders the bound it actually
 *   applied rather than a second copy of the glob list it would have to keep in step.
 */
export const getAllRepoBootSpecPaths = async (input: {
  cwd: string;
  globs: readonly string[] | null;
}): Promise<{ paths: string[]; globs: readonly string[] }> => {
  // a caller may narrow the reach (the onStop hook sweeps `.agent/repo=.this` alone); null
  // takes the repo-wide default
  const globs = input.globs ?? GLOBS_DEFAULT;
  const paths = await glob([...globs], {
    cwd: input.cwd,
    ignore: GLOBS_IGNORED,
    absolute: true,
    onlyFiles: true,

    // 🔴 every spec this sweep exists for sits under a DOT dir — `.agent/repo=*/role=*/`,
    // `.behavior/v*/`, `.route/v*/` — and fast-glob skips those by default. without this the
    // sweep finds a role package's `src/domain.roles/*/boot.yml` and no other
    dot: true,

    // a linked role's spec IS a symlink to a file (measured: 13 of 15 here), so the sweep
    // must follow to see it at all
    //
    // .note = fast-glob yields the path it MATCHED, never the realpath, so a row names the
    //   `.agent/` path a reader can address rather than a store path they cannot
    followSymbolicLinks: true,
  });

  // .note = sorted HERE rather than at the caller, so every consumer of this reach gets one
  //   deterministic order — a roster whose row order shifts between runs is a snapshot that
  //   flakes for no behavior change
  return { paths: [...paths].sort(), globs };
};
