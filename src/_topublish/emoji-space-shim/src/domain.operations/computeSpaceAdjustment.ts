import { EMOJI_SPACE_REGISTRY } from '../domain.objects/EmojiSpaceRegistry';
import type { TerminalChoice } from '../domain.objects/TerminalChoice';

/**
 * .what = compute how many spaces to add after an emoji for correct render
 * .why = different terminals consume different space widths for emojis
 */
export const computeSpaceAdjustment = (input: {
  emoji: string;
  terminal: TerminalChoice;
  registry?: typeof EMOJI_SPACE_REGISTRY;
}): number => {
  const rules = input.registry ?? EMOJI_SPACE_REGISTRY;

  // lookup terminal-specific rule, fallback to default, fallback to 0
  return (
    rules[input.emoji]?.[input.terminal] ?? rules[input.emoji]?.default ?? 0
  );
};
