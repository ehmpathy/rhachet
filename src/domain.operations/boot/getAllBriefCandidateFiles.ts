import type { BootSource } from './BootSource';

/**
 * .what = the files a source offers as brief candidates, before say/ref is computed
 * .why = the two sources have DIFFERENT universes, and that is a domain rule rather than a
 *        filter detail — so it gets a name (`rule.require.named-transformers`) rather than a
 *        nested ternary a reader must simulate.
 *
 * .note = the two universes, and why they differ:
 *     - a ROLE declares a `briefs/` subdir, so the universe is exactly that subtree
 *     - a MANIFEST has none — a route dir carries its docs beside the spec — so the universe
 *       is every neighbor that is neither the readme nor a skill. a `briefs/` requirement
 *       would render such a manifest empty
 *
 * .note = the blocklist is subtractive and applies to BOTH arms. it drops work-in-progress
 *   and deprecated subtrees, which no source intends to boot.
 */
export const getAllBriefCandidateFiles = (input: {
  allFiles: string[];
  source: BootSource;
  blocklist: string[];
}): string[] =>
  input.allFiles.filter(
    (path) =>
      isWithinBriefUniverse({ path, source: input.source }) &&
      !isBlocklisted({ path, blocklist: input.blocklist }),
  );

/**
 * .what = whether a path sits in the source's brief universe
 * .why = a role's universe is its `briefs/` subtree; a manifest's is every neighbor that is
 *        neither the readme nor a skill
 */
const isWithinBriefUniverse = (input: {
  path: string;
  source: BootSource;
}): boolean =>
  input.source.dirBriefs
    ? input.path.startsWith(input.source.dirBriefs)
    : input.path !== input.source.pathToReadme &&
      !input.path.startsWith(input.source.dirSkills);

/**
 * .what = whether a path sits under a blocklisted subdir
 * .why = work-in-progress and deprecated subtrees are never booted, from either source
 */
const isBlocklisted = (input: { path: string; blocklist: string[] }): boolean =>
  input.blocklist.some((dir) => input.path.includes(`/${dir}/`));
