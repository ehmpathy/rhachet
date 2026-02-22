import { given, then, when } from 'test-fns';

import { genTestTempDir, setTestTempAsset } from '@src/.test/infra';
import { RoleSkillExecutable } from '@src/domain.objects/RoleSkillExecutable';

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { executeSkill, SkillExecutionError } from './executeSkill';

describe('executeSkill (integration)', () => {
  given('a skill script that reads stdin', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'executeSkill',
    });

    beforeAll(() => {
      testDir.setup();

      // create skill script that captures stdin
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
      then('the skill script should receive the stdin data', () => {
        const stdinData = '{"tool_name":"test","tool_input":{"foo":"bar"}}';

        // create a wrapper script that pipes data to the skill
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

    when('executeSkill is called directly in stream mode', () => {
      then('args are passed through to the script', () => {
        const outputFile = 'args-output.txt';
        const { path } = setTestTempAsset({
          dir: testDir.path,
          name: 'echo-args.sh',
          content: `#!/usr/bin/env bash
echo "$@" > ${outputFile}
`,
        });

        const skill = new RoleSkillExecutable({
          slug: 'echo-args',
          path,
          slugRepo: '.this',
          slugRole: 'test',
        });

        executeSkill({ skill, args: ['--foo', 'bar', '--baz', 'qux'] });

        const output = readFileSync(resolve(testDir.path, outputFile), 'utf-8');
        expect(output.trim()).toBe('--foo bar --baz qux');
      });
    });

    when('executeSkill is called in capture mode (stream=false)', () => {
      then('JSON output is parsed and returned', () => {
        const jsonData = { result: 'success', value: 42 };
        const { path } = setTestTempAsset({
          dir: testDir.path,
          name: 'json-output.sh',
          content: `#!/usr/bin/env bash
echo '${JSON.stringify(jsonData)}'
`,
        });

        const skill = new RoleSkillExecutable({
          slug: 'json-output',
          path,
          slugRepo: '.this',
          slugRole: 'test',
        });

        const result = executeSkill({ skill, args: [], stream: false });

        expect(result).toEqual(jsonData);
      });
    });

    when('skill exits with non-zero status in stream mode', () => {
      then('throws SkillExecutionError', () => {
        const { path } = setTestTempAsset({
          dir: testDir.path,
          name: 'fail-stream.sh',
          content: `#!/usr/bin/env bash
echo "error: task failed" >&2
exit 7
`,
        });

        const skill = new RoleSkillExecutable({
          slug: 'fail-stream',
          path,
          slugRepo: '.this',
          slugRole: 'test',
        });

        expect(() => executeSkill({ skill, args: [], stream: true })).toThrow(
          SkillExecutionError,
        );
      });

      then('SkillExecutionError includes original exit code (7)', () => {
        const { path } = setTestTempAsset({
          dir: testDir.path,
          name: 'fail-stream-code7.sh',
          content: `#!/usr/bin/env bash
exit 7
`,
        });

        const skill = new RoleSkillExecutable({
          slug: 'fail-stream-code7',
          path,
          slugRepo: '.this',
          slugRole: 'test',
        });

        try {
          executeSkill({ skill, args: [], stream: true });
          fail('expected SkillExecutionError');
        } catch (error) {
          expect(error).toBeInstanceOf(SkillExecutionError);
          expect((error as SkillExecutionError).exitCode).toEqual(7);
        }
      });
    });

    when('skill exits with exit code 2 in stream mode', () => {
      then('SkillExecutionError includes exit code 2 (not 1)', () => {
        const { path } = setTestTempAsset({
          dir: testDir.path,
          name: 'fail-stream-code2.sh',
          content: `#!/usr/bin/env bash
exit 2
`,
        });

        const skill = new RoleSkillExecutable({
          slug: 'fail-stream-code2',
          path,
          slugRepo: '.this',
          slugRole: 'test',
        });

        try {
          executeSkill({ skill, args: [], stream: true });
          fail('expected SkillExecutionError');
        } catch (error) {
          expect(error).toBeInstanceOf(SkillExecutionError);
          expect((error as SkillExecutionError).exitCode).toEqual(2);
        }
      });

      then('SkillExecutionError.stderr contains skill output', () => {
        const { path } = setTestTempAsset({
          dir: testDir.path,
          name: 'fail-stream-code2-stderr.sh',
          content: `#!/usr/bin/env bash
echo "quota error: no commit uses granted" >&2
exit 2
`,
        });

        const skill = new RoleSkillExecutable({
          slug: 'fail-stream-code2-stderr',
          path,
          slugRepo: '.this',
          slugRole: 'test',
        });

        try {
          executeSkill({ skill, args: [], stream: true });
          fail('expected SkillExecutionError');
        } catch (error) {
          expect(error).toBeInstanceOf(SkillExecutionError);
          expect((error as SkillExecutionError).exitCode).toEqual(2);
          expect((error as SkillExecutionError).stderr).toEqual(
            'quota error: no commit uses granted',
          );
        }
      });
    });

    when('skill exits with exit code 1 with stderr in stream mode', () => {
      then('SkillExecutionError.stderr contains skill output', () => {
        const { path } = setTestTempAsset({
          dir: testDir.path,
          name: 'fail-stream-code1-stderr.sh',
          content: `#!/usr/bin/env bash
echo "jq: command not found" >&2
exit 1
`,
        });

        const skill = new RoleSkillExecutable({
          slug: 'fail-stream-code1-stderr',
          path,
          slugRepo: '.this',
          slugRole: 'test',
        });

        try {
          executeSkill({ skill, args: [], stream: true });
          fail('expected SkillExecutionError');
        } catch (error) {
          expect(error).toBeInstanceOf(SkillExecutionError);
          expect((error as SkillExecutionError).exitCode).toEqual(1);
          expect((error as SkillExecutionError).stderr).toEqual(
            'jq: command not found',
          );
        }
      });
    });

    when('skill exits with non-zero status in capture mode', () => {
      then('throws SkillExecutionError', () => {
        const { path } = setTestTempAsset({
          dir: testDir.path,
          name: 'fail-capture.sh',
          content: `#!/usr/bin/env bash
echo "error: capture mode failed" >&2
exit 3
`,
        });

        const skill = new RoleSkillExecutable({
          slug: 'fail-capture',
          path,
          slugRepo: '.this',
          slugRole: 'test',
        });

        expect(() => executeSkill({ skill, args: [], stream: false })).toThrow(
          SkillExecutionError,
        );
      });

      then('SkillExecutionError includes original exit code (3)', () => {
        const { path } = setTestTempAsset({
          dir: testDir.path,
          name: 'fail-capture-code3.sh',
          content: `#!/usr/bin/env bash
exit 3
`,
        });

        const skill = new RoleSkillExecutable({
          slug: 'fail-capture-code3',
          path,
          slugRepo: '.this',
          slugRole: 'test',
        });

        try {
          executeSkill({ skill, args: [], stream: false });
          fail('expected SkillExecutionError');
        } catch (error) {
          expect(error).toBeInstanceOf(SkillExecutionError);
          expect((error as SkillExecutionError).exitCode).toEqual(3);
        }
      });
    });
  });
});
