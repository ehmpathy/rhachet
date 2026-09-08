import type { Command } from 'commander';
import { ConstraintError } from 'helpful-errors';

/**
 * .what = adds the "update" command stub for discoverability
 * .why = suggests "upgrade" when user types "update"
 *
 * ⚠️ it THROWS rather than print-and-exit: a typo is caller-owned, so it owes the `✋`
 *   frame and exit 2. a hand-rolled render here is a second owner of what a human reads
 *   off a cli error, and `process.exit(1)` reports a caller fault as a server fault.
 */
export const invokeUpdate = ({ program }: { program: Command }): void => {
  program
    .command('update')
    .description('see "upgrade"')
    .action(() => {
      throw new ConstraintError('"update" is not a valid command', {
        hint: 'run `rhachet upgrade` instead',
      });
    });
};
