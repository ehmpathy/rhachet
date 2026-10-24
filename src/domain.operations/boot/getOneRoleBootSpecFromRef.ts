import type { RoleBootSpec } from '@src/domain.objects/RoleBootSpec';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';

import { statSync } from 'node:fs';
import { join } from 'node:path';
import { parseRoleBootYaml } from './parseRoleBootYaml';
import { readOneBootSpecFile } from './readOneBootSpecFile';

/**
 * .what = the boot spec of one linked role, or null where the role declares none
 * .why = the render, the focus check and the `always` shed all ask a linked role what it
 *        declares; one reader means all three see the same spec
 *
 * .note = the probe is `statSync` with `throwIfNoEntry: false`, never `existsSync`: only an
 *   absent spec reads as absent, so an unreadable one raises rather than downgrade a curated
 *   boot to say-all (`define.statsync-and-lstatsync-suppress-different-errnos`), as
 *   `getOneBootConfigForSource` does
 */
export const getOneRoleBootSpecFromRef = (input: {
  ref: RoleLinkRef;
  repoPath: string;
}): RoleBootSpec | null => {
  const pathToSpec = join(
    input.repoPath,
    '.agent',
    `repo=${input.ref.repo}`,
    `role=${input.ref.role}`,
    'boot.yml',
  );
  if (!statSync(pathToSpec, { throwIfNoEntry: false })) return null;
  return parseRoleBootYaml({
    content: readOneBootSpecFile({ pathToSpec }),
    path: pathToSpec,
  });
};
