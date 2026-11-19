import { asRoleSlugOfHookAuthor } from '@src/domain.operations/brains/asRoleSlugOfHookAuthor';

/**
 * .what = whether a hook author names a role: `repo=<repo>/role=<role>`
 * .why = a role-authored hook is the one rhachet owns — synced, pruned, narrowed, moved into the
 *   dispatch manifest; a hook of any other author (a human's, the dispatcher's) is never touched
 * .note = read through `asRoleSlugOfHookAuthor`, the one parse of an author
 */
export const isHookAuthorOfRole = (input: { author: string }): boolean =>
  asRoleSlugOfHookAuthor({ author: input.author }) !== null;
