import { given, then, when } from 'test-fns';

// blackbox: import only from package index
import { shimConsoleLog } from '../src';

describe('shimConsoleLog', () => {
  given('[case1] shim enabled in vscode terminal', () => {
    let capturedArgs: unknown[] = [];
    let originalLog: typeof console.log;
    let shim: { restore: () => void };

    beforeEach(() => {
      // capture what gets passed to original console.log
      capturedArgs = [];
      originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedArgs = args;
      };

      // apply shim with vscode terminal
      shim = shimConsoleLog({ terminal: 'vscode' });
    });

    afterEach(() => {
      // restore original
      console.log = originalLog;
    });

    when('[t0] console.log with beaver emoji', () => {
      then('output has extra space after emoji', () => {
        console.log('🦫 hello world');
        expect(capturedArgs).toEqual(['🦫  hello world']);
      });
    });

    when('[t1] console.log with multiple emojis', () => {
      then('each emoji gets space adjustment', () => {
        console.log('🦫 and 🪨');
        expect(capturedArgs).toEqual(['🦫  and 🪨 ']);
      });
    });
  });

  given('[case2] shim enabled in default terminal', () => {
    let capturedArgs: unknown[] = [];
    let originalLog: typeof console.log;

    beforeEach(() => {
      capturedArgs = [];
      originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedArgs = args;
      };

      // apply shim with default terminal
      shimConsoleLog({ terminal: 'default' });
    });

    afterEach(() => {
      console.log = originalLog;
    });

    when('[t0] console.log with beaver emoji', () => {
      then(
        'output is unchanged (default needs no adjustment for beaver)',
        () => {
          console.log('🦫 hello world');
          expect(capturedArgs).toEqual(['🦫 hello world']);
        },
      );
    });
  });

  given('[case3] shim restored', () => {
    let capturedArgs: unknown[] = [];
    let originalLog: typeof console.log;
    let shim: { restore: () => void };

    beforeEach(() => {
      capturedArgs = [];
      originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedArgs = args;
      };

      // apply shim
      shim = shimConsoleLog({ terminal: 'vscode' });
    });

    afterEach(() => {
      console.log = originalLog;
    });

    when('[t0] console.log after restore', () => {
      then('original behavior restored', () => {
        // first verify shim works
        console.log('🦫 before');
        expect(capturedArgs).toEqual(['🦫  before']);

        // restore shim
        shim.restore();

        // set up new capture after restore
        const postRestoreArgs: unknown[] = [];
        const tempLog = console.log;
        console.log = (...args: unknown[]) => {
          postRestoreArgs.push(...args);
        };

        console.log('🦫 after');

        // restore for cleanup
        console.log = tempLog;

        // verify no transformation occurred
        expect(postRestoreArgs).toEqual(['🦫 after']);
      });
    });
  });
});
