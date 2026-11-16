import type { Command } from 'commander';
import { now } from 'iso-time';

import { getHomeDir } from '@src/infra/getHomeDir';

import { renderCliOutput } from './renderCliOutput';
import { withBrainsAuthVerb } from './withBrainsAuthVerb';

/**
 * .what = register `rhx brains auth get`
 * .why = case=2 — per account, each usage window, its used share, its reset, and saved resets;
 *   `--output json` feeds the pool rotation (#575)
 * .note = a read rotates each parked account's refresh token, and writes the new one back first;
 *   the help and the tree both say so (rule.forbid.surprises)
 * .note = `--account <email>` reads one account and rotates only its token (default `@all`)
 * .note = no token reaches stdout in either mode
 */
export const invokeBrainsAuthGet = ({ auth }: { auth: Command }): void =>
  withBrainsAuthVerb<{ account?: string }>({
    auth,
    verb: 'get',
    description:
      'show each brain account and its usage windows; the read renews each stored login, since a refresh token is single use',
    does: 'read',
    options: (command) =>
      command
        .option(
          '--account <email>',
          'one stored account to read, or @all for every one',
          '@all',
        )
        .addHelpText(
          'after',
          [
            '',
            'examples',
            '  rhx brains auth get                             # every account, as a table',
            '  rhx brains auth get --account a@example.com     # one account; rotates its stored login',
            '  rhx brains auth get --output json               # for a machine to parse',
            '',
            'each read rotates the stored login of each account it reads, and parks the new one back.',
            'poll no faster than once per 5 minutes, since each read writes the keyrack',
          ].join('\n'),
        ),
    run: async ({ mode, owner, opts }) => {
      // read every account, through the lazy load of the auth ops
      const { getAllBrainAuthUsage } = await import(
        '@src/domain.operations/brain/auth/account/getAllBrainAuthUsage'
      );
      const { asBrainAuthUsageTree } = await import(
        '@src/domain.operations/brain/auth/account/asBrainAuthUsageTree'
      );
      const { asBrainAuthUsageJson } = await import(
        '@src/domain.operations/brain/auth/account/asBrainAuthUsageJson'
      );
      const usages = await getAllBrainAuthUsage({
        owner,
        home: getHomeDir(),
        account: opts.account ?? '@all',
      });

      console.log(
        renderCliOutput({
          mode,
          tree: asBrainAuthUsageTree({ usages, owner, now: now() }),
          data: asBrainAuthUsageJson({ usages, owner }),
        }),
      );

      // the table is out; the exit names who must fix a read that reached no account (case=11)
      const { assertBrainAuthUsageReadable } = await import(
        '@src/domain.operations/brain/auth/account/assertBrainAuthUsageReadable'
      );
      assertBrainAuthUsageReadable({ usages, owner });
    },
  });
