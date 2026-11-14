import { calcEditDistance } from './calcEditDistance';

/**
 * .what = the names within an earned edit distance of what the caller typed, nearest first
 * .why = one threshold rule for every "did you mean" in the cli — a yaml spec, an actor slug,
 *        a clone verb — so a typo is caught the same way wherever it is typed
 *
 * .note = the threshold scales with the name, so a short name cannot match a distant peer:
 *   a 3-letter name tolerates 1 edit, a 12-letter name tolerates 4. a transposition costs 2
 */
export const getAllNamesWithinEditDistance = (input: {
  names: string[];
  nameTyped: string;
}): string[] => {
  const distanceAllowed = Math.max(1, Math.floor(input.nameTyped.length / 3));
  return input.names
    .map((name) => ({
      name,
      distance: calcEditDistance({ from: input.nameTyped, into: name }),
    }))
    .filter((one) => one.distance <= distanceAllowed)
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name))
    .map((one) => one.name);
};
