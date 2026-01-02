import { given, then, when } from 'test-fns';

import {
  genTestTempDir,
  invokeRhachetInit,
  setTestTempAsset,
} from '@src/.test/infra';

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('invokeRolesInit stdin passthrough (integration)', () => {
  given('an init script that reads stdin (Claude Code hook scenario)', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'invokeRolesInit-stdin',
    });

    beforeAll(() => {
      testDir.setup();

      // create .agent directory structure with init script that reads stdin
      const initsDir = resolve(
        testDir.path,
        '.agent/repo=test/role=mechanic/inits/claude.hooks',
      );
      mkdirSync(initsDir, { recursive: true });

      // create init script that captures stdin
      setTestTempAsset({
        dir: initsDir,
        name: 'pretooluse.read-stdin.sh',
        content: `#!/usr/bin/env bash
cat > stdin-received.txt
`,
      });
    });

    afterAll(() => testDir.teardown());

    beforeEach(() => testDir.rm('stdin-received.txt'));

    when('rhachet roles init --command is invoked with piped stdin', () => {
      then('the init script should receive the stdin data', () => {
        const stdinData = JSON.stringify({
          tool_name: 'Bash',
          tool_input: { command: 'echo hello' },
        });

        const result = invokeRhachetInit({
          command: 'claude.hooks/pretooluse.read-stdin',
          cwd: testDir.path,
          stdin: stdinData,
        });

        // verify command succeeded
        if (result.status !== 0) {
          throw new Error(
            `rhachet roles init failed with status ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
          );
        }

        // verify the init script ran and received stdin
        const outputPath = resolve(testDir.path, 'stdin-received.txt');
        expect(existsSync(outputPath)).toBe(true);

        const receivedData = readFileSync(outputPath, 'utf-8');
        expect(receivedData.trim()).toBe(stdinData);
      });
    });

    when('rhachet roles init --command is invoked without stdin', () => {
      then('the init script should still execute', () => {
        // create a simpler init that just touches a file
        const initsDir = resolve(
          testDir.path,
          '.agent/repo=test/role=mechanic/inits',
        );
        const markerFile = 'no-stdin-executed.txt';
        setTestTempAsset({
          dir: initsDir,
          name: 'touch-file.sh',
          content: `#!/usr/bin/env bash
touch ${markerFile}
`,
        });

        testDir.rm(markerFile);

        const result = invokeRhachetInit({
          command: 'touch-file',
          cwd: testDir.path,
        });

        // verify command succeeded
        if (result.status !== 0) {
          throw new Error(
            `rhachet roles init failed with status ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
          );
        }

        // marker file is created in cwd (testDir), not in initsDir
        expect(existsSync(resolve(testDir.path, markerFile))).toBe(true);
      });
    });
  });
});
