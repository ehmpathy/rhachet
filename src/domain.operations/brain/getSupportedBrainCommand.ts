import { BadRequestError } from 'helpful-errors';

import type { BrainSlug } from '@src/domain.objects/BrainSlug';

/**
 * .what = the capabilities of one supported brain: its CLI command + whether it
 *   can carry a managed-pty socket (observe + dispatch)
 * .why = the socket is a per-brain ADAPTER, not a universal mechanism. a brain
 *   without pty/resume/dispatch support falls back to a plain spawn, so each
 *   brain declares whether it is socket-capable, in one place
 */
export interface SupportedBrainCommand {
  /**
   * .what = the executable to spawn for this brain (e.g. "claude")
   */
  command: string;

  /**
   * .what = whether this brain can be routed through a managed-pty socket
   *   (gates `say`, `get`, and the observe adapter)
   */
  socket: boolean;
}

/**
 * .what = maps a supported brain slug to its capabilities, or throws if unsupported
 * .why = "which brains are supported, and what can each do" is ONE domain fact.
 *        it was previously encoded twice — once in genBrainCliConfigArtifact (a
 *        plain `Error`) and once in enrollBrainCli (a `BadRequestError`). two
 *        sources of truth for the same fact drift apart; this transformer is the
 *        single place both the config-artifact generator and the spawn call look
 *        up the command through, so the supported-brains set and its error stay
 *        uniform — and now the socket capability rides on the same fact
 *
 * .note = pure transformer — no i/o, deterministic.
 */
export const getSupportedBrainCommand = (input: {
  brain: BrainSlug;
}): SupportedBrainCommand => {
  const brainCommands: Record<string, SupportedBrainCommand> = {
    claude: { command: 'claude', socket: true },
    'claude-code': { command: 'claude', socket: true },
  };

  const command = brainCommands[input.brain];
  if (!command)
    throw new BadRequestError(
      `brain '${input.brain}' not supported. supported: ${Object.keys(brainCommands).join(', ')}`,
      { brain: input.brain },
    );

  return command;
};
