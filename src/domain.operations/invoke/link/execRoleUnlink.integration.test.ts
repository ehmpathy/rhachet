import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { setMockLinkedRole } from '@src/.test/assets/setMockLinkedRole';
import { genTestTempDir } from '@src/.test/infra';
import { ContextCli } from '@src/domain.objects/ContextCli';

import { existsSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execRoleUnlink } from './execRoleUnlink';

describe('execRoleUnlink (integration)', () => {
  given('[case1] a linked role that is the only role under its repo', () => {
    const testDir = genTestTempDir({ base: __dirname, name: 'execRoleUnlink' });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(resolve(testDir.path, 'src.md'), '# source');
      setMockLinkedRole({
        agentDir: resolve(testDir.path, '.agent'),
        repo: 'ehmpathy',
        role: 'reviewer',
        sourceReadme: resolve(testDir.path, 'src.md'),
      });
    });
    afterAll(() => testDir.teardown());

    when('[t0] execRoleUnlink removes the role', () => {
      then('reports removed and cleans the empty repo dir (e12)', () => {
        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });
        const result = execRoleUnlink(
          { repo: 'ehmpathy', role: 'reviewer' },
          context,
        );
        expect(result.status).toEqual('removed');
        const agentDir = resolve(testDir.path, '.agent');
        expect(
          existsSync(resolve(agentDir, 'repo=ehmpathy', 'role=reviewer')),
        ).toEqual(false);
        // parent repo dir cleaned since no other role= remained
        expect(existsSync(resolve(agentDir, 'repo=ehmpathy'))).toEqual(false);
      });
    });
  });

  given('[case2] a repo with two linked roles', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'execRoleUnlink-two',
    });

    beforeAll(() => {
      testDir.setup();
      writeFileSync(resolve(testDir.path, 'src.md'), '# source');
      const agentDir = resolve(testDir.path, '.agent');
      setMockLinkedRole({
        agentDir,
        repo: 'ehmpathy',
        role: 'reviewer',
        sourceReadme: resolve(testDir.path, 'src.md'),
      });
      setMockLinkedRole({
        agentDir,
        repo: 'ehmpathy',
        role: 'mechanic',
        sourceReadme: resolve(testDir.path, 'src.md'),
      });
    });
    afterAll(() => testDir.teardown());

    when('[t0] one role is removed', () => {
      then('removes only that role and keeps the repo dir', () => {
        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });
        const result = execRoleUnlink(
          { repo: 'ehmpathy', role: 'reviewer' },
          context,
        );
        expect(result.status).toEqual('removed');
        const agentDir = resolve(testDir.path, '.agent');
        expect(
          existsSync(resolve(agentDir, 'repo=ehmpathy', 'role=reviewer')),
        ).toEqual(false);
        // repo dir stays because mechanic is still linked
        expect(existsSync(resolve(agentDir, 'repo=ehmpathy'))).toEqual(true);
        expect(
          existsSync(resolve(agentDir, 'repo=ehmpathy', 'role=mechanic')),
        ).toEqual(true);
      });
    });
  });

  given('[case3] a role that is not linked (e2 idempotent)', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'execRoleUnlink-absent',
    });

    beforeAll(() => testDir.setup());
    afterAll(() => testDir.teardown());

    when('[t0] execRoleUnlink targets an absent role', () => {
      then('reports absent without error', () => {
        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });
        const result = execRoleUnlink(
          { repo: 'ehmpathy', role: 'nonesuch' },
          context,
        );
        expect(result.status).toEqual('absent');
      });
    });
  });

  given('[case4] a role dir containing a broken symlink (e13)', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'execRoleUnlink-broken',
    });

    beforeAll(() => {
      testDir.setup();
      const repoRoleDir = resolve(
        testDir.path,
        '.agent',
        'repo=ehmpathy',
        'role=reviewer',
      );
      mkdirSync(repoRoleDir, { recursive: true });
      // point the symlink at a source that does not exist → broken link
      symlinkSync(
        resolve(testDir.path, 'does-not-exist.md'),
        resolve(repoRoleDir, 'readme.md'),
        'file',
      );
    });
    afterAll(() => testDir.teardown());

    when('[t0] execRoleUnlink removes the role', () => {
      then('removes the broken link without throw', () => {
        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });
        const result = execRoleUnlink(
          { repo: 'ehmpathy', role: 'reviewer' },
          context,
        );
        expect(result.status).toEqual('removed');
        expect(
          existsSync(
            resolve(testDir.path, '.agent', 'repo=ehmpathy', 'role=reviewer'),
          ),
        ).toEqual(false);
      });
    });
  });

  given('[case5] a native repo=.this role (e11)', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'execRoleUnlink-native',
    });

    beforeAll(() => testDir.setup());
    afterAll(() => testDir.teardown());

    when('[t0] execRoleUnlink targets a repo=.this role', () => {
      then('throws — native roles cannot be removed', async () => {
        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });
        const error = await getError(() =>
          execRoleUnlink({ repo: '.this', role: 'any' }, context),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('native roles');
      });
    });
  });
});
