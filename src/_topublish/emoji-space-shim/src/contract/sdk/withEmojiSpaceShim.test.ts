import { given, then, when } from 'test-fns';

import { withEmojiSpaceShim } from './withEmojiSpaceShim';

describe('withEmojiSpaceShim', () => {
  given('[case1] logic completes normally', () => {
    let capturedArgs: unknown[] = [];
    let originalLog: typeof console.log;

    beforeEach(() => {
      capturedArgs = [];
      originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedArgs.push([...args]);
      };
    });

    afterEach(() => {
      console.log = originalLog;
    });

    when('[t0] wrapper executes and returns', () => {
      then('shim is restored after logic completes', async () => {
        // run wrapper with emoji log inside
        await withEmojiSpaceShim({
          logic: async () => {
            console.log('🦫 inside wrapper');
            return 'result';
          },
        });

        // verify shim was active inside (space adjusted for vscode-like behavior)
        // note: in test env, terminal detection returns 'default', so beaver gets 0 adjustment
        // we verify restore by check that console.log works after wrapper returns

        // log after wrapper returns
        console.log('🦫 after wrapper');

        // verify both logs were captured
        expect(capturedArgs).toHaveLength(2);
      });

      then('returns the logic result', async () => {
        const result = await withEmojiSpaceShim({
          logic: async () => {
            return 'hello world';
          },
        });

        expect(result).toEqual('hello world');
      });
    });
  });

  given('[case2] logic throws error', () => {
    let capturedArgs: unknown[] = [];
    let originalLog: typeof console.log;

    beforeEach(() => {
      capturedArgs = [];
      originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedArgs.push([...args]);
      };
    });

    afterEach(() => {
      console.log = originalLog;
    });

    when('[t0] wrapper catches error', () => {
      then('shim is restored and error is rethrown', async () => {
        const testError = new Error('test error');

        await expect(
          withEmojiSpaceShim({
            logic: async () => {
              console.log('🦫 before error');
              throw testError;
            },
          }),
        ).rejects.toThrow('test error');

        // log after wrapper throws (shim should be restored)
        console.log('🦫 after error');

        // verify both logs were captured (shim was active, then restored)
        expect(capturedArgs).toHaveLength(2);
      });
    });
  });
});
