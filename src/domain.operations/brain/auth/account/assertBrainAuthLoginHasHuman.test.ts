import { getError, given, then, when } from 'test-fns';

import { assertBrainAuthLoginHasHuman } from './assertBrainAuthLoginHasHuman';

describe('assertBrainAuthLoginHasHuman', () => {
  given('[case1] a human at a terminal', () => {
    when('[t0] the guard runs', () => {
      then('it passes', () => {
        expect(() =>
          assertBrainAuthLoginHasHuman({
            isStdinTTY: true,
            isStderrTTY: true,
            env: {},
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] a clone, even one with a pty', () => {
    when('[t0] the guard runs', () => {
      then('it refuses, and names the command for the human', async () => {
        const error = await getError(() =>
          assertBrainAuthLoginHasHuman({
            isStdinTTY: true,
            isStderrTTY: true,
            env: { RHACHET_CLONE_SERIAL: 'serial-a' },
          }),
        );
        expect(error.message).toContain(
          'a first login needs a human at a browser',
        );
        expect(error.message).toContain('rhx brains auth set --brain claude');
      });
    });
  });

  given('[case3] a pipe, no tty', () => {
    when('[t0] the guard runs', () => {
      then('it refuses', async () => {
        const error = await getError(() =>
          assertBrainAuthLoginHasHuman({
            isStdinTTY: false,
            isStderrTTY: true,
            env: {},
          }),
        );
        expect(error.message).toContain('stdin is not a terminal');
      });
    });
  });

  given('[case4] a terminal at stdin, but stderr is piped away', () => {
    when('[t0] the guard runs', () => {
      then('it refuses, since the login screen renders on stderr', async () => {
        const error = await getError(() =>
          assertBrainAuthLoginHasHuman({
            isStdinTTY: true,
            isStderrTTY: false,
            env: {},
          }),
        );
        expect(error.message).toContain('stderr is not a terminal');
      });
    });
  });

  given('[case5] a terminal at stdin and stderr, with stdout piped', () => {
    when('[t0] the guard runs', () => {
      then('it passes: stdout carries only the result', () => {
        expect(() =>
          assertBrainAuthLoginHasHuman({
            isStdinTTY: true,
            isStderrTTY: true,
            env: {},
          }),
        ).not.toThrow();
      });
    });
  });
});
