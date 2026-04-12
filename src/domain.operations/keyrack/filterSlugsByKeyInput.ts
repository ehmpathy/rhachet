/**
 * .what = filter slugs by key input (full slug or key name suffix)
 * .why = extracts filter logic from orchestrator for narrative readability
 *
 * .note = if keyInput is null, returns all slugs
 * .note = matches full slug exactly or key name suffix (after last dot)
 */
export const filterSlugsByKeyInput = (input: {
  slugs: string[];
  keyInput: string | null;
}): string[] => {
  if (!input.keyInput) return input.slugs;
  const keyInput = input.keyInput;
  return input.slugs.filter(
    (slug) => slug === keyInput || slug.endsWith(`.${keyInput}`),
  );
};
