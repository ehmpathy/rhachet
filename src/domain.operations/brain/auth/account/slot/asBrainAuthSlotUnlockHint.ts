import { CLAUDE_AUTH_SLOT } from '@src/domain.operations/brain/auth/account/claude/claudeAuthSlot';

/**
 * .what = the command that opens the keyrack slot for an owner, when the keyrack gave no fix
 * .why = `set`, `get` and `use` each refuse a locked slot; one hint keeps the three in step with
 *   the slot's own env
 */
export const asBrainAuthSlotUnlockHint = (input: {
  owner: string | null;
}): string =>
  `rhx keyrack unlock --owner ${input.owner ?? 'default'} --env ${CLAUDE_AUTH_SLOT.env}`;
