import { readdirSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { getAllNamesNearby } from './getAllNamesNearby';

/**
 * .what = the spec files that sit beside a `--what` path and read like what the caller typed
 * .why = the halt offers the nearest extant match, when one is close — and this is the first
 *        cell a typo hits, so its message is read more often than any other halt in the feature
 *
 * 🔴 .note = it offers only names within the edit-distance threshold, and none when no name
 *   is that close (`getAllNamesNearby`).
 *
 * .note = the walk is ONE `readdirSync` of the path's own dirname — never a tree walk. a
 *   typo lands in the directory the caller aimed at.
 */
export const getAllNearbySpecPaths = (input: {
  pathToSpec: string;
  cwd: string;
}): string[] => {
  const dirSpec = dirname(input.pathToSpec);
  const nameTyped = basename(input.pathToSpec);

  const namesFound = ((): string[] => {
    try {
      return readdirSync(dirSpec);
    } catch (error) {
      // 🔴 an allowlist: these four codes mean the caller's dir cannot be enumerated, so the
      //   offer is empty. every other code rethrows (`rule.forbid.failhide`)
      const code = (error as NodeJS.ErrnoException)?.code;
      if (!['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM'].includes(code ?? ''))
        throw error;
      return [];
    }
  })();

  return getAllNamesNearby({ names: namesFound, nameTyped }).map((name) =>
    relative(input.cwd, join(dirSpec, name)),
  );
};
