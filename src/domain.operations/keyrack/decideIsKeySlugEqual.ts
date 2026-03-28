/**
 * .what = decide if a slug satisfies a request for a given env
 * .why = centralizes env match with env=all fallback
 *
 * .note = returns true if slug's env matches requested env OR slug's env is 'all'
 */
export const decideIsKeySlugForEnv = (input: {
  slug: string;
  env: string;
}): boolean => {
  const parts = input.slug.split('.');
  if (parts.length < 3) return false;
  const slugEnv = parts[1];
  return slugEnv === input.env || slugEnv === 'all';
};

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
 * .what = substitute the env segment of a key slug
 * .why = enables callers to construct slug for a different env
 *
 * .note = returns null if slug is malformed (fewer than 3 segments)
 */
export const getKeySlugWithEnv = (input: {
  slug: string;
  env: string;
}): string | null => {
  const parts = input.slug.split('.');
  if (parts.length < 3) return null;
  return `${parts[0]}.${input.env}.${parts.slice(2).join('.')}`;
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

  return getKeySlugWithEnv({ slug: input.for.slug, env: 'all' });
};
