import { given, then, when } from 'test-fns';

import { genTestTempDir } from '@src/.test/infra/genTestTempDir';
import { ContextCli } from '@src/domain.objects/ContextCli';

import { mkdirSync } from 'node:fs';
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
      mkdirSync('.agent/repo=ehmpathy/role=mechanic', { recursive: true });
      mkdirSync('.agent/repo=ehmpathy/role=tuner', { recursive: true });
      mkdirSync('.agent/repo=.this/role=any', { recursive: true });
    });

    afterAll(() => testDir.teardown());

    when('discoverLinkedRoles is called', () => {
      then('returns roles from non-.this repos', () => {
        const context = new ContextCli({ cwd: testDir.path });
        const roles = discoverLinkedRoles({}, context);
        expect(roles).toHaveLength(2);
        expect(roles).toContainEqual({ repo: 'ehmpathy', role: 'mechanic' });
        expect(roles).toContainEqual({ repo: 'ehmpathy', role: 'tuner' });
      });

      then('excludes .this repo', () => {
        const context = new ContextCli({ cwd: testDir.path });
        const roles = discoverLinkedRoles({}, context);
        expect(roles.find((r) => r.repo === '.this')).toBeUndefined();
      });
    });
  });

  given('a repo without .agent/', () => {
    when('discoverLinkedRoles is called', () => {
      then('returns empty array', () => {
        const context = new ContextCli({ cwd: '/tmp/nonexistent-dir-12345' });
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
      mkdirSync('.agent/repo=.this/role=any', { recursive: true });
    });

    afterAll(() => testDir.teardown());

    when('discoverLinkedRoles is called', () => {
      then('returns empty array', () => {
        const context = new ContextCli({ cwd: testDir.path });
        const roles = discoverLinkedRoles({}, context);
        expect(roles).toEqual([]);
      });
    });
  });
});
