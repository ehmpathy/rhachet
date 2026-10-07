import { ConstraintError } from 'helpful-errors';

import { getOneGitRepoRootSync } from '@src/infra/git/getOneGitRepoRootSync';
import { isPathOutsideDir } from '@src/utils/isPathOutsideDir';

import { dirname, relative, resolve } from 'node:path';
import type { BootSource } from './BootSource';
import { genBootSource } from './genBootSource';
import { getAllNearbySpecPaths } from './getAllNearbySpecPaths';
import { getOneBriefsDirIfExtant } from './getOneBriefsDirIfExtant';
import { getOneManifestPathStat } from './getOneManifestPathStat';

/**
 * .what = the boot source for a declared manifest — the spec is the path the caller named
 * .why = schema parity with a role default (requirement 1), and a loud refusal when the path
 *        is not a readable file (requirement 5)
 *
 * .note = no `ifPresent`, and never null: an absent manifest is a typo, and every failure raises
 */
export const getOneBootSourceFromManifest = (input: {
  path: string;
  cwd: string;
}): BootSource => {
  const { cwd } = input;
  const pathToSpec = resolve(cwd, input.path);

  // a manifest may not reach outside the repo root (or cwd, outside any repo). the check
  // precedes the stat, so no read lands outside the bound
  const dirBound = getOneGitRepoRootSync({ from: cwd }) ?? cwd;
  if (isPathOutsideDir({ path: pathToSpec, dir: dirBound }))
    throw new ConstraintError('--what reaches outside the repo', {
      path: input.path,
      pathTaken: pathToSpec,
      repoRoot: dirBound,
      hint: 'name a boot.yml path inside the repo',
    });

  // a path that is not a file (absent, or a directory) is a caller defect — always loud
  const statSpec = getOneManifestPathStat({
    path: input.path,
    pathTaken: pathToSpec,
  });
  if (!statSpec?.isFile()) {
    // offer the nearest extant spec, only when one is close
    const pathsNearby = getAllNearbySpecPaths({ pathToSpec, cwd });

    throw new ConstraintError('--what points at no file', {
      path: input.path,
      pathTaken: pathToSpec,
      expected: 'a readable boot.yml',
      found: statSpec?.isDirectory() ? 'a directory' : 'no such path',
      ...(pathsNearby.length ? { didYouMean: pathsNearby } : {}),
      // the halt names the ALTERNATIVE, for a caller who meant a role rather than a manifest
      hint: 'fix the path, or boot a role instead — `roles boot --repo <slug> --role <slug>`',
    });
  }

  const rootDir = dirname(pathToSpec);

  const coordinates = `--what ${relative(cwd, pathToSpec)}`;

  return genBootSource({
    rootDir,
    pathToSpec,
    // the layout decides the universe, never the arm that read the spec: a dir with a
    //   `briefs/` subdir scopes to it, as the role arm does; a dir without one keeps the
    //   whole `rootDir` as its universe
    dirBriefs: getOneBriefsDirIfExtant({ rootDir }),
    // the label anchors on the repo root, so it reads the same from any cwd; the invocation
    // stays cwd-relative, since the caller re-runs it from where they stand
    label: { base: dirBound, prefix: '' },
    invocation: `roles boot ${coordinates}`,
    coordinates,

    // a named, proven file: a downstream absence is a vanish, never a say-all fallback
    specIsDeclared: true,
  });
};
