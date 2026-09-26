import glob from 'fast-glob';

/**
 * .what = filters items by glob match on a key path
 * .why = enables filter of refs/objects where the match key differs from the item
 *
 * .note = globs match against getMatchPath(item), returns full items that matched
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

  // run all globs and collect matched paths
  const matched = new Set<string>();
  for (const pattern of input.globs) {
    const matches = await glob(pattern, {
      cwd: input.cwd,
      absolute: true,
      onlyFiles: true,
    });
    matches.forEach((m) => matched.add(m));
  }

  // filter items to only those whose match path matched, sorted by that path so a render is byte-stable
  return input.items
    .filter((item) => matched.has(input.getMatchPath(item)))
    .sort((a, b) => {
      // code-unit order, the same order a bare Array.sort() gives the path list
      const pathA = input.getMatchPath(a);
      const pathB = input.getMatchPath(b);
      if (pathA === pathB) return 0;
      return pathA < pathB ? -1 : 1;
    });
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
