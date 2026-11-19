import { ActorDeclared } from '@src/domain.objects/ActorDeclared';

/**
 * .what = qualify each bare role entry of a package's published actors to that package's repo
 * .why = a bare slug in a published set means the publisher's own role. left bare, it escapes
 *        the publish-time check, and at the consumer it matches any linked role of that slug,
 *        from any package
 *
 * .note = a base (`@…`) and an entry already qualified (`repo/role`) pass as written; a `+` or
 *         `-` delta keeps its sigil
 */
export const asActorsQualifiedToRepo = (input: {
  actors: ActorDeclared[];
  repo: string;
}): ActorDeclared[] =>
  input.actors.map(
    (actor) =>
      new ActorDeclared({
        ...actor,
        roles: actor.roles.map((entry) =>
          asRoleEntryQualified({ entry, repo: input.repo }),
        ),
      }),
  );

/**
 * .what = one role entry, qualified to the repo where it names a bare role
 */
const asRoleEntryQualified = (input: {
  entry: string;
  repo: string;
}): string => {
  if (input.entry.startsWith('@')) return input.entry;
  const sigil =
    input.entry.startsWith('+') || input.entry.startsWith('-')
      ? input.entry[0]!
      : '';
  const body = input.entry.slice(sigil.length);
  if (body.includes('/')) return input.entry;
  return `${sigil}${input.repo}/${body}`;
};
