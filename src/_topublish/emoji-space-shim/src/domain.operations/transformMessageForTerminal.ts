import { EMOJI_SPACE_REGISTRY } from '../domain.objects/EmojiSpaceRegistry';
import type { TerminalChoice } from '../domain.objects/TerminalChoice';
import { computeSpaceAdjustment } from './computeSpaceAdjustment';

/**
 * .what = transform a message by add spaces after registered emojis
 * .why = adjusts emoji space consumption for correct terminal render
 */
export const transformMessageForTerminal = (input: {
  message: string;
  terminal: TerminalChoice;
  registry?: typeof EMOJI_SPACE_REGISTRY;
}): string => {
  const registry = input.registry ?? EMOJI_SPACE_REGISTRY;
  let result = input.message;

  // iterate through registered emojis and add spaces where needed
  for (const emoji of Object.keys(registry)) {
    const adjustment = computeSpaceAdjustment({
      emoji,
      terminal: input.terminal,
      registry,
    });

    // skip if no adjustment needed
    if (adjustment === 0) continue;

    // insert spaces after each occurrence of the emoji
    const spaces = ' '.repeat(adjustment);
    result = result.split(emoji).join(emoji + spaces);
  }

  return result;
};
