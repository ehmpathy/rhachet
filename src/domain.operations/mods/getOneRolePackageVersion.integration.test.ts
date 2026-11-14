import { MalfunctionError } from 'helpful-errors';
import { genTempDir, getError, given, then, when } from 'test-fns';

import { asTempDirMasked } from '@src/.test/infra/asTempDirMasked';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneRolePackageVersion } from './getOneRolePackageVersion';

/**
 * .what = a temp repo whose `rhachet-roles-acme` install holds the given package.json content
 */
const genRepoWithManifest = (input: { content: string | null }): string => {
  const cwd = genTempDir({ slug: 'role-package-version' });
  if (input.content === null) return cwd;
  const dir = join(cwd, 'node_modules', 'rhachet-roles-acme');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), input.content);
  return cwd;
};

describe('getOneRolePackageVersion', () => {
  given('[case1] the role package is not installed', () => {
    when('[t0] its version is read', () => {
      then('it reads as null', () => {
        const cwd = genRepoWithManifest({ content: null });
        expect(getOneRolePackageVersion({ cwd, repo: 'acme' })).toBeNull();
      });
    });
  });

  given('[case2] the installed manifest names a version', () => {
    when('[t0] its version is read', () => {
      then('it is the version', () => {
        const cwd = genRepoWithManifest({
          content: '{"name":"rhachet-roles-acme","version":"1.40.0"}',
        });
        expect(getOneRolePackageVersion({ cwd, repo: 'acme' })).toEqual(
          '1.40.0',
        );
      });
    });
  });

  given('[case3] the installed manifest is json, but names no version', () => {
    when('[t0] its version is read', () => {
      then('it reads as null', () => {
        const cwd = genRepoWithManifest({ content: '["not", "an", "object"]' });
        expect(getOneRolePackageVersion({ cwd, repo: 'acme' })).toBeNull();
      });
    });
  });

  given('[case4] the installed manifest is not json at all', () => {
    when('[t0] its version is read', () => {
      then(
        'it fails loud as a malfunction, with the path and the reinstall',
        async () => {
          const cwd = genRepoWithManifest({
            content: '{ "version": "1.40.0",',
          });
          const error = await getError(async () =>
            getOneRolePackageVersion({ cwd, repo: 'acme' }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain(
            'the installed role package has an unreadable package.json',
          );
          expect(error.message).toContain('pnpm install rhachet-roles-acme');
          expect(
            asTempDirMasked({
              of: error.message,
              dir: cwd,
              into: '/TMP_REPO',
            }).replace(/"problem": ".*"/, '"problem": "<parse error>"'),
          ).toMatchSnapshot();
        },
      );
    });
  });
});
