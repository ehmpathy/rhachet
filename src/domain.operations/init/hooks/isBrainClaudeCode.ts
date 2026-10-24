import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';

/**
 * .what = whether a brain specifier names claude code, by its full slug or its alias
 * .why = both names reach the one claude code hooks adapter, so both must open the settings
 *        shield; an alias that skipped it would let the adapter's write by name follow the
 *        grove arrow into the human's home settings
 *
 * .note = pure transformer — no i/o, deterministic
 */
export const isBrainClaudeCode = (input: { brain: BrainSpecifier }): boolean =>
  input.brain === 'anthropic/claude/code' || input.brain === 'claude-code';
