/**
 * .what = substitute the env segment of a key slug
 * .why = enables callers to construct the slug for a different env
 *
 * .note = returns null if the slug is malformed (fewer than 3 segments)
 * .note = pure string logic on a slug's own shape, so it lives beside the other slug
 *         operations in `domain.objects/keyrack/` rather than in `domain.operations/`. that
 *         placement is what lets `daemonKeyStore` reach it without an upward import
 */
export const getKeySlugWithEnv = (input: {
  slug: string;
  env: string;
}): string | null => {
  const parts = input.slug.split('.');
  if (parts.length < 3) return null;
  return `${parts[0]}.${input.env}.${parts.slice(2).join('.')}`;
};
