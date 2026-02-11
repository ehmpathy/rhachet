import glob from 'fast-glob';

/**
 * .what = filters file paths to only those matched by glob patterns
 * .why = enables boot.yml to curate which briefs/skills are said vs ref via glob patterns
 *
 * .note = paths must be absolute; globs are resolved relative to cwd
 */
export const filterPathsByGlob = async (input: {
  paths: string[];
  globs: string[];
  cwd: string;
}): Promise<string[]> => {
  // no globs means no matches
  if (input.globs.length === 0) return [];

  // no paths means no matches
  if (input.paths.length === 0) return [];

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

  // filter input paths to only those matched
  return input.paths.filter((p) => matched.has(p));
};

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

  // filter items to only those whose match path matched
  return input.items.filter((item) => matched.has(input.getMatchPath(item)));
};
