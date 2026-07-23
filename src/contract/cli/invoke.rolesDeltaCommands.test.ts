import { Command } from 'commander';
import { given, then, when } from 'test-fns';

import type { ContextConfigOfUsage } from '@src/domain.operations/config/ContextConfigOfUsage';
import { ROLES_DELTA_COMMANDS } from '@src/domain.operations/roles/deltas/getPreprocessedRoleArgv';

import { invokeAct } from './invokeAct';
import { invokeAsk } from './invokeAsk';
import { invokeEnroll } from './invokeEnroll';
import { invokeInit } from './invokeInit';
import { invokeRun } from './invokeRun';
import { invokeUpgrade } from './invokeUpgrade';

/**
 * .what = the enforcement guard for `ROLES_DELTA_COMMANDS`
 * .why = `getPreprocessedRoleArgv` gates its sentinel encode on that hand-kept
 *        set. if a future command declares `--roles` but is absent from the set,
 *        its `-role` delta tokens get dropped by commander's variadic collection
 *        again — the exact regression this wish exists to close, under a new
 *        command name. this test ties the two together so the omission fails
 *        loud at test time instead of silent at runtime.
 *
 * .note = context is read only inside each command's `.action`, never at
 *   registration, so a stub context suffices to introspect declared options
 */
const contextStub = {} as unknown as ContextConfigOfUsage;

/**
 * .what = builds a commander program with every command that could carry
 *         `--roles`, then reads which commands actually declare it
 * .why = commander exposes each command's options; we assert the `--roles`
 *        bearers match the gated set exactly
 */
const getRolesFlagCommands = (): string[] => {
  const program = new Command();
  program.enablePositionalOptions(); // required for run's passThroughOptions

  // register every command that uses `-r`/`--roles` (delta commands) plus the
  // `-r`=`--role` peers, so a drift in either direction is caught
  invokeInit({ program });
  invokeRun({ program });
  invokeEnroll({ program });
  invokeAsk({ program }, contextStub);
  invokeAct({ program }, contextStub);
  invokeUpgrade({ program });

  // a command declares `--roles` when one of its options has that long flag
  return program.commands
    .filter((command) =>
      command.options.some((option) => option.long === '--roles'),
    )
    .map((command) => command.name());
};

describe('invoke — ROLES_DELTA_COMMANDS enforcement', () => {
  given('[case1] the registered CLI commands', () => {
    when('[t0] the `--roles` commands are enumerated', () => {
      then('every one is present in ROLES_DELTA_COMMANDS', () => {
        const rolesFlagCommands = getRolesFlagCommands();

        // sanity: the delta commands are actually discovered (not an empty pass)
        expect(rolesFlagCommands).toContain('init');
        expect(rolesFlagCommands).toContain('enroll');
        expect(rolesFlagCommands).toContain('upgrade');

        // the invariant: no `--roles` command may sit outside the gated map,
        // else its delta `-role` tokens get dropped by commander again
        for (const command of rolesFlagCommands) {
          expect(command in ROLES_DELTA_COMMANDS).toEqual(true);
        }
      });
    });

    when('[t1] the `-r`=`--role` peers (act/ask/run) are checked', () => {
      then('none of them declare `--roles`, so none are in the set', () => {
        const rolesFlagCommands = getRolesFlagCommands();

        // these use `-r` as `--role` (single value), NOT `--roles`; they must
        // never be gated as delta commands or their short flags get mangled
        expect(rolesFlagCommands).not.toContain('act');
        expect(rolesFlagCommands).not.toContain('ask');
        expect(rolesFlagCommands).not.toContain('run');
        expect('act' in ROLES_DELTA_COMMANDS).toEqual(false);
        expect('ask' in ROLES_DELTA_COMMANDS).toEqual(false);
        expect('run' in ROLES_DELTA_COMMANDS).toEqual(false);
      });
    });
  });
});
