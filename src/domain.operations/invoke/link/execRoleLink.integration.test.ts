import { given, then, when } from 'test-fns';

import { genTestTempDir, setTestTempAsset } from '@src/.test/infra';
import { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleManifest } from '@src/domain.objects/RoleManifest';
import type { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';

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
});
