import type { Command } from 'commander';

import { CLAUDE_AUTH_SLOT } from '@src/domain.operations/brain/auth/account/claude/claudeAuthSlot';

import { renderCliOutput } from './renderCliOutput';
import { withBrainsAuthVerb } from './withBrainsAuthVerb';

/**
 * .what = register `rhx brains auth set`
 * .why = case=1 — a human logs into a brain account, and rhachet parks it in the keyrack;
 *   case=6 — a clone or a pipe is refused at once, never left on a prompt
 * .note = `--account <email>` names the account the human means to log in as; a login of another
 *   account is refused before aught is filed
 * .note = no token reaches stdout in either mode; the login screen renders on stderr
 */
export const invokeBrainsAuthSet = ({ auth }: { auth: Command }): void =>
  withBrainsAuthVerb<{ account?: string }>({
    auth,
    verb: 'set',
    description: 'log into a brain account and store it in the keyrack',
    does: 'log into',
    options: (command) =>
      command
        .option(
          '--account <email>',
          'the account to log in as; a login of any other is refused',
        )
        .addHelpText(
          'after',
          [
            '',
            'examples',
            '  rhx brains auth set                              # log in at a browser; the login files into the keyrack',
            '  rhx brains auth set --account b@example.com      # refuse a login of any other account',
          ].join('\n'),
        ),
    run: async ({ mode, owner, opts }) => {
      // refuse before any prompt when no human can answer it
      const { assertBrainAuthLoginHasHuman } = await import(
        '@src/domain.operations/brain/auth/account/assertBrainAuthLoginHasHuman'
      );
      assertBrainAuthLoginHasHuman({
        isStdinTTY: !!process.stdin.isTTY,
        isStderrTTY: !!process.stderr.isTTY,
        env: process.env,
      });

      // refuse before the notice when no keyrack can file the login, so no line is retracted
      const { assertBrainAuthSlotWritable } = await import(
        '@src/domain.operations/brain/auth/account/slot/assertBrainAuthSlotWritable'
      );
      await assertBrainAuthSlotWritable({ owner });

      // run the isolated login, then park it
      console.error(
        'ℹ a claude session opens in an isolated dir — type /login, finish the browser login, then /exit',
      );
      const { setBrainAuthAccount } = await import(
        '@src/domain.operations/brain/auth/account/setBrainAuthAccount'
      );
      const { account, outcome } = await setBrainAuthAccount({
        owner,
        email: opts.account ?? null,
        env: process.env,
      });

      // name the keyrack key the login was filed under, at reach = the email
      const { asBrainAuthSetTree } = await import(
        '@src/domain.operations/brain/auth/account/asBrainAuthSetTree'
      );
      const { asBrainAuthSetJson } = await import(
        '@src/domain.operations/brain/auth/account/asBrainAuthSetJson'
      );
      const filed = { account, outcome, owner, key: CLAUDE_AUTH_SLOT.key };
      console.log(
        renderCliOutput({
          mode,
          tree: asBrainAuthSetTree(filed),
          data: asBrainAuthSetJson(filed),
        }),
      );
    },
  });
