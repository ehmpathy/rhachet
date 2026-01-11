import { BadRequestError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { genBrainAtom, getBrainAtomsByXAI } from './index';

if (!process.env.XAI_API_KEY)
  throw new BadRequestError('XAI_API_KEY is required for integration tests');

describe('rhachet-brain-xai.index.integration', () => {
  given('[case1] getBrainAtomsByXAI', () => {
    when('[t0] called', () => {
      then('returns array of BrainAtom', () => {
        const atoms = getBrainAtomsByXAI();
        expect(Array.isArray(atoms)).toBe(true);
        expect(atoms.length).toBeGreaterThan(0);
      });

      then('default atom is grok-code-fast-1', () => {
        const atoms = getBrainAtomsByXAI();
        expect(atoms[0]?.slug).toEqual('xai/grok-code-fast-1');
      });
    });
  });

  given('[case2] genBrainAtom', () => {
    when('[t0] called with valid slug', () => {
      then('returns BrainAtom with correct repo', () => {
        const atom = genBrainAtom({ slug: 'xai/grok-3-mini' });
        expect(atom.repo).toEqual('xai');
      });

      then('returns BrainAtom with correct slug', () => {
        const atom = genBrainAtom({ slug: 'xai/grok-4' });
        expect(atom.slug).toEqual('xai/grok-4');
      });
    });
  });
});
