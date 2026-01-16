import type { Command } from 'commander';

/**
 * .what = adds the "update" command stub for discoverability
 * .why = suggests "upgrade" when user types "update"
 */
export const invokeUpdate = ({ program }: { program: Command }): void => {
  program
    .command('update')
    .description('see "upgrade"')
    .action(() => {
      console.error('');
      console.error('⛈️ "update" is not a valid command.');
      console.error('');
      console.error('   Did you mean: npx rhachet upgrade');
      console.error('');
      process.exit(1);
    });
};
