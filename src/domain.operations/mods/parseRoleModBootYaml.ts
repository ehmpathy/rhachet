import { RoleModSpec } from '@src/domain.objects/RoleModSpec';
import { isBootSectionKey } from '@src/domain.operations/role/isBootSectionKey';
import { parseBootYamlRaw } from '@src/domain.operations/role/parseBootYamlRaw';
import { parseRoleBootSpecFromRaw } from '@src/domain.operations/role/parseRoleBootSpecFromRaw';

import { asRoleModRefusalError } from './asRoleModRefusalError';
import { asRoleModTargetFromOf } from './asRoleModTargetFromOf';

/**
 * .what = parses a mod's boot.yml — the role's schema, plus `of`, less `budget`
 * .why = the mod's sections are a role spec in shape, so one parser validates both; this
 *        reader owns the two keys that part them
 *
 * .note = `budget` is refused: the budget is the role's, checked over the modded payload
 * .note = `inherit` is refused: a mod reads before its role, and has no `always` of its own
 *   to shed; an inheritance flag here would read as a change to the role's that it is not
 */
export const parseRoleModBootYaml = (input: {
  content: string;
  path: string;
  roleDir: string;
  reposLinked: string[];
}): RoleModSpec => {
  // parse yaml; an empty spec names no role
  const raw = parseBootYamlRaw({ content: input.content, path: input.path });
  const rawObject =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  // the target first, so every later refusal can name it
  const of = asRoleModTargetFromOf({
    of: rawObject.of,
    roleDir: input.roleDir,
    reposLinked: input.reposLinked,
  });

  // the budget is the role's
  if ('budget' in rawObject)
    throw asRoleModRefusalError({
      role: input.roleDir,
      problem: 'its boot.yml declares a `budget:`',
      subject: 'boot.yml',
      nearest: null,
      fix: "delete the `budget:` key — the role's own budget caps the modded payload",
    });

  // a mod sheds no `always` of its own
  const sectionsWithInherit = Object.entries(rawObject).filter(
    ([key, value]) =>
      isBootSectionKey(key) &&
      !!value &&
      typeof value === 'object' &&
      'inherit' in (value as Record<string, unknown>),
  );
  if (sectionsWithInherit.length > 0)
    throw asRoleModRefusalError({
      role: input.roleDir,
      problem: 'its boot.yml declares `inherit:`, which a mod cannot set',
      subject: sectionsWithInherit.map(([key]) => key).join(', '),
      nearest: null,
      fix: "delete the `inherit:` key — the role's own spec owns what its subjects inherit",
    });

  // the rest is a role spec in shape
  const { of: _of, ...rest } = rawObject;
  const sections = parseRoleBootSpecFromRaw({ raw: rest, path: input.path });

  return new RoleModSpec({ of, sections });
};
