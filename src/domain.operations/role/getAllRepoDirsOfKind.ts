import { existsSync, readdirSync } from 'node:fs';
import { asRepoSlugKind } from './asRepoSlugKind';

/**
 * .what = every `repo=*` dir under a `.agent/` dir whose slug is one of the given kinds
 * .why = each scanner of `.agent/repo=*` filters the same entries by the same predicate; one
 *        read owns the filter, so the next scanner cannot forget a reserved literal
 *
 * .note = returns dir names (`repo=ehmpathy`), sorted: a scan is a function of the SET of
 *   dirs, never of readdir order
 * .note = an absent `.agent/` holds no repo dir
 */
export const getAllRepoDirsOfKind = (input: {
  agentDir: string;
  kinds: Array<ReturnType<typeof asRepoSlugKind>>;
}): string[] => {
  if (!existsSync(input.agentDir)) return [];
  return readdirSync(input.agentDir)
    .filter(
      (name) =>
        name.startsWith('repo=') &&
        input.kinds.includes(asRepoSlugKind({ slug: name })),
    )
    .sort();
};
