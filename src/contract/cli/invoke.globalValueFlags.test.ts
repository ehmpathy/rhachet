import { Command } from 'commander';
import { given, then, when } from 'test-fns';

import { GLOBAL_VALUE_FLAGS } from '@src/domain.operations/roles/deltas/getCommandFromArgv';

import { defineGlobalOptions } from './defineGlobalOptions';

/**
 * .what = the enforcement guard for `GLOBAL_VALUE_FLAGS`
 * .why = `getCommandFromArgv` skips a global value flag AND its value token to
 *        find the subcommand, so `getPreprocessedRoleArgv` knows which command it
 *        feeds. that hand-kept set must stay in sync with the program's actual
 *        global value options. if a new value flag is declared in
 *        `defineGlobalOptions` but left out of `GLOBAL_VALUE_FLAGS`,
 *        getCommandFromArgv misreads the token after it as the command, skips the
 *        sentinel encode, and drops `-role` tokens again — the exact regression
 *        this wish exists to close, reopened through a second un-gated seam. this
 *        test ties the two together so the omission fails loud at test time.
 *
 * .note = this mirrors `invoke.rolesDeltaCommands.test.ts`, which guards the peer
 *   hand-kept set `ROLES_DELTA_COMMANDS` the same way
 */
describe('invoke — GLOBAL_VALUE_FLAGS enforcement', () => {
  given('[case1] the program-level global options', () => {
    when('[t0] the global flags that carry a value are enumerated', () => {
      then('every one is present in GLOBAL_VALUE_FLAGS', () => {
        const program = new Command();
        defineGlobalOptions({ program });

        // an option that carries a value declares `<value>` (required) or
        // `[value]` (optional); commander exposes that via required / optional
        const valueFlags = program.options
          .filter((option) => option.required || option.optional)
          .flatMap((option) => [option.short, option.long])
          .filter((flag): flag is string => Boolean(flag));

        // sanity: the known `-c`/`--config` value flag pair is discovered
        expect(valueFlags).toContain('-c');
        expect(valueFlags).toContain('--config');

        // the invariant: no global value flag may sit outside the gated set,
        // else getCommandFromArgv misreads the command past it
        for (const flag of valueFlags) {
          expect(GLOBAL_VALUE_FLAGS.has(flag)).toEqual(true);
        }
      });
    });

    when('[t1] a boolean (value-less) global flag is added', () => {
      then(
        'it needs no GLOBAL_VALUE_FLAGS entry — no value token to skip',
        () => {
          const program = new Command();
          defineGlobalOptions({ program });
          program.option('--verbose', 'a value-less boolean flag');

          // a value-less flag is a single token; getCommandFromArgv skips it as a
          // lone `-`-prefixed flag, so it needs no GLOBAL_VALUE_FLAGS entry
          const valueLessFlag = program.options.find(
            (option) => option.long === '--verbose',
          );
          expect(valueLessFlag?.required).toEqual(false);
          expect(valueLessFlag?.optional).toEqual(false);
          expect(GLOBAL_VALUE_FLAGS.has('--verbose')).toEqual(false);
        },
      );
    });
  });
});
