import type { KeyrackKeyAsk } from '@src/domain.objects/keyrack/KeyrackKeyAsk';

/**
 * .what = filter slugs by key ask (full slug or key name suffix)
 * .why = extracts filter logic from orchestrator for narrative readability
 *
 * .note = if keyAsk is null, returns all slugs
 * .note = matches full slug exactly or key name suffix (after last dot)
 * .note = asks come from CLI callers
 */
export const filterSlugsByKeyAsk = (input: {
  slugs: string[];
  keyAsk: KeyrackKeyAsk | null;
}): string[] => {
  if (!input.keyAsk) return input.slugs;
  const keyAsk = input.keyAsk;
  return input.slugs.filter(
    (slug) => slug === keyAsk || slug.endsWith(`.${keyAsk}`),
  );
};
