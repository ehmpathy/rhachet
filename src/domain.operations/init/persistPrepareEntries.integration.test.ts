import { BadRequestError } from 'helpful-errors';
import { genTempDir, given, then, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { persistPrepareEntries } from './persistPrepareEntries';

describe('persistPrepareEntries', () => {
  given('[case1] no prepare entries', () => {
    when('[t0] --prep --hooks --roles mechanic behaver', () => {
      const tempDir = genTempDir({ slug: 'persistPrepareEntries-c1t0' });
      beforeEach(() => {
        writeFileSync(
          join(tempDir, 'package.json'),
          JSON.stringify({ name: 'test-pkg', scripts: { test: 'jest' } }),
        );
      });

      then('prepare:rhachet created with --hooks', () => {
        const context = new ContextCli({
          cwd: tempDir,
          gitroot: tempDir,
        });
        const result = persistPrepareEntries(
          { hooks: true, roles: ['mechanic', 'behaver'] },
          context,
        );

        expect(result.prepareRhachet.effect).toEqual('CREATED');

        const pkg = JSON.parse(
          readFileSync(join(tempDir, 'package.json'), 'utf-8'),
        );
        expect(pkg.scripts['prepare:rhachet']).toEqual(
          'rhachet init --hooks --roles mechanic behaver',
        );
      });

      then('prepare created with npm run prepare:rhachet', () => {
        const context = new ContextCli({
          cwd: tempDir,
          gitroot: tempDir,
        });
        const result = persistPrepareEntries(
          { hooks: true, roles: ['mechanic'] },
          context,
        );

        expect(result.prepare.effect).toEqual('CREATED');

        const pkg = JSON.parse(
          readFileSync(join(tempDir, 'package.json'), 'utf-8'),
        );
        expect(pkg.scripts.prepare).toEqual('npm run prepare:rhachet');
      });
    });

    when('[t1] --prep --roles (no --hooks)', () => {
      const tempDir = genTempDir({ slug: 'persistPrepareEntries-c1t1' });
      beforeEach(() => {
        writeFileSync(
          join(tempDir, 'package.json'),
          JSON.stringify({ name: 'test-pkg', scripts: {} }),
        );
      });

      then('prepare:rhachet created WITHOUT --hooks', () => {
        const context = new ContextCli({
          cwd: tempDir,
          gitroot: tempDir,
        });
        const result = persistPrepareEntries(
          { hooks: false, roles: ['mechanic'] },
          context,
        );

        expect(result.prepareRhachet.effect).toEqual('CREATED');

        const pkg = JSON.parse(
          readFileSync(join(tempDir, 'package.json'), 'utf-8'),
        );
        expect(pkg.scripts['prepare:rhachet']).toEqual(
          'rhachet init --roles mechanic',
        );
        expect(pkg.scripts['prepare:rhachet']).not.toContain('--hooks');
      });
    });
  });

  given('[case2] prepare:rhachet extant', () => {
    when('[t0] update roles', () => {
      const tempDir = genTempDir({ slug: 'persistPrepareEntries-c2t0' });
      beforeEach(() => {
        writeFileSync(
          join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'test-pkg',
            scripts: {
              'prepare:rhachet': 'rhachet init --roles mechanic',
              prepare: 'npm run prepare:rhachet',
            },
          }),
        );
      });

      then('prepare:rhachet updated with new roles', () => {
        const context = new ContextCli({
          cwd: tempDir,
          gitroot: tempDir,
        });
        const result = persistPrepareEntries(
          { hooks: true, roles: ['mechanic', 'behaver', 'designer'] },
          context,
        );

        expect(result.prepareRhachet.effect).toEqual('UPDATED');

        const pkg = JSON.parse(
          readFileSync(join(tempDir, 'package.json'), 'utf-8'),
        );
        expect(pkg.scripts['prepare:rhachet']).toEqual(
          'rhachet init --hooks --roles mechanic behaver designer',
        );
      });

      then('prepare unchanged (idempotent)', () => {
        const context = new ContextCli({
          cwd: tempDir,
          gitroot: tempDir,
        });
        const result = persistPrepareEntries(
          { hooks: false, roles: ['mechanic'] },
          context,
        );

        expect(result.prepare.effect).toEqual('FOUND');

        const pkg = JSON.parse(
          readFileSync(join(tempDir, 'package.json'), 'utf-8'),
        );
        expect(pkg.scripts.prepare).toEqual('npm run prepare:rhachet');
      });
    });
  });

  given('[case3] prepare entry extant (husky install)', () => {
    when('[t0] --prep --roles mechanic', () => {
      const tempDir = genTempDir({ slug: 'persistPrepareEntries-c3t0' });
      beforeEach(() => {
        writeFileSync(
          join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'test-pkg',
            scripts: {
              prepare: 'husky install',
            },
          }),
        );
      });

      then('prepare appended with && npm run prepare:rhachet', () => {
        const context = new ContextCli({
          cwd: tempDir,
          gitroot: tempDir,
        });
        const result = persistPrepareEntries(
          { hooks: true, roles: ['mechanic'] },
          context,
        );

        expect(result.prepare.effect).toEqual('APPENDED');

        const pkg = JSON.parse(
          readFileSync(join(tempDir, 'package.json'), 'utf-8'),
        );
        expect(pkg.scripts.prepare).toEqual(
          'husky install && npm run prepare:rhachet',
        );
      });
    });

    when('[t1] prepare already has rhachet', () => {
      const tempDir = genTempDir({ slug: 'persistPrepareEntries-c3t1' });
      beforeEach(() => {
        writeFileSync(
          join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'test-pkg',
            scripts: {
              prepare: 'husky install && npm run prepare:rhachet',
            },
          }),
        );
      });

      then('prepare unchanged (idempotent)', () => {
        const context = new ContextCli({
          cwd: tempDir,
          gitroot: tempDir,
        });
        const result = persistPrepareEntries(
          { hooks: true, roles: ['mechanic'] },
          context,
        );

        expect(result.prepare.effect).toEqual('FOUND');

        const pkg = JSON.parse(
          readFileSync(join(tempDir, 'package.json'), 'utf-8'),
        );
        expect(pkg.scripts.prepare).toEqual(
          'husky install && npm run prepare:rhachet',
        );
      });
    });
  });

  given('[case4] error boundaries', () => {
    when('[t0] no package.json', () => {
      const tempDir = genTempDir({ slug: 'persistPrepareEntries-c4t0' });

      then('error: no package.json found', () => {
        // verify file is actually gone
        const pkgPath = join(tempDir, 'package.json');
        expect(existsSync(pkgPath)).toBe(false);

        const context = new ContextCli({
          cwd: tempDir,
          gitroot: tempDir,
        });

        let caughtError: unknown = null;
        try {
          persistPrepareEntries({ hooks: true, roles: ['mechanic'] }, context);
        } catch (error) {
          caughtError = error;
        }

        expect(caughtError).toBeInstanceOf(BadRequestError);
        expect((caughtError as Error).message).toContain(
          'no package.json found',
        );
      });
    });

    when('[t1] invalid package.json', () => {
      const tempDir = genTempDir({ slug: 'persistPrepareEntries-c4t1' });
      beforeEach(() => {
        writeFileSync(join(tempDir, 'package.json'), '{ invalid json }');
      });

      then('error: invalid package.json', () => {
        const context = new ContextCli({
          cwd: tempDir,
          gitroot: tempDir,
        });

        let thrownError: Error | null = null;
        try {
          persistPrepareEntries({ hooks: true, roles: ['mechanic'] }, context);
        } catch (error) {
          if (error instanceof Error) thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(BadRequestError);
        expect(thrownError?.message).toContain('invalid package.json');
      });
    });
  });

  given('[case5] add hooks to prior hookless setup', () => {
    when('[t0] --prep --hooks (extant without hooks)', () => {
      const tempDir = genTempDir({ slug: 'persistPrepareEntries-c5t0' });
      beforeEach(() => {
        writeFileSync(
          join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'test-pkg',
            scripts: {
              'prepare:rhachet': 'rhachet init --roles mechanic',
              prepare: 'npm run prepare:rhachet',
            },
          }),
        );
      });

      then('prepare:rhachet updated to include --hooks', () => {
        const context = new ContextCli({
          cwd: tempDir,
          gitroot: tempDir,
        });
        persistPrepareEntries({ hooks: true, roles: ['mechanic'] }, context);

        const pkg = JSON.parse(
          readFileSync(join(tempDir, 'package.json'), 'utf-8'),
        );
        expect(pkg.scripts['prepare:rhachet']).toEqual(
          'rhachet init --hooks --roles mechanic',
        );
      });
    });
  });

  given('[case6] remove hooks from prior hooked setup', () => {
    when('[t0] --prep (extant with hooks)', () => {
      const tempDir = genTempDir({ slug: 'persistPrepareEntries-c6t0' });
      beforeEach(() => {
        writeFileSync(
          join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'test-pkg',
            scripts: {
              'prepare:rhachet': 'rhachet init --hooks --roles mechanic',
              prepare: 'npm run prepare:rhachet',
            },
          }),
        );
      });

      then('prepare:rhachet updated to exclude --hooks', () => {
        const context = new ContextCli({
          cwd: tempDir,
          gitroot: tempDir,
        });
        persistPrepareEntries({ hooks: false, roles: ['mechanic'] }, context);

        const pkg = JSON.parse(
          readFileSync(join(tempDir, 'package.json'), 'utf-8'),
        );
        expect(pkg.scripts['prepare:rhachet']).toEqual(
          'rhachet init --roles mechanic',
        );
        expect(pkg.scripts['prepare:rhachet']).not.toContain('--hooks');
      });
    });
  });

  given('[case7] rhachet-roles-* repo', () => {
    when('[t0] --prep --hooks --roles behaver mechanic', () => {
      const tempDir = genTempDir({ slug: 'persistPrepareEntries-c7t0' });
      beforeEach(() => {
        writeFileSync(
          join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'rhachet-roles-ehmpathy',
            scripts: { build: 'tsc' },
          }),
        );
      });

      then('prepare:rhachet includes npm run build && prefix', () => {
        const context = new ContextCli({
          cwd: tempDir,
          gitroot: tempDir,
        });
        const result = persistPrepareEntries(
          { hooks: true, roles: ['behaver', 'mechanic'] },
          context,
        );

        expect(result.prepareRhachet.effect).toEqual('CREATED');

        const pkg = JSON.parse(
          readFileSync(join(tempDir, 'package.json'), 'utf-8'),
        );
        expect(pkg.scripts['prepare:rhachet']).toEqual(
          'npm run build && rhachet init --hooks --roles behaver mechanic',
        );
      });
    });

    when('[t1] update roles in rhachet-roles-* repo', () => {
      const tempDir = genTempDir({ slug: 'persistPrepareEntries-c7t1' });
      beforeEach(() => {
        writeFileSync(
          join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'rhachet-roles-bhuild',
            scripts: {
              build: 'tsc',
              'prepare:rhachet':
                'npm run build && rhachet init --hooks --roles behaver',
              prepare: 'npm run prepare:rhachet',
            },
          }),
        );
      });

      then('prepare:rhachet updated with build prefix preserved', () => {
        const context = new ContextCli({
          cwd: tempDir,
          gitroot: tempDir,
        });
        const result = persistPrepareEntries(
          { hooks: true, roles: ['behaver', 'driver'] },
          context,
        );

        expect(result.prepareRhachet.effect).toEqual('UPDATED');

        const pkg = JSON.parse(
          readFileSync(join(tempDir, 'package.json'), 'utf-8'),
        );
        expect(pkg.scripts['prepare:rhachet']).toEqual(
          'npm run build && rhachet init --hooks --roles behaver driver',
        );
      });
    });
  });
});
