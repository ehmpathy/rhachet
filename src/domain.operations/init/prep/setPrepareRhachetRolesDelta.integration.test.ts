import { genTempDir, given, then, when } from 'test-fns';

import { withCapturedStreams } from '@src/.test/assets/withCapturedStreams';
import { ContextCli } from '@src/domain.objects/ContextCli';

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setPrepareRhachetRolesDelta } from './setPrepareRhachetRolesDelta';

/**
 * .what = proof for inventory.of=requirements.case=1 (critical): an incremental removal
 *         drops the role from the `prepare:rhachet` replay
 */
describe('setPrepareRhachetRolesDelta', () => {
  given('[case1] a prepare:rhachet entry that names xyz', () => {
    const dir = genTempDir({ slug: 'setPrepareRhachetRolesDelta-c1' });
    const pkgBefore = {
      name: 'test-pkg',
      scripts: {
        test: 'jest',
        'prepare:rhachet': 'rhachet init --hooks --roles mechanic xyz behaver',
        prepare: 'husky install && npm run prepare:rhachet',
      },
    };

    when('[t0] xyz is removed', () => {
      then(
        'the entry drops xyz; every other role, flag and entry stays',
        async () => {
          writeFileSync(join(dir, 'package.json'), JSON.stringify(pkgBefore));
          const result = await setPrepareRhachetRolesDelta(
            { additions: [], removals: ['xyz'] },
            new ContextCli({ cwd: dir, gitroot: dir }),
          );
          expect(result.effect).toEqual('UPDATED');
          const pkgAfter = JSON.parse(
            readFileSync(join(dir, 'package.json'), 'utf-8'),
          );
          expect(pkgAfter.scripts).toEqual({
            test: 'jest',
            'prepare:rhachet': 'rhachet init --hooks --roles mechanic behaver',
            prepare: 'husky install && npm run prepare:rhachet',
          });
        },
      );
    });

    when('[t0.1] xyz is removed, and the report is read', () => {
      then(
        'the report names the entry and its new command, line for line',
        async () => {
          writeFileSync(join(dir, 'package.json'), JSON.stringify(pkgBefore));
          const { out } = await withCapturedStreams({
            run: async () =>
              await setPrepareRhachetRolesDelta(
                { additions: [], removals: ['xyz'] },
                new ContextCli({ cwd: dir, gitroot: dir }),
              ),
          });
          expect(out.split('\n')).toEqual([
            '',
            '📦 persist prepare entries...',
            '   ↻ [updated] scripts["prepare:rhachet"]',
            '      └─ rhachet init --hooks --roles mechanic behaver',
            '',
            '',
          ]);
        },
      );
    });

    when('[t1] a removal of a role the entry lacks', () => {
      then('the file is left as it was', async () => {
        writeFileSync(join(dir, 'package.json'), JSON.stringify(pkgBefore));
        const result = await setPrepareRhachetRolesDelta(
          { additions: [], removals: ['absent'] },
          new ContextCli({ cwd: dir, gitroot: dir }),
        );
        expect(result.effect).toEqual('FOUND');
        expect(readFileSync(join(dir, 'package.json'), 'utf-8')).toEqual(
          JSON.stringify(pkgBefore),
        );
      });
    });
  });

  given('[case1b] a prepare:rhachet entry in the comma form', () => {
    const dir = genTempDir({ slug: 'setPrepareRhachetRolesDelta-c1b' });

    when('[t0] xyz is removed', () => {
      then('the entry drops xyz and stays in the comma form', async () => {
        writeFileSync(
          join(dir, 'package.json'),
          JSON.stringify({
            name: 'test-pkg',
            scripts: {
              'prepare:rhachet': 'rhachet init --hooks --roles mechanic,xyz',
            },
          }),
        );
        const result = await setPrepareRhachetRolesDelta(
          { additions: [], removals: ['xyz'] },
          new ContextCli({ cwd: dir, gitroot: dir }),
        );
        expect(result.effect).toEqual('UPDATED');
        const pkgAfter = JSON.parse(
          readFileSync(join(dir, 'package.json'), 'utf-8'),
        );
        expect(pkgAfter.scripts['prepare:rhachet']).toEqual(
          'rhachet init --hooks --roles mechanic',
        );
      });
    });
  });

  given('[case2] a package.json with no prepare:rhachet entry', () => {
    const dir = genTempDir({ slug: 'setPrepareRhachetRolesDelta-c2' });

    when('[t0] xyz is removed', () => {
      then('the effect is ABSENT and the file is left as it was', async () => {
        const content = JSON.stringify({ name: 'test-pkg', scripts: {} });
        writeFileSync(join(dir, 'package.json'), content);
        const result = await setPrepareRhachetRolesDelta(
          { additions: [], removals: ['xyz'] },
          new ContextCli({ cwd: dir, gitroot: dir }),
        );
        expect(result.effect).toEqual('ABSENT');
        expect(readFileSync(join(dir, 'package.json'), 'utf-8')).toEqual(
          content,
        );
      });
    });
  });

  given('[case3] a dir with no package.json', () => {
    const dir = genTempDir({ slug: 'setPrepareRhachetRolesDelta-c3' });

    when('[t0] xyz is removed', () => {
      then('the effect is ABSENT', async () => {
        const result = await setPrepareRhachetRolesDelta(
          { additions: [], removals: ['xyz'] },
          new ContextCli({ cwd: dir, gitroot: dir }),
        );
        expect(result.effect).toEqual('ABSENT');
      });
    });
  });
});
