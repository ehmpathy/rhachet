import { given, then, when } from 'test-fns';

import { genTestTempDir, setTestTempAsset } from '@src/.test/infra';
import { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleManifest } from '@src/domain.objects/RoleManifest';
import type { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';

import { existsSync, lstatSync } from 'node:fs';
import { resolve } from 'node:path';
import { execRoleLink } from './execRoleLink';

describe('execRoleLink (integration)', () => {
  given('a role with briefs, skills, and inits', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'execRoleLink',
    });

    beforeAll(() => {
      testDir.setup();

      // create source directories with files
      setTestTempAsset({
        dir: testDir.path,
        name: 'test-briefs/brief1.md',
        content: '# brief 1',
        executable: false,
      });
      setTestTempAsset({
        dir: testDir.path,
        name: 'test-briefs/brief2.md',
        content: '# brief 2',
        executable: false,
      });
      setTestTempAsset({
        dir: testDir.path,
        name: 'test-skills/skill1.sh',
        content: '#!/bin/bash\necho "skill 1"',
      });
      setTestTempAsset({
        dir: testDir.path,
        name: 'test-inits/init.claude.sh',
        content: '#!/bin/bash\necho "init"',
      });
      setTestTempAsset({
        dir: testDir.path,
        name: 'readme.md',
        content: '# test repo readme',
        executable: false,
      });
      setTestTempAsset({
        dir: testDir.path,
        name: 'role-readme.md',
        content: '# test role readme',
        executable: false,
      });
    });

    afterAll(() => testDir.teardown());

    when('[t0] execRoleLink is called', () => {
      then('stdout matches snapshot', () => {
        const role: RoleManifest = {
          slug: 'mechanic',
          readme: { uri: 'role-readme.md' },
          briefs: { dirs: [{ uri: 'test-briefs' }] },
          skills: { dirs: [{ uri: 'test-skills' }] },
          inits: { dirs: [{ uri: 'test-inits' }] },
        };

        const repo: RoleRegistryManifest = {
          slug: 'ehmpathy',
          readme: { uri: 'readme.md' },
          roles: [role],
        };

        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });

        // capture stdout
        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args: string[]) => logs.push(args.join(' '));

        try {
          execRoleLink({ role, repo }, context);
        } finally {
          console.log = originalLog;
        }

        const output = logs.join('\n');
        expect(output).toMatchSnapshot();
      });
    });
  });

  given('a role with boot and keyrack', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'execRoleLink-boot-keyrack',
    });

    beforeAll(() => {
      testDir.setup();

      // create source files
      setTestTempAsset({
        dir: testDir.path,
        name: 'test-briefs/brief1.md',
        content: '# brief 1',
        executable: false,
      });
      setTestTempAsset({
        dir: testDir.path,
        name: 'test-skills/skill1.sh',
        content: '#!/bin/bash\necho "skill 1"',
      });
      setTestTempAsset({
        dir: testDir.path,
        name: 'readme.md',
        content: '# test repo readme',
        executable: false,
      });
      setTestTempAsset({
        dir: testDir.path,
        name: 'role-readme.md',
        content: '# test role readme',
        executable: false,
      });
      setTestTempAsset({
        dir: testDir.path,
        name: 'boot.yml',
        content: 'model: claude-sonnet\n',
        executable: false,
      });
      setTestTempAsset({
        dir: testDir.path,
        name: 'keyrack.yml',
        content: 'org: testorg\nenv.test:\n  - TEST_KEY\n',
        executable: false,
      });
    });

    afterAll(() => testDir.teardown());

    when('[t0] execRoleLink is called with boot and keyrack', () => {
      then('symlinks boot.yml and keyrack.yml', () => {
        const role: RoleManifest = {
          slug: 'mechanic',
          readme: { uri: 'role-readme.md' },
          briefs: { dirs: [{ uri: 'test-briefs' }] },
          skills: { dirs: [{ uri: 'test-skills' }] },
          boot: { uri: 'boot.yml' },
          keyrack: { uri: 'keyrack.yml' },
        };

        const repo: RoleRegistryManifest = {
          slug: 'ehmpathy',
          readme: { uri: 'readme.md' },
          roles: [role],
        };

        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });

        // suppress stdout
        const originalLog = console.log;
        console.log = () => {};

        try {
          execRoleLink({ role, repo }, context);
        } finally {
          console.log = originalLog;
        }

        // verify boot.yml symlink exists
        const bootPath = resolve(
          testDir.path,
          '.agent/repo=ehmpathy/role=mechanic/boot.yml',
        );
        expect(existsSync(bootPath)).toBe(true);
        expect(lstatSync(bootPath).isSymbolicLink()).toBe(true);

        // verify keyrack.yml symlink exists
        const keyrackPath = resolve(
          testDir.path,
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        );
        expect(existsSync(keyrackPath)).toBe(true);
        expect(lstatSync(keyrackPath).isSymbolicLink()).toBe(true);
      });
    });
  });

  given('a role without boot and keyrack', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'execRoleLink-no-boot-keyrack',
    });

    beforeAll(() => {
      testDir.setup();

      // create source files (no boot or keyrack)
      setTestTempAsset({
        dir: testDir.path,
        name: 'test-briefs/brief1.md',
        content: '# brief 1',
        executable: false,
      });
      setTestTempAsset({
        dir: testDir.path,
        name: 'test-skills/skill1.sh',
        content: '#!/bin/bash\necho "skill 1"',
      });
      setTestTempAsset({
        dir: testDir.path,
        name: 'readme.md',
        content: '# test repo readme',
        executable: false,
      });
      setTestTempAsset({
        dir: testDir.path,
        name: 'role-readme.md',
        content: '# test role readme',
        executable: false,
      });
    });

    afterAll(() => testDir.teardown());

    when('[t0] execRoleLink is called without boot and keyrack', () => {
      then('does not create boot.yml or keyrack.yml symlinks', () => {
        const role: RoleManifest = {
          slug: 'mechanic',
          readme: { uri: 'role-readme.md' },
          briefs: { dirs: [{ uri: 'test-briefs' }] },
          skills: { dirs: [{ uri: 'test-skills' }] },
          // no boot or keyrack
        };

        const repo: RoleRegistryManifest = {
          slug: 'ehmpathy',
          readme: { uri: 'readme.md' },
          roles: [role],
        };

        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });

        // suppress stdout
        const originalLog = console.log;
        console.log = () => {};

        try {
          execRoleLink({ role, repo }, context);
        } finally {
          console.log = originalLog;
        }

        // verify boot.yml symlink does NOT exist
        const bootPath = resolve(
          testDir.path,
          '.agent/repo=ehmpathy/role=mechanic/boot.yml',
        );
        expect(existsSync(bootPath)).toBe(false);

        // verify keyrack.yml symlink does NOT exist
        const keyrackPath = resolve(
          testDir.path,
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        );
        expect(existsSync(keyrackPath)).toBe(false);
      });
    });
  });
});
