import type { Command } from 'commander';

import { CLAUDE_AUTH_SLOT } from '@src/domain.operations/brain/auth/account/claude/claudeAuthSlot';

import { asCliOutputMode, type CliOutputMode } from './asCliOutputMode';
import { assertBrainsAuthBrainSupported } from './assertBrainsAuthBrainSupported';
import { getCliInvocationArgs } from './getCliInvocationArgs';
import { withCliOutputErrors } from './withCliOutputErrors';

/**
 * .what = register one `rhx brains auth <verb>`, with the flags and the prelude every verb shares
 * .why = `set`, `get` and `use` each take `--brain`, `--owner` and `--output`, and each begins with
 *   the same mode parse and brain check; one registrar keeps the three in step
 * .note = the verb's own flags and help are added through `options`; its action receives the parsed
 *   mode, the owner (the default owner filled in), and its raw opts
 */
export const withBrainsAuthVerb = <
  TOpts extends Record<string, unknown>,
>(input: {
  auth: Command;
  verb: 'set' | 'get' | 'use';
  description: string;
  does: string;
  options: (command: Command) => Command;
  run: (input: {
    mode: CliOutputMode;
    owner: string;
    opts: TOpts;
  }) => Promise<void>;
}): void => {
  const command = input.auth
    .command(input.verb)
    .description(input.description)
    .option(
      '--brain <slug>',
      `the brain whose account to ${input.does}`,
      'claude',
    )
    .option(
      '--owner <owner>',
      'keyrack owner that holds the accounts',
      CLAUDE_AUTH_SLOT.owner,
    )
    .option('--output <mode>', 'output mode — tree or json', 'tree');
  input
    .options(command)
    .action(
      async (
        opts: TOpts & { brain?: string; owner?: string; output?: string },
      ) => {
        await withCliOutputErrors({
          args: getCliInvocationArgs({ command: input.auth }),
          outputRaw: opts.output,
          run: async () => {
            const mode = asCliOutputMode({ raw: opts.output });
            assertBrainsAuthBrainSupported({
              brain: opts.brain,
              verb: input.verb,
            });
            await input.run({
              mode,
              owner: opts.owner ?? CLAUDE_AUTH_SLOT.owner,
              opts,
            });
          },
        });
      },
    );
};
