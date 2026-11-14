import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import type { RoleModTarget } from '@src/domain.objects/RoleModTarget';
import { asRepoSlugKind } from '@src/domain.operations/role/asRepoSlugKind';

import { asRoleModRefusalError } from './asRoleModRefusalError';

/**
 * .what = the one linked role a mod's `of:` names
 * .why = a mod over a role that is not linked, or over one of two roles it cannot tell apart,
 *        would edit naught or edit the wrong role; each case is refused (usecase 6)
 *
 * .note = a `.this` role is refused by name: edit it in place, it is already this repo's (F18)
 * .note = a bare `of: <role>` resolves among package roles only; a `.this` role of the same
 *   slug is never a candidate, so it cannot make a bare `of` ambiguous
 */
export const getOneRoleModTargetLinked = (input: {
  of: RoleModTarget;
  refsLinked: RoleLinkRef[];
}): RoleLinkRef => {
  const { of } = input;
  const ofLabel = of.repo ? `${of.repo}/${of.role}` : of.role;
  const candidates = input.refsLinked.filter(
    (ref) =>
      ref.role === of.role && asRepoSlugKind({ slug: ref.repo }) === 'package',
  );
  const candidatesLabel = candidates.map((ref) => `${ref.repo}/${ref.role}`);

  // a native role is this repo's own; it is edited where it lives
  if (of.repo && asRepoSlugKind({ slug: of.repo }) !== 'package')
    throw asRoleModRefusalError({
      role: of.role,
      problem: `its \`of: ${ofLabel}\` names a role this repo owns`,
      subject: 'boot.yml',
      nearest: candidatesLabel[0] ?? null,
      fix: `edit .agent/repo=${of.repo}/role=${of.role}/ in place, and delete the mod`,
    });

  // a pinned repo must be linked
  if (of.repo) {
    const found = candidates.find((ref) => ref.repo === of.repo);
    if (found) return found;
    throw asRoleModRefusalError({
      role: of.role,
      problem: `its \`of: ${ofLabel}\` names a role that is not linked`,
      subject: 'boot.yml',
      nearest: candidatesLabel[0] ?? null,
      fix: `link it first (rhx init --roles ${ofLabel}), or point \`of:\` at a linked role`,
    });
  }

  // a bare role must name exactly one linked role
  if (candidates.length === 1) return candidates[0]!;
  if (candidates.length === 0)
    throw asRoleModRefusalError({
      role: of.role,
      problem: `its \`of: ${ofLabel}\` names a role that is not linked`,
      subject: 'boot.yml',
      nearest: null,
      fix: `link it first (rhx init --roles <repo>/${of.role}), or delete the mod`,
    });
  throw asRoleModRefusalError({
    role: of.role,
    problem: `its \`of: ${ofLabel}\` matches ${candidates.length} linked roles`,
    subject: 'boot.yml',
    nearest: candidatesLabel.join(', '),
    fix: `pin one: \`of: ${candidatesLabel[0]}\``,
  });
};
