import { given, then, useThen, when } from 'test-fns';

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * .what = integration tests for promptHiddenInput stdin behavior
 * .why = tests the fix for multiline stdin truncation
 *
 * .note = uses spawn to test actual stdin piping since process.stdin is global
 */

const TEST_HARNESS = resolve(__dirname, '.test/promptHiddenInput.harness.ts');

/**
 * .what = invokes promptHiddenInput with piped stdin
 * .why = tests stdin behavior in isolation
 */
const invokeWithStdin = (
  stdin: string,
): { stdout: string; stderr: string; status: number | null } => {
  const result = spawnSync('npx', ['tsx', TEST_HARNESS], {
    input: stdin,
    encoding: 'utf-8',
  });
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
  };
};

describe('promptHiddenInput', () => {
  given('[case1] piped stdin', () => {
    when('[t0] single-line content', () => {
      const result = useThen('it completes', () =>
        invokeWithStdin('hello world'),
      );

      then('returns the content', () => {
        expect(result.stdout.trim()).toEqual('hello world');
      });

      then('exits successfully', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t1] multi-line content', () => {
      const multilineJson = JSON.stringify(
        {
          appId: '123',
          privateKey:
            '-----BEGIN RSA PRIVATE KEY-----\nMIIE...line2\nline3\n-----END RSA PRIVATE KEY-----',
          installationId: '456',
        },
        null,
        2,
      );

      const result = useThen('it completes', () =>
        invokeWithStdin(multilineJson),
      );

      then('returns the full content', () => {
        expect(result.stdout.trim()).toEqual(multilineJson);
      });

      then('content is parseable json', () => {
        const parsed = JSON.parse(result.stdout.trim());
        expect(parsed.appId).toEqual('123');
        expect(parsed.privateKey).toContain('BEGIN RSA');
        expect(parsed.installationId).toEqual('456');
      });

      then('exits successfully', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t2] empty stdin', () => {
      const result = useThen('it completes', () => invokeWithStdin(''));

      then('returns empty string', () => {
        expect(result.stdout.trim()).toEqual('');
      });

      then('exits successfully', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t3] content with final newline', () => {
      const result = useThen('it completes', () =>
        invokeWithStdin('content with newline\n'),
      );

      then('trims final newline', () => {
        expect(result.stdout.trim()).toEqual('content with newline');
      });
    });
  });
});
