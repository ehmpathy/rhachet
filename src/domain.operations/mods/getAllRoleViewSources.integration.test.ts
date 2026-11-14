import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { asTempDirMasked } from '@src/.test/infra/asTempDirMasked';
import { RoleModdedViewRecord } from '@src/domain.objects/RoleModdedViewRecord';

import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllRoleViewSources } from './getAllRoleViewSources';

describe('getAllRoleViewSources', () => {
  given('[case1] a kind dir of file links, with no record', () => {
    const scene = useBeforeAll(async () => {
      const roleDir = genTempDir({ slug: 'view-sources-case1' });
      mkdirSync(join(roleDir, 'store'), { recursive: true });
      writeFileSync(join(roleDir, 'store', 'surf-wax.md'), '# surf wax\n');
      mkdirSync(join(roleDir, 'briefs', 'practices'), { recursive: true });
      symlinkSync(
        join(roleDir, 'store', 'surf-wax.md'),
        join(roleDir, 'briefs', 'practices', 'surf-wax.md'),
      );
      return { roleDir };
    });

    when('[t0] its sources are read', () => {
      then('it is refused, never read as no sources', async () => {
        const error = await getError(async () =>
          getAllRoleViewSources({
            roleDir: scene.roleDir,
            kind: 'briefs',
            record: null,
          }),
        );
        expect(error.message).toContain(
          'a modded view of the role has no record of its published sources',
        );
        expect(error.message).toContain('rhx init --hooks');
        expect(
          asTempDirMasked({
            of: error.message,
            dir: scene.roleDir,
            into: '/TMP_ROLE_DIR',
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case2] a native kind dir of files, with no record', () => {
    const scene = useBeforeAll(async () => {
      const roleDir = genTempDir({ slug: 'view-sources-case2' });
      mkdirSync(join(roleDir, 'briefs'), { recursive: true });
      writeFileSync(join(roleDir, 'briefs', 'surf-wax.md'), '# surf wax\n');
      return { roleDir };
    });

    when('[t0] its sources are read', () => {
      then('it has none', () => {
        expect(
          getAllRoleViewSources({
            roleDir: scene.roleDir,
            kind: 'briefs',
            record: null,
          }),
        ).toEqual([]);
      });
    });
  });

  given('[case3] a kind dir of file links, with a record', () => {
    const scene = useBeforeAll(async () => {
      const roleDir = genTempDir({ slug: 'view-sources-case3' });
      mkdirSync(join(roleDir, 'store'), { recursive: true });
      writeFileSync(join(roleDir, 'store', 'surf-wax.md'), '# surf wax\n');
      mkdirSync(join(roleDir, 'briefs'), { recursive: true });
      symlinkSync(
        join(roleDir, 'store', 'surf-wax.md'),
        join(roleDir, 'briefs', 'surf-wax.md'),
      );
      const record = new RoleModdedViewRecord({
        sources: { briefs: [{ at: '', target: 'store' }], skills: [] },
        paths: ['briefs/surf-wax.md'],
        hookBasis: null,
        refusal: null,
      });
      return { roleDir, record };
    });

    when('[t0] its sources are read', () => {
      then('they are the record sources', () => {
        expect(
          getAllRoleViewSources({
            roleDir: scene.roleDir,
            kind: 'briefs',
            record: scene.record,
          }),
        ).toEqual([{ at: '', target: 'store' }]);
      });
    });
  });
});
