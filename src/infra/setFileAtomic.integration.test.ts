import { genTempDir, given, then, when } from 'test-fns';

import { setFileAtomic } from '@src/infra/setFileAtomic';

import { spawn } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = run one writer process that calls setFileAtomic N times with one content
 * .why = two such processes at once prove the rename leaves one whole content
 */
const runWriterProcess = (input: {
  path: string;
  char: string;
  length: number;
  times: number;
}): Promise<number> =>
  new Promise((settle, fail) => {
    // the child builds its content from char + length; a large literal overflows argv
    const program = [
      `const { setFileAtomic } = require(${JSON.stringify(join(__dirname, 'setFileAtomic'))});`,
      `const content = ${JSON.stringify(input.char)}.repeat(${input.length}) + '\\n';`,
      `for (let i = 0; i < ${input.times}; i++)`,
      `  setFileAtomic({ path: ${JSON.stringify(input.path)}, content });`,
    ].join('\n');
    const child = spawn(process.execPath, ['-r', 'tsx/cjs', '-e', program], {
      stdio: 'inherit',
    });
    child.on('error', fail);
    child.on('exit', (code) => settle(code ?? 1));
  });

describe('setFileAtomic', () => {
  given('[case1] no prior file', () => {
    when('[t0] a content is set', () => {
      then('the file holds the content, and its dir is created', () => {
        const dir = genTempDir({ slug: 'setFileAtomic-c1t0' });
        const path = join(dir, 'nested', 'boot.md');

        setFileAtomic({ path, content: 'hello\n' });

        expect(readFileSync(path, 'utf8')).toEqual('hello\n');
      });
    });
  });

  given('[case2] a prior file', () => {
    when('[t0] a new content is set', () => {
      then('the prior content is replaced whole, and no temp is left', () => {
        const dir = genTempDir({ slug: 'setFileAtomic-c2t0' });
        const path = join(dir, 'boot.md');
        writeFileSync(path, 'a long prior content that must not survive\n');

        setFileAtomic({ path, content: 'short\n' });

        expect(readFileSync(path, 'utf8')).toEqual('short\n');
        expect(readdirSync(dir)).toEqual(['boot.md']);
      });
    });
  });

  given('[case3] two writer processes at once', () => {
    when('[t0] each sets its own content many times', () => {
      then(
        'the file ends with one whole content, and no temp is left',
        async () => {
          const dir = genTempDir({ slug: 'setFileAtomic-c3t0' });
          const path = join(dir, 'boot.md');
          const contentA = `${'a'.repeat(200_000)}\n`;
          const contentB = `${'b'.repeat(100_000)}\n`;

          const codes = await Promise.all([
            runWriterProcess({ path, char: 'a', length: 200_000, times: 40 }),
            runWriterProcess({ path, char: 'b', length: 100_000, times: 40 }),
          ]);

          expect(codes).toEqual([0, 0]);
          expect([contentA, contentB]).toContain(readFileSync(path, 'utf8'));
          expect(readdirSync(dir)).toEqual(['boot.md']);
        },
      );
    });
  });
});
