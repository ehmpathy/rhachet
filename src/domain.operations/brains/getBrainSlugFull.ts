/**
 * .what = computes full slug from brain repo and slug
 * .why = enables match against user-friendly choice strings like 'xai/grok-3-fast'
 *
 * .standard = brain.slug MUST always include the repo prefix.
 *   e.g., { repo: 'xai', slug: 'xai/grok-3' }
 *   e.g., { repo: 'anthropic', slug: 'anthropic/claude/sonnet' }
 *
 * .note = defensively handles legacy brains where slug lacks the repo prefix.
 *   this prevents doubled prefixes like 'xai/xai/...' when brain already complies.
 */
export const getBrainSlugFull = (brain: {
  repo: string;
  slug: string;
}): string =>
  brain.slug.startsWith(`${brain.repo}/`)
    ? brain.slug
    : `${brain.repo}/${brain.slug}`;
