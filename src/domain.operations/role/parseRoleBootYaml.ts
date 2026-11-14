import { ConstraintError } from 'helpful-errors';

import type { RoleBootSpec } from '@src/domain.objects/RoleBootSpec';

import { parseBootYamlRaw } from './parseBootYamlRaw';
import { parseRoleBootSpecFromRaw } from './parseRoleBootSpecFromRaw';

/**
 * .what = parses a role's boot.yml content into a validated RoleBootSpec
 * .why = centralizes yaml parse + mode detection + zod validation
 *
 * .note = returns null if content is empty or null (means no boot.yml)
 * .note = `of` belongs only to a mod's boot.yml; in a role's own spec it would name a role
 *   the spec is not over, so it is refused rather than ignored (usecase 11)
 */
export const parseRoleBootYaml = (input: {
  content: string;
  path: string;
}): RoleBootSpec | null => {
  // parse yaml
  const raw = parseBootYamlRaw({ content: input.content, path: input.path });

  // handle null or empty content
  if (!raw || typeof raw !== 'object') return null;
  const rawObject = raw as Record<string, unknown>;

  // a role's spec may not declare the mod's key
  if ('of' in rawObject)
    throw new ConstraintError(
      'boot.yml declares `of:`, which belongs only in a mod boot.yml',
      {
        path: input.path,
        hint: 'to mod a role, put this spec at .agent/repo=.mods/role=<role>/boot.yml; in a role of its own, delete the `of:` key',
      },
    );

  return parseRoleBootSpecFromRaw({ raw: rawObject, path: input.path });
};
