import { BadRequestError } from 'helpful-errors';

import type { BrainSlug } from '@src/domain.objects/BrainSlug';

/**
 * .what = maps a supported brain slug to its CLI command, or throws if unsupported
 * .why = "which brains are supported" is ONE domain fact. it was previously encoded
 *        twice — once in genBrainCliConfigArtifact (a plain `Error`, non-compliant with
 *        rule.require.failloud) and once in enrollBrainCli (a `BadRequestError`). two
 *        sources of truth for the same fact drift apart; this transformer is the single
 *        place both the config-artifact generator and the spawn call look up the command
 *        through, so the supported-brains set and its error stay uniform.
 *
 * .note = pure transformer — no i/o, deterministic.
 */
export const getSupportedBrainCommand = (input: {
  brain: BrainSlug;
}): string => {
  const brainCommands: Record<string, string> = {
    claude: 'claude',
    'claude-code': 'claude',
  };

  const command = brainCommands[input.brain];
  if (!command)
    throw new BadRequestError(
      `brain '${input.brain}' not supported. supported: ${Object.keys(brainCommands).join(', ')}`,
      { brain: input.brain },
    );

  return command;
};
