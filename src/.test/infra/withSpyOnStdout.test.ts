import { given, then, when } from 'test-fns';

import { withSpyOnStdout } from './withSpyOnStdout';

describe('withSpyOnStdout', () => {
  given('[case1] fn writes to console.log', () => {
    when('[t0] single log call', () => {
      then('captures the output', async () => {
        const { stdout } = await withSpyOnStdout(async () => {
          console.log('hello world');
        });
        expect(stdout).toContain('hello world');
      });
    });

    when('[t1] multiple log calls', () => {
      then('captures all output', async () => {
        const { stdout } = await withSpyOnStdout(async () => {
          console.log('line 1');
          console.log('line 2');
        });
        expect(stdout).toContain('line 1');
        expect(stdout).toContain('line 2');
      });
    });
  });

  given('[case2] fn writes to process.stdout.write', () => {
    when('[t0] stdout.write call', () => {
      then('captures the output', async () => {
        const { stdout } = await withSpyOnStdout(async () => {
          process.stdout.write('direct write');
        });
        expect(stdout).toContain('direct write');
      });
    });
  });

  given('[case3] fn returns a value', () => {
    when('[t0] async fn returns object', () => {
      then('passes through return value', async () => {
        const { result } = await withSpyOnStdout(async () => {
          return { status: 'ok', count: 42 };
        });
        expect(result).toEqual({ status: 'ok', count: 42 });
      });
    });
  });

  given('[case4] fn throws error', () => {
    when('[t0] async fn throws', () => {
      then('propagates the error', async () => {
        await expect(
          withSpyOnStdout(async () => {
            throw new Error('test error');
          }),
        ).rejects.toThrow('test error');
      });
    });
  });
});
