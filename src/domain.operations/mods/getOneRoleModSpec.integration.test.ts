import { ConstraintError } from 'helpful-errors';
import { genTempDir, getError, given, then, when } from 'test-fns';

import { asTempDirMasked } from '@src/.test/infra/asTempDirMasked';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneRoleModSpec } from './getOneRoleModSpec';

/**
 * .what = a temp repo whose `.agent/repo=.mods/role=surfer/` dir holds only the given files
 */
const genRepoWithModDir = (input: {
  files: Array<{ rel: string; content: string }>;
}): string => {
  const cwd = genTempDir({ slug: 'role-mod-spec' });
  const modDir = join(cwd, '.agent', 'repo=.mods', 'role=surfer');
  mkdirSync(join(modDir, 'briefs'), { recursive: true });
  input.files.forEach((file) =>
    writeFileSync(join(modDir, file.rel), file.content),
  );
  return cwd;
};

describe('getOneRoleModSpec', () => {
  given('[case1] a mod dir that holds no boot.yml', () => {
    when('[t0] its spec is read', () => {
      then(
        'it is refused: the mod names no role, and the fix names the boot.yml to add',
        async () => {
          const cwd = genRepoWithModDir({
            files: [{ rel: 'briefs/rule.require.surf-wax.md', content: 'wax' }],
          });
          const error = await getError(async () =>
            getOneRoleModSpec({ cwd, role: 'surfer' }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('the mod of role=surfer is refused');
          expect(error.message).toContain('it holds no boot.yml');
          expect(error.message).toContain(
            'add .agent/repo=.mods/role=surfer/boot.yml',
          );
          expect(
            asTempDirMasked({ of: error.message, dir: cwd, into: '/TMP_REPO' }),
          ).toMatchSnapshot();
        },
      );
    });
  });

  given('[case2] a mod dir with a boot.yml and a brief', () => {
    when('[t0] its spec is read', () => {
      then(
        'the spec names the role, and the brief is a file the mod ships',
        () => {
          const cwd = genRepoWithModDir({
            files: [
              { rel: 'boot.yml', content: 'of: surfer\n' },
              { rel: 'briefs/rule.require.surf-wax.md', content: 'wax' },
            ],
          });
          const { spec, filesMod } = getOneRoleModSpec({ cwd, role: 'surfer' });
          expect(spec.of.role).toEqual('surfer');
          expect(filesMod).toEqual(['briefs/rule.require.surf-wax.md']);
        },
      );
    });
  });
});
