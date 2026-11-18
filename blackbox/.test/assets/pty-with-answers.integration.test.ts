import { spawnSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = the pty-with-answers helper, run against stub clis in a real pseudo-tty
 * .why = four keyrack acceptance suites lean on it. a caller's `spawnSync({ timeout })` signals the
 *   helper alone, so the helper must take its `script` child and the cli down with it — else each
 *   timed-out case leaves a cli alive on the box (seen on ci run 43825797977)
 *
 * .note = DOGFOOD, the mutation that makes it bite (measured 2026-11-18):
 *   | mutation | result |
 *   |---|---|
 *   | the helper before this fix (no signal forward) | 🔴 red — the hung cli outlives the helper |
 *   | `detached: false`, so the group kill misses | 🔴 red — the helper ends, the hung cli outlives it |
 *   | fix as shipped | 🟢 green — 4 of 4 |
 */

/** the helper under test, by absolute path */
const PTY_WITH_ANSWERS = join(__dirname, 'pty-with-answers.js');

/** how long a killed cli gets to go, before it counts as an orphan */
const ORPHAN_BOUND_MS = 3000;

/**
 * .what = a stub cli that records its pid, prints a hidden-input prompt, and reads one line in raw
 *   mode — the shape `promptHiddenInput` takes
 * .why = `hang` never reads, so it stays at the prompt until killed
 */
const genStubCli = (input: { dir: string; mode: 'answer' | 'hang' }): { stubPath: string; pidPath: string } => {
  const stubPath = join(input.dir, `stub.${input.mode}.cjs`);
  const pidPath = join(input.dir, `stub.${input.mode}.pid`);
  writeFileSync(
    stubPath,
    [
      "const { writeFileSync } = require('fs');",
      `writeFileSync(${JSON.stringify(pidPath)}, String(process.pid));`,
      "process.stdout.write('enter secret for XAI_API_KEY: ');",
      input.mode === 'hang'
        ? // a hard cap, so a run where the helper fails to end this stub leaves no burner for long
          'setInterval(() => {}, 1000); setTimeout(() => process.exit(0), 20000);'
        : [
            'process.stdin.setRawMode(true);',
            'process.stdin.resume();',
            "process.stdin.setEncoding('utf8');",
            "let buffer = '';",
            "process.stdin.on('data', (chunk) => {",
            '  for (const char of chunk) {',
            "    if (char === '\\r' || char === '\\n') {",
            "      process.stdout.write('\\ngot:' + buffer + '\\n');",
            '      process.exit(0);',
            '    }',
            '    buffer += char;',
            '  }',
            '});',
          ].join('\n'),
    ].join('\n'),
  );
  return { stubPath, pidPath };
};

/**
 * .what = whether a pid names a live process
 */
const isPidAlive = (input: { pid: number }): boolean => {
  try {
    process.kill(input.pid, 0);
    return true;
  } catch (error) {
    // .note = jest runs tests in a vm, so a node core error fails `instanceof Error`; read its code
    if ((error as { code?: unknown } | null)?.code === 'ESRCH') return false;
    throw error;
  }
};

/**
 * .what = wait until a pid is gone, or the bound runs out
 */
const awaitPidGone = async (input: { pid: number; boundMs: number }): Promise<boolean> => {
  const deadline = Date.now() + input.boundMs;
  while (Date.now() < deadline) {
    if (!isPidAlive({ pid: input.pid })) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return !isPidAlive({ pid: input.pid });
};

describe('pty-with-answers', () => {
  given('[case1] a cli that asks for a hidden secret and reads it in raw mode', () => {
    when('[t0] the helper runs it with one answer', () => {
      const result = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'pty-with-answers-answer' });
        const { stubPath } = genStubCli({ dir, mode: 'answer' });
        return spawnSync(
          'node',
          [PTY_WITH_ANSWERS, `node ${stubPath}`, 'enter secret', 'sekret-value'],
          { encoding: 'utf8', timeout: 30000 },
        );
      });

      then('the cli reads the answer and the helper returns its exit code', () => {
        expect(result.stdout).toContain('got:sekret-value');
        expect(result.status).toEqual(0);
      });

      then('the answer lands in raw mode, so the terminal never echoes it in the clear', () => {
        // the stub prints the value once, after `got:`; a driver echo would print it a second time
        expect(result.stdout.split('sekret-value').length - 1).toEqual(1);
      });
    });
  });

  given('[case3] a cli that asks a line choice, then a hidden secret — the keyrack set shape', () => {
    when('[t0] the helper runs it with the precise prompt pattern', () => {
      const result = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'pty-with-answers-two-prompts' });
        const stubPath = join(dir, 'stub.two-prompts.cjs');
        writeFileSync(
          stubPath,
          [
            '// .what = one raw-mode read up to Enter, with the same stop the cli prompts take',
            'const readOneLine = (input) => new Promise((accept) => {',
            '  process.stdout.write(input.prompt);',
            '  process.stdin.setRawMode(true);',
            '  process.stdin.resume();',
            "  process.stdin.setEncoding('utf8');",
            "  let buffer = '';",
            '  const onData = (chunk) => {',
            '    for (const char of chunk) {',
            "      if (char === '\\r' || char === '\\n') {",
            '        process.stdin.setRawMode(false);',
            '        process.stdin.pause();',
            "        process.stdin.removeListener('data', onData);",
            "        process.stdout.write('\\n');",
            '        return accept(buffer);',
            '      }',
            '      buffer += char;',
            '      process.stdout.write(input.mask ? "*" : char);',
            '    }',
            '  };',
            "  process.stdin.on('data', onData);",
            '});',
            '(async () => {',
            "  process.stdout.write('which mechanism?\\n1. static secret (api key, password)\\n');",
            "  const choice = await readOneLine({ prompt: 'choice: ', mask: false });",
            "  const secret = await readOneLine({ prompt: 'enter secret for XAI_API_KEY: ', mask: true });",
            "  process.stdout.write('got:' + choice + ':' + secret.length + '\\n');",
            '  process.exit(0);',
            '})();',
          ].join('\n'),
        );
        return spawnSync(
          'node',
          [PTY_WITH_ANSWERS, `node ${stubPath}`, 'choice: |enter secret for', '1', 'sekret-value'],
          { encoding: 'utf8', timeout: 30000 },
        );
      });

      then('both answers land, and the secret is masked, never echoed in the clear', () => {
        expect(result.stdout).toContain('got:1:12');
        expect(result.stdout).not.toContain('sekret-value');
        expect(result.status).toEqual(0);
      });
    });
  });

  given('[case2] a cli that hangs at its prompt, and a caller timeout that kills the helper', () => {
    when('[t0] the caller times out', () => {
      const outcome = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'pty-with-answers-hang' });
        const { stubPath, pidPath } = genStubCli({ dir, mode: 'hang' });
        const startedAt = Date.now();
        const result = spawnSync('node', [PTY_WITH_ANSWERS, `node ${stubPath}`, 'never-matches-xyz'], {
          encoding: 'utf8',
          timeout: 3000,
        });
        const elapsedMs = Date.now() - startedAt;
        const pid = existsSync(pidPath) ? Number(readFileSync(pidPath, 'utf8')) : null;
        const isGone = pid === null ? null : await awaitPidGone({ pid, boundMs: ORPHAN_BOUND_MS });
        if (pid !== null && !isGone) process.kill(pid, 'SIGKILL');
        return { result, pid, isGone, elapsedMs };
      });

      then('the cli started, so the test exercised a live child', () => {
        expect(outcome.pid).not.toBeNull();
      });

      then('the caller timeout ended the helper', () => {
        expect(outcome.elapsedMs).toBeGreaterThanOrEqual(3000);
        expect({ status: outcome.result.status, signal: outcome.result.signal }).toEqual({
          status: null,
          signal: 'SIGTERM',
        });
      });

      then('no cli outlives the helper', () => {
        expect(outcome.isGone).toEqual(true);
      });
    });
  });
});
