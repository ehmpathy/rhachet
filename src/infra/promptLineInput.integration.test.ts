import { given, then, useThen, when } from 'test-fns';

import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * .what = integration tests for type-ahead across tty prompts
 * .why = a raw-mode prompt reads a whole chunk; when two answers arrive in one chunk, the
 *        first prompt must keep the second answer for the next reader, never drop it
 *
 * .note = `script -qec` (util-linux) gives the harness a real tty, so the raw-mode path runs
 */

const TEST_HARNESS = resolve(__dirname, '.test/promptTypeAhead.harness.ts');

/**
 * .what = runs the type-ahead harness on a tty, with all stdin written at once
 * .why = one write lands both answers in one chunk, the case a raw-mode prompt must survive
 */
const invokeOnTtyWithStdin = (
  stdin: string,
): { stdout: string; status: number | null } => {
  const result = spawnSync(
    'script',
    ['-qec', `npx tsx ${TEST_HARNESS}`, '/dev/null'],
    { input: stdin, encoding: 'utf-8', timeout: 30_000 },
  );
  return { stdout: result.stdout, status: result.status };
};

/**
 * .what = runs the type-ahead harness on a tty, and pastes once the prompt shows
 * .why = a paste after the prompt meets raw mode, the path a human's paste takes
 * .note = `pastes` are written in order, 300ms apart, so each lands as its own chunk; a CRLF
 *   split across two of them is the split a slow pty or a paste tool can deliver
 */
const invokeOnTtyWithPasteAtPrompt = (input: {
  prompt: string;
  pastes: string[];
  order: 'line-hidden' | 'hidden-line';
}): Promise<{ stdout: string; status: number | null }> =>
  new Promise((accept) => {
    const child = spawn(
      'script',
      ['-qec', `npx tsx ${TEST_HARNESS}`, '/dev/null'],
      {
        stdio: ['pipe', 'pipe', 'inherit'],
        env: { ...process.env, PROMPT_ORDER: input.order },
      },
    );
    const chunks: string[] = [];
    const killer = setTimeout(() => child.kill('SIGKILL'), 30_000);

    // paste once, the moment the prompt shows; each later paste waits 300ms behind the last
    const pasted = { done: false };
    child.stdout.on('data', (data: Buffer) => {
      chunks.push(data.toString());
      if (pasted.done || !chunks.join('').includes(input.prompt)) return;
      pasted.done = true;
      input.pastes.forEach((paste, index) =>
        setTimeout(() => child.stdin.write(paste), index * 300),
      );
    });

    child.on('close', (status) => {
      clearTimeout(killer);
      accept({ stdout: chunks.join(''), status });
    });
  });

describe('promptLineInput', () => {
  given('[case1] a tty, and two answers typed ahead in one write', () => {
    when('[t0] a line prompt, then a hidden prompt, read them', () => {
      const result = useThen('it completes', () =>
        invokeOnTtyWithStdin('2\nxai-typed-ahead\n'),
      );

      then('the line prompt gets the first answer', () => {
        expect(result.stdout).toContain('result.line=[2]');
      });

      then('the hidden prompt gets the second answer, not lost', () => {
        expect(result.stdout).toContain('result.hidden=[xai-typed-ahead]');
      });

      then('exits successfully', () => {
        expect(result.status).toEqual(0);
      });
    });

    when(
      '[t1] at the first prompt, a paste of two CRLF lines, as a windows text does',
      () => {
        // .note = the paste waits for the prompt, so it meets raw mode and its CRLF arrives intact.
        //   typed before the prompt, the tty's own line discipline would map CR to LF first
        const result = useThen('it completes', async () =>
          invokeOnTtyWithPasteAtPrompt({
            prompt: 'choice: ',
            pastes: ['2\r\nxai-typed-ahead\r\n'],
            order: 'line-hidden',
          }),
        );

        then('the line prompt gets the first answer', () => {
          expect(result.stdout).toContain('result.line=[2]');
        });

        then(
          'the hidden prompt gets the second answer, not an empty LF',
          () => {
            expect(result.stdout).toContain('result.hidden=[xai-typed-ahead]');
          },
        );

        then('exits successfully', () => {
          expect(result.status).toEqual(0);
        });
      },
    );

    when(
      '[t2] at the first prompt, a CRLF split across two chunks: the CR ends one, the LF opens the next',
      () => {
        const result = useThen('it completes', async () =>
          invokeOnTtyWithPasteAtPrompt({
            prompt: 'choice: ',
            pastes: ['2\r', '\nxai-typed-ahead\r\n'],
            order: 'line-hidden',
          }),
        );

        then('the line prompt gets the first answer', () => {
          expect(result.stdout).toContain('result.line=[2]');
        });

        then(
          'the hidden prompt gets the second answer, not the stray LF as an empty one',
          () => {
            expect(result.stdout).toContain('result.hidden=[xai-typed-ahead]');
          },
        );

        then('exits successfully', () => {
          expect(result.status).toEqual(0);
        });
      },
    );
  });

  given('[case2] a tty, with the hidden prompt asked first', () => {
    when(
      '[t0] at the secret prompt, a CRLF split across two chunks: the CR ends the secret, the LF opens the next',
      () => {
        // the order `keyrack set` meets: a secret, then a later prompt on the same stream
        const result = useThen('it completes', async () =>
          invokeOnTtyWithPasteAtPrompt({
            prompt: 'secret: ',
            pastes: ['xai-typed-ahead\r', '\n2\r\n'],
            order: 'hidden-line',
          }),
        );

        then('the hidden prompt gets the secret', () => {
          expect(result.stdout).toContain('result.hidden=[xai-typed-ahead]');
        });

        then(
          'the line prompt gets the next answer, not the stray LF as an empty one',
          () => {
            expect(result.stdout).toContain('result.line=[2]');
          },
        );

        then('exits successfully', () => {
          expect(result.status).toEqual(0);
        });
      },
    );
  });
});
