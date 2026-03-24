/**
 * .what = decide if a proposed slug satisfies a desired slug, with env=all fallback
 * .why = centralizes the env=all fallback match logic in one place
 *
 * .note = env=all keys satisfy any specific env request
 * .note = org.all.KEY satisfies org.test.KEY, org.prod.KEY, etc
 */
export const decideIsKeySlugEqual = (input: {
  desired: string;
  proposed: string;
}): boolean => {
  // exact match
  if (input.proposed === input.desired) return true;

  // env=all fallback: if desired is org.$env.KEY, check if proposed is org.all.KEY
  const parts = input.desired.split('.');
  if (parts.length >= 3 && parts[1] !== 'all') {
    const allSlug = `${parts[0]}.all.${parts.slice(2).join('.')}`;
    if (input.proposed === allSlug) return true;
  }

  return false;
};

/**
 * .what = compute the env=all fallback slug for a given slug
 * .why = enables callers to check for env=all keys directly
 *
 * .note = returns null if slug is already env=all or malformed
 */
export const getEnvAllFallbackSlug = (input: {
  for: { slug: string };
}): string | null => {
  const parts = input.for.slug.split('.');
  if (parts.length < 3) return null;
  if (parts[1] === 'all') return null;

  return `${parts[0]}.all.${parts.slice(2).join('.')}`;
};
