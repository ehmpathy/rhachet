import { MalfunctionError } from 'helpful-errors';

import { toRolePackageFromRepo } from '@src/domain.objects/RoleSupplierSlug';
import { getFileContentOrNull } from '@src/infra/filesystem/getFileContentOrNull';

import { join } from 'node:path';

/**
 * .what = the installed version of the package that ships a repo's roles, or null
 * .why = a mod pinned with `of: repo/role@version` is compared to what is installed, so a
 *        release that moved the role names each mod to re-read (usecase 5)
 *
 * .note = null where the package is not installed, or names no version; only an absent file
 *   reads as absent, an unreadable one fails loud
 */
export const getOneRolePackageVersion = (input: {
  cwd: string;
  repo: string;
}): string | null => {
  const path = join(
    input.cwd,
    'node_modules',
    `${toRolePackageFromRepo(input.repo)}`,
    'package.json',
  );
  const content = getFileContentOrNull({ path });
  if (content === null) return null;
  // narrow the parsed json, so a manifest that is not an object reads as no version; a manifest
  //   that is not json at all is a broken install, named with its path and its repair
  const parsed = ((): unknown => {
    try {
      return JSON.parse(content);
    } catch (error: unknown) {
      throw new MalfunctionError(
        'the installed role package has an unreadable package.json',
        {
          path,
          problem: error instanceof Error ? error.message : String(error),
          fix: `reinstall it: pnpm install ${toRolePackageFromRepo(input.repo)}`,
        },
      );
    }
  })();
  const version =
    parsed && typeof parsed === 'object' && 'version' in parsed
      ? parsed.version
      : null;
  return typeof version === 'string' ? version : null;
};
