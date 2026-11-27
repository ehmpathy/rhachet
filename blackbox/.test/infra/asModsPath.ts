import * as path from 'node:path';

/**
 * .what = the path of one entry under a repo's `.agent/repo=.mods`
 * .why = every mods suite builds and breaks mods by path; one builder keeps them in step
 */
export const asModsPath = (input: { repo: string; rel: string }): string =>
  path.join(input.repo, '.agent', 'repo=.mods', input.rel);
