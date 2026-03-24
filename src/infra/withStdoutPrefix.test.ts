import { given, then, when } from 'test-fns';

import { withStdoutPrefix } from './withStdoutPrefix';

describe('withStdoutPrefix', () => {
  given('[case1] fn writes to stdout', () => {
    when('[t0] single line output', () => {
      then('prefixes the line', async () => {
        const captured: string[] = [];
        const originalWrite = process.stdout.write.bind(process.stdout);
        process.stdout.write = ((chunk: string) => {
          captured.push(chunk);
          return true;
        }) as typeof process.stdout.write;

        try {
          await withStdoutPrefix('>>> ', async () => {
            process.stdout.write('hello world\n');
          });
        } finally {
          process.stdout.write = originalWrite;
        }

        expect(captured.join('')).toEqual('>>> hello world\n');
      });
    });

    when('[t1] multiple line output', () => {
      then('prefixes each line', async () => {
        const captured: string[] = [];
        const originalWrite = process.stdout.write.bind(process.stdout);
        process.stdout.write = ((chunk: string) => {
          captured.push(chunk);
          return true;
        }) as typeof process.stdout.write;

        try {
          await withStdoutPrefix('|  ', async () => {
            process.stdout.write('line 1\nline 2\nline 3\n');
          });
        } finally {
          process.stdout.write = originalWrite;
        }

        expect(captured.join('')).toEqual('|  line 1\n|  line 2\n|  line 3\n');
      });
    });

    when('[t2] output without final newline', () => {
      then('handles partial line', async () => {
        const captured: string[] = [];
        const originalWrite = process.stdout.write.bind(process.stdout);
        process.stdout.write = ((chunk: string) => {
          captured.push(chunk);
          return true;
        }) as typeof process.stdout.write;

        try {
          await withStdoutPrefix('>> ', async () => {
            process.stdout.write('prompt: ');
          });
        } finally {
          process.stdout.write = originalWrite;
        }

        // partial line is prefixed and flushed with newline
        expect(captured.join('')).toEqual('>> prompt: \n');
      });
    });

    when('[t3] returns fn result', () => {
      then('passes through return value', async () => {
        const result = await withStdoutPrefix('', async () => {
          return { status: 'ok', count: 42 };
        });

        expect(result).toEqual({ status: 'ok', count: 42 });
      });
    });
  });
});
