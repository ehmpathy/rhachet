import { Command } from 'commander';
import { given, then, useBeforeAll, when } from 'test-fns';

import { INCREMENTAL_REMOVE_SENTINEL } from '@src/domain.operations/roles/deltas/getPreprocessedRoleArgv';

import { getCliInvocationArgs } from './getCliInvocationArgs';

/**
 * .what = parse an argv on a two-level program, and capture what the leaf action reads
 * .why = the wrapped verbs read the invocation from inside an action, one or two levels
 *        below the root; that is the exact call shape this proves
 */
const getArgsSeenByLeaf = async (input: {
  argv: string[];
}): Promise<{ args: string[] }> => {
  const program = new Command();
  program.exitOverride();
  const clone = program.command('clone');
  const seen: string[][] = [];
  clone
    .command('say')
    .argument('<address>')
    .option('--roles <roles>')
    .action(() => {
      seen.push(getCliInvocationArgs({ command: clone }));
    });
  await program.parseAsync(input.argv, { from: 'user' });
  // wrapped in an object: useBeforeAll proxies its result, and a proxied array compares as an object
  return { args: seen[0] ?? [] };
};

describe('getCliInvocationArgs', () => {
  given('[case1] a subcommand action two levels below the root', () => {
    when('[t0] the argv is parsed', () => {
      const seen = useBeforeAll(async () =>
        getArgsSeenByLeaf({ argv: ['clone', 'say', '@:foreman'] }),
      );

      then('the action reads the full invocation off the root', () => {
        expect(seen.args).toEqual(['clone', 'say', '@:foreman']);
      });
    });
  });

  given(
    '[case2] an argv whose `-role` token carries the remove sentinel',
    () => {
      when('[t0] the argv is parsed', () => {
        const seen = useBeforeAll(async () =>
          getArgsSeenByLeaf({
            argv: [
              'clone',
              'say',
              '@:foreman',
              '--roles',
              `${INCREMENTAL_REMOVE_SENTINEL}driver`,
            ],
          }),
        );

        then('the echo reads the `-role` the human typed', () => {
          expect(seen.args).toEqual([
            'clone',
            'say',
            '@:foreman',
            '--roles',
            '-driver',
          ]);
        });
      });
    },
  );
});
