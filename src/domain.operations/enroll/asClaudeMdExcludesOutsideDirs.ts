import { sep } from 'node:path';

/**
 * .what = the claudeMdExcludes patterns that name no file within the given dirs
 * .why = an actor must never exclude its own doors — that would hide its own boot. the repo
 *        actor's doors have two paths (its real dir, and `<repo>/.claude`), so a caller
 *        passes every path its doors are reached by
 *
 * .note = a pattern within a dir starts with `<dir>/`; a glob such as `**\/CLAUDE.local.md`
 *   names no dir, so it always survives
 */
export const asClaudeMdExcludesOutsideDirs = (input: {
  excludes: string[];
  dirs: string[];
}): string[] =>
  input.excludes.filter(
    (pattern) => !input.dirs.some((dir) => pattern.startsWith(`${dir}${sep}`)),
  );
