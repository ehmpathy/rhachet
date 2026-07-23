import { given, then, when } from 'test-fns';

import { getCommandFromArgv } from './getCommandFromArgv';

describe('getCommandFromArgv', () => {
  given('[case1] a plain command argv', () => {
    when('[t0] the first token is the command', () => {
      then('returns that command', () => {
        expect(getCommandFromArgv({ args: ['act', '-r', 'mechanic'] })).toEqual(
          'act',
        );
        expect(
          getCommandFromArgv({ args: ['enroll', 'claude', '-r', '-driver'] }),
        ).toEqual('enroll');
      });
    });
  });

  given('[case2] a global `-c <path>` before the command', () => {
    when('[t0] the config value sits between flag and command', () => {
      then('skips the value and returns the command', () => {
        expect(
          getCommandFromArgv({ args: ['-c', 'cfg.ts', 'enroll', 'claude'] }),
        ).toEqual('enroll');
        expect(
          getCommandFromArgv({
            args: ['--config', 'cfg.ts', 'act', '-r', 'x'],
          }),
        ).toEqual('act');
      });
    });
  });

  given('[case3] the joined `--config=path` form', () => {
    when('[t0] the config is a single joined token', () => {
      then('treats it as a flag and returns the next positional', () => {
        expect(
          getCommandFromArgv({ args: ['--config=cfg.ts', 'init', '--roles'] }),
        ).toEqual('init');
      });
    });
  });

  given('[case4] an argv with no positional command', () => {
    when('[t0] only flags are present', () => {
      then('returns null', () => {
        expect(getCommandFromArgv({ args: ['-c', 'cfg.ts'] })).toEqual(null);
        expect(getCommandFromArgv({ args: [] })).toEqual(null);
      });
    });
  });

  given('[case5] a command with its own positional args after it', () => {
    when('[t0] the command has more positionals downstream', () => {
      then('returns only the first positional (the command)', () => {
        expect(
          getCommandFromArgv({ args: ['upgrade', '--self', '--roles', 'x'] }),
        ).toEqual('upgrade');
      });
    });
  });
});
