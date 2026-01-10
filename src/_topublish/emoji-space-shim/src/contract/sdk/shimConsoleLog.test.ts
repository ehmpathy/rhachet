import { given, then, when } from 'test-fns';

import { shimConsoleLog } from './shimConsoleLog';

describe('shimConsoleLog', () => {
  given('shim applied with terminal=vscode', () => {
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

      // apply shim
      shim = shimConsoleLog({ terminal: 'vscode' });
    });

    afterEach(() => {
      // restore original first to undo our capture
      console.log = originalLog;
    });

    when('console.log is called with beaver emoji message', () => {
      then('original receives transformed message with extra space', () => {
        console.log('🦫 hi');
        expect(capturedArgs).toEqual(['🦫  hi']);
      });
    });

    when('console.log is called with multiple args', () => {
      then('string args are transformed, others pass through', () => {
        console.log('🦫 hi', { x: 1 });
        expect(capturedArgs).toEqual(['🦫  hi', { x: 1 }]);
      });
    });

    when('restore is called', () => {
      then('original behavior is restored', () => {
        shim.restore();

        // now set up a new capture after restore
        const postRestoreArgs: unknown[] = [];
        const tempLog = console.log;
        console.log = (...args: unknown[]) => {
          postRestoreArgs.push(...args);
        };

        console.log('🦫 hi');

        // restore again for cleanup
        console.log = tempLog;

        expect(postRestoreArgs).toEqual(['🦫 hi']);
      });
    });
  });

  given('shim applied with terminal=default', () => {
    let capturedArgs: unknown[] = [];
    let originalLog: typeof console.log;

    beforeEach(() => {
      capturedArgs = [];
      originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedArgs = args;
      };

      shimConsoleLog({ terminal: 'default' });
    });

    afterEach(() => {
      console.log = originalLog;
    });

    when('console.log is called with beaver emoji message', () => {
      then(
        'original receives unchanged message (default needs no adjustment for beaver)',
        () => {
          console.log('🦫 hi');
          expect(capturedArgs).toEqual(['🦫 hi']);
        },
      );
    });
  });

  given('shim applied with thunder cloud emoji', () => {
    let capturedArgs: unknown[] = [];
    let originalLog: typeof console.log;

    beforeEach(() => {
      capturedArgs = [];
      originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedArgs = args;
      };
    });

    afterEach(() => {
      console.log = originalLog;
    });

    when('terminal is vscode', () => {
      beforeEach(() => {
        shimConsoleLog({ terminal: 'vscode' });
      });

      then('adds space after thunder cloud emoji', () => {
        console.log('⛈️ woah!');
        expect(capturedArgs).toEqual(['⛈️  woah!']);
      });
    });

    when('terminal is default', () => {
      beforeEach(() => {
        shimConsoleLog({ terminal: 'default' });
      });

      then(
        'adds space after thunder cloud emoji (both terminals need it)',
        () => {
          console.log('⛈️ woah!');
          expect(capturedArgs).toEqual(['⛈️  woah!']);
        },
      );
    });
  });
});
