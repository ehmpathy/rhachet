import { given, then, when } from 'test-fns';

import {
  genTestTempDir,
  invokeRhachetRun,
  setTestTempAsset,
} from '@src/.test/infra';

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('invokeRun stdin passthrough (integration)', () => {
  given('a skill script that reads stdin', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'invokeRun-stdin',
    });

    beforeAll(() => {
      testDir.setup();

      // create .agent directory structure with skill script that reads stdin
      const skillsDir = resolve(
        testDir.path,
        '.agent/repo=test/role=mechanic/skills',
      );
      mkdirSync(skillsDir, { recursive: true });

      // create skill script that captures stdin
      setTestTempAsset({
        dir: skillsDir,
        name: 'read-stdin.sh',
        content: `#!/usr/bin/env bash
cat > stdin-received.txt
`,
      });
    });

    afterAll(() => testDir.teardown());

    beforeEach(() => testDir.rm('stdin-received.txt'));

    when('rhachet run --skill is invoked with piped stdin', () => {
      then('the skill script should receive the stdin data', () => {
        const stdinData = JSON.stringify({
          input: 'test data',
          value: 42,
        });

        const result = invokeRhachetRun({
          skill: 'read-stdin',
          cwd: testDir.path,
          stdin: stdinData,
        });

        // verify command succeeded
        if (result.status !== 0) {
          throw new Error(
            `rhachet run failed with status ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
          );
        }

        // verify the skill script ran and received stdin
        const outputPath = resolve(testDir.path, 'stdin-received.txt');
        expect(existsSync(outputPath)).toBe(true);

        const receivedData = readFileSync(outputPath, 'utf-8');
        expect(receivedData.trim()).toBe(stdinData);
      });
    });

    when('rhachet run --skill is invoked without stdin', () => {
      then('the skill script should still execute', () => {
        const skillsDir = resolve(
          testDir.path,
          '.agent/repo=test/role=mechanic/skills',
        );
        const markerFile = 'no-stdin-executed.txt';
        setTestTempAsset({
          dir: skillsDir,
          name: 'touch-file.sh',
          content: `#!/usr/bin/env bash
touch ${markerFile}
`,
        });

        testDir.rm(markerFile);

        const result = invokeRhachetRun({
          skill: 'touch-file',
          cwd: testDir.path,
        });

        // verify command succeeded
        if (result.status !== 0) {
          throw new Error(
            `rhachet run failed with status ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
          );
        }

        // marker file is created in cwd (testDir), not in skillsDir
        expect(existsSync(resolve(testDir.path, markerFile))).toBe(true);
      });
    });
  });
});
