/**
 * .what = finds the first duplicate brain key from a list of brains
 * .why = validates that all brains have unique {repo, slug} identifiers
 */
export const getOneDuplicateBrainKey = (input: {
  brains: Array<{ repo: string; slug: string }>;
}): string | null => {
  const keys = input.brains.map((b) => `${b.repo}:${b.slug}`);
  const duplicateKey = keys.find((k, i) => keys.indexOf(k) !== i);
  return duplicateKey ?? null;
};
