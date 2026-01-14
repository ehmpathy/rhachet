import { given, then, when } from 'test-fns';

import { genTestTempDir, setTestTempAsset } from '@src/.test/infra';
import type { RoleManifest } from '@src/domain.objects/RoleManifest';
import type { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';

import { execRoleInits } from './execRoleInits';

describe('execRoleInits (integration)', () => {
  given('a role with init commands that produce output', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'execRoleInits',
    });

    let initScriptPath: string;

    beforeAll(() => {
      testDir.setup();

      // create init script that produces output with empty lines
      const { path } = setTestTempAsset({
        dir: testDir.path,
        name: 'test-init.sh',
        content: `#!/usr/bin/env bash
echo "🔧 init claude config for mechanic role..."
echo ""
echo "   ✓ claude config updated"
echo "   ✓ hooks installed"
`,
      });
      initScriptPath = path;
    });

    afterAll(() => testDir.teardown());

    when('[t0] execRoleInits is called', () => {
      then('output format matches snapshot', async () => {
        const role: RoleManifest = {
          slug: 'mechanic',
          readme: { uri: 'readme.md' },
          briefs: { dirs: { uri: 'briefs' } },
          skills: { dirs: { uri: 'skills' } },
          inits: { exec: [{ cmd: initScriptPath }] },
        };

        const repo: RoleRegistryManifest = {
          slug: 'ehmpathy',
          readme: { uri: 'readme.md' },
          roles: [role],
        };

        // capture stdout
        const logs: string[] = [];
        const originalLog = console.log;
        const originalStdoutWrite = process.stdout.write.bind(process.stdout);
        console.log = (...args) => logs.push(args.join(' '));
        process.stdout.write = ((chunk: string) => {
          // strip trailing newline since logs.join('\n') adds them back
          logs.push(chunk.replace(/\n$/, ''));
          return true;
        }) as typeof process.stdout.write;

        try {
          await execRoleInits({ role, repo });
        } finally {
          console.log = originalLog;
          process.stdout.write = originalStdoutWrite;
        }

        const output = logs.join('\n');
        expect(output).toMatchSnapshot();
      });
    });

    when('[t1] execRoleInits is called with multiple init commands', () => {
      then('all outputs are prefixed and format matches snapshot', async () => {
        // create a second init script
        const { path: secondInitPath } = setTestTempAsset({
          dir: testDir.path,
          name: 'second-init.sh',
          content: `#!/usr/bin/env bash
echo "setting up additional config..."
`,
        });

        const role: RoleManifest = {
          slug: 'mechanic',
          readme: { uri: 'readme.md' },
          briefs: { dirs: { uri: 'briefs' } },
          skills: { dirs: { uri: 'skills' } },
          inits: {
            exec: [{ cmd: initScriptPath }, { cmd: secondInitPath }],
          },
        };

        const repo: RoleRegistryManifest = {
          slug: 'ehmpathy',
          readme: { uri: 'readme.md' },
          roles: [role],
        };

        // capture stdout
        const logs: string[] = [];
        const originalLog = console.log;
        const originalStdoutWrite = process.stdout.write.bind(process.stdout);
        console.log = (...args) => logs.push(args.join(' '));
        process.stdout.write = ((chunk: string) => {
          // strip trailing newline since logs.join('\n') adds them back
          logs.push(chunk.replace(/\n$/, ''));
          return true;
        }) as typeof process.stdout.write;

        try {
          await execRoleInits({ role, repo });
        } finally {
          console.log = originalLog;
          process.stdout.write = originalStdoutWrite;
        }

        const output = logs.join('\n');
        expect(output).toMatchSnapshot();
      });
    });
  });

  given('a role with no init commands', () => {
    when('[t2] execRoleInits is called', () => {
      then('returns zero counts and produces no output', async () => {
        const role: RoleManifest = {
          slug: 'empty-role',
          readme: { uri: 'readme.md' },
          briefs: { dirs: { uri: 'briefs' } },
          skills: { dirs: { uri: 'skills' } },
        };

        const repo: RoleRegistryManifest = {
          slug: 'test',
          readme: { uri: 'readme.md' },
          roles: [role],
        };

        // capture stdout
        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args) => logs.push(args.join(' '));

        try {
          const result = await execRoleInits({ role, repo });
          expect(result).toEqual({ commandsExecuted: 0, commandsTotal: 0 });
          expect(logs).toEqual([]);
        } finally {
          console.log = originalLog;
        }
      });
    });
  });
});
