import picomatch from 'picomatch';

import { relative, sep } from 'node:path';

/**
 * .what = a glob as picomatch reads it, with the `./` a spec may lead with cut
 * .why = a spec may write `./briefs/x.md`; the path it is matched against never leads so
 */
const asGlobRelative = (input: { glob: string }): string =>
  input.glob.replace(/^\.\//, '');

/**
 * .what = a path as a glob matches it: relative to the cwd, with `/` as its separator
 * .why = a glob is written in posix form; on a host whose separator is `\`, a raw relative path
 *        would match no glob
 */
const asGlobMatchKey = (input: { cwd: string; path: string }): string =>
  relative(input.cwd, input.path).split(sep).join('/');

/**
 * .what = the code-unit order of two paths, as a sort comparator
 * .why = the same order a bare `Array.sort()` gives the path list, so a render is byte-stable
 */
const asCodeUnitOrder = (input: { a: string; b: string }): number => {
  if (input.a === input.b) return 0;
  return input.a < input.b ? -1 : 1;
};

/**
 * .what = filters items by glob match on a key path
 * .why = enables filter of refs/objects where the match key differs from the item
 *
 * .note = globs match against getMatchPath(item), returns full items that matched
 * .note = the match runs over the items, never over the disk: the items are the boot's whole
 *   universe, so a file the disk lacks (a not of a view the last render left modded, while its
 *   mod is skipped) still matches the spec that says it. dotfiles match no glob, as before
 */
export const filterByGlob = async <T>(input: {
  items: T[];
  globs: string[];
  cwd: string;
  getMatchPath: (item: T) => string;
}): Promise<T[]> => {
  // no globs means no matches
  if (input.globs.length === 0) return [];

  // no items means no matches
  if (input.items.length === 0) return [];

  // match each item's path, relative to the cwd, against every glob
  const isMatch = picomatch(
    input.globs.map((glob) => asGlobRelative({ glob })),
    { dot: false },
  );
  const isItemMatched = (item: T): boolean =>
    isMatch(asGlobMatchKey({ cwd: input.cwd, path: input.getMatchPath(item) }));

  // filter items to only those whose match path matched, sorted by that path so a render is byte-stable
  return input.items
    .filter((item) => isItemMatched(item))
    .sort((a, b) =>
      asCodeUnitOrder({ a: input.getMatchPath(a), b: input.getMatchPath(b) }),
    );
};

/**
 * .what = filters file paths to only those matched by glob patterns
 * .why = enables boot.yml to curate which briefs/skills are said vs ref via glob patterns
 *
 * .note = paths must be absolute; globs are resolved relative to cwd
 * .note = a path IS its own match key, so this is `filterByGlob` under an identity key.
 *         it keeps its own name because a caller that holds bare paths should not have to
 *         hand over an identity lambda to say so
 */
export const filterPathsByGlob = async (input: {
  paths: string[];
  globs: string[];
  cwd: string;
}): Promise<string[]> =>
  filterByGlob({
    items: input.paths,
    globs: input.globs,
    cwd: input.cwd,
    getMatchPath: (path) => path,
  });
