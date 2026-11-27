/**
 * .what = how many times a needle appears in a text, never overlapped
 * .why = a clamp that says "named once" asserts a count; one name for it reads as the claim
 */
export const asCountOfOccurrences = (input: {
  text: string;
  needle: string;
}): number => input.text.split(input.needle).length - 1;
