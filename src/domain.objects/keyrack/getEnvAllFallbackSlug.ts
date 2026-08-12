import { getKeySlugWithEnv } from './getKeySlugWithEnv';

/**
 * .what = compute the env=all fallback slug for a given slug
 * .why = a key may be declared once under `env=all` and served to every env, so a lookup
 *        that misses at `org.test.KEY` gets a second shot at `org.all.KEY`
 *
 * .note = returns null if the slug is already env=all, or is malformed — both mean there is
 *         no second shot to take
 * .note = pure string logic, so it lives in `domain.objects/keyrack/` beside the slug
 *         operations. it was moved here from `domain.operations/keyrack/decideIsKeySlugEqual`,
 *         where its placement forced `daemonKeyStore` — itself under a `domain.objects`
 *         folder — to import upward into `domain.operations`
 */
export const getEnvAllFallbackSlug = (input: {
  for: { slug: string };
}): string | null => {
  const parts = input.for.slug.split('.');
  if (parts.length < 3) return null;
  if (parts[1] === 'all') return null;

  return getKeySlugWithEnv({ slug: input.for.slug, env: 'all' });
};
