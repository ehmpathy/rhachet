import { given, then, when } from 'test-fns';

import { genMockedBrainAtom } from '@src/.test.assets/genMockedBrainAtom';

import { asBrainsDeduped } from './asBrainsDeduped';

describe('asBrainsDeduped', () => {
  given('[case1] brains with unique slugs', () => {
    const atom1 = genMockedBrainAtom({ repo: 'xai', slug: 'xai/grok-3' });
    const atom2 = genMockedBrainAtom({
      repo: 'anthropic',
      slug: 'anthropic/claude-opus',
    });

    when('[t0] deduplication is performed', () => {
      then('all brains are retained', () => {
        const deduped = asBrainsDeduped({ brains: [atom1, atom2] });
        expect(deduped).toHaveLength(2);
        expect(deduped[0]).toBe(atom1);
        expect(deduped[1]).toBe(atom2);
      });
    });
  });

  given('[case2] brains with duplicate slugs', () => {
    const atom1 = genMockedBrainAtom({
      repo: 'xai',
      slug: 'xai/grok-3',
      description: 'first',
    });
    const atom2 = genMockedBrainAtom({
      repo: 'xai',
      slug: 'xai/grok-3',
      description: 'duplicate',
    });
    const atom3 = genMockedBrainAtom({
      repo: 'anthropic',
      slug: 'anthropic/claude-opus',
    });

    when('[t0] deduplication is performed', () => {
      then('first brain wins for duplicates', () => {
        const deduped = asBrainsDeduped({ brains: [atom1, atom2, atom3] });
        expect(deduped).toHaveLength(2);
        expect(deduped[0]).toBe(atom1);
        expect(deduped[0]!.description).toBe('first');
        expect(deduped[1]).toBe(atom3);
      });
    });
  });

  given('[case3] brains with legacy slugs (no repo prefix)', () => {
    // legacy brains might carry a slug without the repo prefix
    const atom1 = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
    const atom2 = genMockedBrainAtom({ repo: 'xai', slug: 'xai/grok-3' });

    when('[t0] deduplication is performed', () => {
      then('legacy and modern slugs are treated as duplicates', () => {
        const deduped = asBrainsDeduped({ brains: [atom1, atom2] });
        expect(deduped).toHaveLength(1);
        expect(deduped[0]).toBe(atom1);
      });
    });
  });
});
