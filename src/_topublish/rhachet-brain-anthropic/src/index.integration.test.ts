import { given, then, when } from 'test-fns';

import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { BrainRepl } from '@src/domain.objects/BrainRepl';

import { genBrainAtom } from './atoms/genBrainAtom';
import { getBrainAtomsByAnthropic, getBrainReplsByAnthropic } from './index';
import { genBrainRepl } from './repls/genBrainRepl';

describe('rhachet-brain-anthropic.integration', () => {
  given('[case1] getBrainAtomsByAnthropic', () => {
    when('[t0] called', () => {
      then('returns array with one atom', () => {
        const atoms = getBrainAtomsByAnthropic();
        expect(atoms).toHaveLength(1);
      });

      then('returns BrainAtom instances', () => {
        const atoms = getBrainAtomsByAnthropic();
        for (const atom of atoms) {
          expect(atom).toBeInstanceOf(BrainAtom);
        }
      });
    });
  });

  given('[case2] getBrainReplsByAnthropic', () => {
    when('[t0] called', () => {
      then('returns array with one repl', () => {
        const repls = getBrainReplsByAnthropic();
        expect(repls).toHaveLength(1);
      });

      then('returns BrainRepl instances', () => {
        const repls = getBrainReplsByAnthropic();
        for (const repl of repls) {
          expect(repl).toBeInstanceOf(BrainRepl);
        }
      });
    });
  });

  given('[case3] genBrainAtom factory', () => {
    when('[t0] called with claude/haiku slug', () => {
      const atom = genBrainAtom({ slug: 'claude/haiku' });

      then('returns BrainAtom instance', () => {
        expect(atom).toBeInstanceOf(BrainAtom);
      });

      then('has correct slug', () => {
        expect(atom.slug).toEqual('claude/haiku');
      });
    });
  });

  given('[case4] genBrainRepl factory', () => {
    when('[t0] called with claude/code slug', () => {
      const repl = genBrainRepl({ slug: 'claude/code' });

      then('returns BrainRepl instance', () => {
        expect(repl).toBeInstanceOf(BrainRepl);
      });

      then('has correct slug', () => {
        expect(repl.slug).toEqual('claude/code');
      });
    });
  });
});
