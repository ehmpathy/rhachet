import { distance } from 'fastest-levenshtein';

import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';

const MAX_BRAINS_SHOWN = 21;

const SYMBOLS = {
  atom: '○',
  repl: '↻',
} as const;

/**
 * .what = formats available brains as treestruct for error messages
 * .why = provides helpful enumeration when brain choice not found
 */
export const getAvailableBrainsInWords = (input: {
  atoms: BrainAtom[];
  repls: BrainRepl[];
  choice: string;
}): string => {
  const { atoms, repls, choice } = input;

  // compute brains list with slugs and types
  const brains: { slug: string; type: 'atom' | 'repl' }[] = [
    ...atoms.map((atom) => ({
      slug: `${atom.repo}/${atom.slug}`,
      type: 'atom' as const,
    })),
    ...repls.map((repl) => ({
      slug: `${repl.repo}/${repl.slug}`,
      type: 'repl' as const,
    })),
  ];

  // handle empty case
  if (brains.length === 0) {
    return ['🔭 available brains', '   └── (none)'].join('\n');
  }

  // compute distance once per brain (O(n))
  const brainsWithDistance = brains.map((brain) => ({
    ...brain,
    distance: distance(brain.slug, choice),
  }));

  // sort by precomputed distance (O(n log n) comparisons, O(1) per compare)
  brainsWithDistance.sort((a, b) => a.distance - b.distance);

  // truncate to max entries
  const truncated = brainsWithDistance.length > MAX_BRAINS_SHOWN;
  const truncatedCount = brainsWithDistance.length - MAX_BRAINS_SHOWN;
  const brainsToShow = brainsWithDistance.slice(0, MAX_BRAINS_SHOWN);

  // format as treestruct
  const lines = ['🔭 available brains'];

  brainsToShow.forEach((brain, index) => {
    const isLast = index === brainsToShow.length - 1 && !truncated;
    const connector = isLast ? '└──' : '├──';
    const symbol = SYMBOLS[brain.type];
    lines.push(`   ${connector} ${symbol} ${brain.slug}`);
  });

  // add truncation indicator
  if (truncated) {
    lines.push(`   └── (and ${truncatedCount} more)`);
  }

  return lines.join('\n');
};
