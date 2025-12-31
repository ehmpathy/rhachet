import { given, then, when } from 'test-fns';

import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { BrainRepl } from '@src/domain.objects/BrainRepl';

import { brainAtomGpt4o } from './atoms/brainAtomGpt4o';
import { getBrainAtomsByOpenAI, getBrainReplsByOpenAI } from './index';
import { brainReplCodex } from './repls/brainReplCodex';

describe('rhachet-brain-openai.integration', () => {
  given('[case1] getBrainAtomsByOpenAI', () => {
    when('[t0] called', () => {
      then('returns array with brainAtomGpt4o', () => {
        const atoms = getBrainAtomsByOpenAI();
        expect(atoms).toHaveLength(1);
        expect(atoms[0]).toBe(brainAtomGpt4o);
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
      then('returns array with brainReplCodex', () => {
        const repls = getBrainReplsByOpenAI();
        expect(repls).toHaveLength(1);
        expect(repls[0]).toBe(brainReplCodex);
      });

      then('returns BrainRepl instances', () => {
        const repls = getBrainReplsByOpenAI();
        for (const repl of repls) {
          expect(repl).toBeInstanceOf(BrainRepl);
        }
      });
    });
  });
});
