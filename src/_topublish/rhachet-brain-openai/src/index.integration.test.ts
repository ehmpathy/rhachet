import { given, then, when } from 'test-fns';

import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { BrainRepl } from '@src/domain.objects/BrainRepl';

import { genBrainAtom } from './atoms/genBrainAtom';
import { getBrainAtomsByOpenAI, getBrainReplsByOpenAI } from './index';
import { genBrainRepl } from './repls/genBrainRepl';

describe('rhachet-brain-openai.integration', () => {
  given('[case1] getBrainAtomsByOpenAI', () => {
    when('[t0] called', () => {
      then('returns array with one atom', () => {
        const atoms = getBrainAtomsByOpenAI();
        expect(atoms).toHaveLength(1);
      });

      then('returns BrainAtom instances', () => {
        const atoms = getBrainAtomsByOpenAI();
        for (const atom of atoms) {
          expect(atom).toBeInstanceOf(BrainAtom);
        }
      });
    });
  });

  given('[case2] getBrainReplsByOpenAI', () => {
    when('[t0] called', () => {
      then('returns array with one repl', () => {
        const repls = getBrainReplsByOpenAI();
        expect(repls).toHaveLength(1);
      });

      then('returns BrainRepl instances', () => {
        const repls = getBrainReplsByOpenAI();
        for (const repl of repls) {
          expect(repl).toBeInstanceOf(BrainRepl);
        }
      });
    });
  });

  given('[case3] genBrainAtom factory', () => {
    when('[t0] called with openai/gpt-4o-mini slug', () => {
      const atom = genBrainAtom({ slug: 'openai/gpt-4o-mini' });

      then('returns BrainAtom instance', () => {
        expect(atom).toBeInstanceOf(BrainAtom);
      });

      then('has correct slug', () => {
        expect(atom.slug).toEqual('openai/gpt-4o-mini');
      });
    });
  });

  given('[case4] genBrainRepl factory', () => {
    when('[t0] called with openai/codex slug', () => {
      const repl = genBrainRepl({ slug: 'openai/codex' });

      then('returns BrainRepl instance', () => {
        expect(repl).toBeInstanceOf(BrainRepl);
      });

      then('has correct slug', () => {
        expect(repl.slug).toEqual('openai/codex');
      });
    });
  });
});
