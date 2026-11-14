import { given, then, useThen, when } from 'test-fns';

import { genTestTempDir } from '@src/.test/infra/genTestTempDir';
import { ContextCli } from '@src/domain.objects/ContextCli';

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { discoverLinkedRoles } from './discoverLinkedRoles';

describe('discoverLinkedRoles', () => {
  given('a repo with linked roles in .agent/', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'discoverLinkedRoles-with-roles',
    });

    beforeAll(() => {
      testDir.setup();
      // create .agent/repo=ehmpathy/role=mechanic/
      mkdirSync(join(testDir.path, '.agent/repo=ehmpathy/role=mechanic'), {
        recursive: true,
      });
      mkdirSync(join(testDir.path, '.agent/repo=ehmpathy/role=tuner'), {
        recursive: true,
      });
      mkdirSync(join(testDir.path, '.agent/repo=.this/role=any'), {
        recursive: true,
      });
    });

    afterAll(() => testDir.teardown());

    when('discoverLinkedRoles is called', () => {
      // wrapped in an object: the shared-result proxy hands back a plain object, never an array
      const result = useThen('it succeeds', () => ({
        roles: discoverLinkedRoles(
          {},
          new ContextCli({ cwd: testDir.path, gitroot: testDir.path }),
        ),
      }));

      then('returns roles from non-.this repos', () => {
        expect(result.roles).toHaveLength(2);
        expect(result.roles).toContainEqual({
          repo: 'ehmpathy',
          role: 'mechanic',
        });
        expect(result.roles).toContainEqual({
          repo: 'ehmpathy',
          role: 'tuner',
        });
      });

      then('excludes .this repo', () => {
        expect(result.roles.find((r) => r.repo === '.this')).toBeUndefined();
      });
    });
  });

  given('a repo without .agent/', () => {
    when('discoverLinkedRoles is called', () => {
      then('returns empty array', () => {
        const context = new ContextCli({
          cwd: '/tmp/nonexistent-dir-12345',
          gitroot: '/tmp/nonexistent-dir-12345',
        });
        const roles = discoverLinkedRoles({}, context);
        expect(roles).toEqual([]);
      });
    });
  });

  given('a repo with only .this role', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'discoverLinkedRoles-only-this',
    });

    beforeAll(() => {
      testDir.setup();
      mkdirSync(join(testDir.path, '.agent/repo=.this/role=any'), {
        recursive: true,
      });
    });

    afterAll(() => testDir.teardown());

    when('discoverLinkedRoles is called', () => {
      then('returns empty array', () => {
        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });
        const roles = discoverLinkedRoles({}, context);
        expect(roles).toEqual([]);
      });
    });
  });
});
