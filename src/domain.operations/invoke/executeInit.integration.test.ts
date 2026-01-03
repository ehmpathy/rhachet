import { given, then, when } from 'test-fns';

import { genTestTempDir, setTestTempAsset } from '@src/.test/infra';
import { RoleInitExecutable } from '@src/domain.objects/RoleInitExecutable';

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { executeInit } from './executeInit';

describe('executeInit (integration)', () => {
  given('an init script that reads stdin', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'executeInit',
    });

    beforeAll(() => {
      testDir.setup();

      // create init script that captures stdin
      setTestTempAsset({
        dir: testDir.path,
        name: 'read-stdin.sh',
        content: `#!/usr/bin/env bash
cat > stdin-output.txt
`,
      });
    });

    afterAll(() => testDir.teardown());

    beforeEach(() => testDir.rm('stdin-output.txt'));

    when('stdin has data piped to script', () => {
      then('the init script should receive the stdin data', () => {
        const stdinData = '{"tool_name":"test","tool_input":{"foo":"bar"}}';

        // create a wrapper script that pipes data to the init
        setTestTempAsset({
          dir: testDir.path,
          name: 'wrapper.sh',
          content: `#!/usr/bin/env bash
echo '${stdinData}' | ./read-stdin.sh
`,
        });

        // execute wrapper to simulate stdin passthrough
        spawnSync('./wrapper.sh', [], {
          cwd: testDir.path,
          stdio: 'inherit',
          shell: '/bin/bash',
        });

        // verify stdin was received
        const output = readFileSync(
          resolve(testDir.path, 'stdin-output.txt'),
          'utf-8',
        );
        expect(output.trim()).toBe(stdinData);
      });
    });

    when('executeInit is called directly', () => {
      then('args are passed through to the script', () => {
        const outputFile = 'args-output.txt';
        const { path } = setTestTempAsset({
          dir: testDir.path,
          name: 'echo-args.sh',
          content: `#!/usr/bin/env bash
echo "$@" > ${outputFile}
`,
        });

        const init = new RoleInitExecutable({
          slug: 'echo-args',
          path,
          slugRepo: '.this',
          slugRole: 'test',
        });

        executeInit({ init, args: ['--foo', 'bar', '--baz', 'qux'] });

        const output = readFileSync(resolve(testDir.path, outputFile), 'utf-8');
        expect(output.trim()).toBe('--foo bar --baz qux');
      });
    });
  });
});
