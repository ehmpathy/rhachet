import { ConstraintError } from 'helpful-errors';

import { ActorDeclared } from '@src/domain.objects/ActorDeclared';
import type { BrainSlug } from '@src/domain.objects/BrainSlug';

/**
 * .what = the kind of one role entry in an actor's `roles`
 */
type ActorRoleEntryKind = 'base' | 'plus' | 'minus' | 'concrete';

/**
 * .what = classify one role entry by its lead sigil
 */
const asActorRoleEntryKind = (input: { entry: string }): ActorRoleEntryKind => {
  if (input.entry.startsWith('@')) return 'base';
  if (input.entry.startsWith('+')) return 'plus';
  if (input.entry.startsWith('-')) return 'minus';
  return 'concrete';
};

/**
 * .what = whether a value is a plain object (not null, not an array)
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * .what = cast one parsed `actor:` entry into an ActorDeclared, or refuse it with the fix
 * .why = a repo's `actors.yml` and a package's published actors share one entry shape, so
 *        both validate each entry the same way
 *
 * .note = checks the entry alone. base lookup, cycles and the propagated brain need the other
 *         actors and the installed packages, so the expander owns them
 */
export const asActorDeclared = (input: {
  entry: unknown;
  index: number;
  path: string;
}): ActorDeclared => {
  // the entry must be a map with a slug
  if (!isPlainObject(input.entry))
    throw new ConstraintError(`actors.yml actor[${input.index}] is not a map`, {
      path: input.path,
      found: input.entry,
      hint: 'each actor is a map: { slug, brain, roles }',
    });
  const { slug, brain, roles } = input.entry;
  if (typeof slug !== 'string' || !slug.length)
    throw new ConstraintError(`actors.yml actor[${input.index}] has no slug`, {
      path: input.path,
      hint: 'add `slug: <name>` — the actor is addressed as `@<slug>`',
    });

  // the brain, where stated, is a slug
  if (brain !== undefined && brain !== null && typeof brain !== 'string')
    throw new ConstraintError(
      `actors.yml actor @${slug} has a brain that is not a slug`,
      {
        path: input.path,
        found: brain,
        hint: 'set `brain: <slug>`, e.g. `brain: anthropic/claude/code`',
      },
    );

  // the roles are a non-empty list of strings
  if (
    !Array.isArray(roles) ||
    !roles.length ||
    roles.some((r) => typeof r !== 'string')
  )
    throw new ConstraintError(`actors.yml actor @${slug} has no role list`, {
      path: input.path,
      found: roles,
      hint: "set `roles:` to a list of roles, or a quoted base `'@<slug>'` then `+role` / `-role` deltas",
    });
  const kinds = (roles as string[]).map((entry) =>
    asActorRoleEntryKind({ entry }),
  );

  // a base, where present, is the sole base and leads the list
  const countBase = kinds.filter((kind) => kind === 'base').length;
  if (countBase > 1)
    throw new ConstraintError(
      `actors.yml actor @${slug} names more than one base`,
      {
        path: input.path,
        roles,
        hint: 'keep one `@<slug>` base and express the rest as `+role` / `-role` deltas',
      },
    );
  if (countBase === 1 && kinds[0] !== 'base')
    throw new ConstraintError(
      `actors.yml actor @${slug} names its base after a role`,
      {
        path: input.path,
        roles,
        hint: 'move the `@<slug>` base to the head of `roles:`',
      },
    );

  // concrete roles and deltas never mix (S6)
  const hasConcrete = kinds.includes('concrete');
  const hasDelta = kinds.some((kind) => kind === 'plus' || kind === 'minus');
  if (hasConcrete && (hasDelta || countBase))
    throw new ConstraintError(
      `actors.yml actor @${slug} mixes concrete roles with a base or deltas`,
      {
        path: input.path,
        roles,
        hint: "either list concrete roles only, or a quoted `'@<slug>'` base then `+role` / `-role` deltas",
      },
    );
  if (hasDelta && !countBase)
    throw new ConstraintError(
      `actors.yml actor @${slug} has deltas with no base`,
      {
        path: input.path,
        roles,
        hint: "add a quoted `'@<slug>'` base at the head of `roles:`, or drop the `+` / `-` sigils",
      },
    );

  // an actor with no base must state its brain (F11, S7)
  const brainFound = typeof brain === 'string' ? (brain as BrainSlug) : null;
  if (!countBase && !brainFound)
    throw new ConstraintError(`actors.yml actor @${slug} reaches no brain`, {
      path: input.path,
      hint: 'add `brain: <slug>` — only an actor that extends a base may omit it',
    });

  return new ActorDeclared({
    slug,
    brain: brainFound,
    roles: roles as string[],
  });
};
