import { given, then, when } from 'test-fns';

import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { BrainRepl } from '@src/domain.objects/BrainRepl';

import { brainAtomClaudeOpus } from './atoms/brainAtomClaudeOpus';
import { getBrainAtomsByAnthropic, getBrainReplsByAnthropic } from './index';
import { brainReplClaudeCode } from './repls/brainReplClaudeCode';

describe('rhachet-brain-anthropic.integration', () => {
  given('[case1] getBrainAtomsByAnthropic', () => {
    when('[t0] called', () => {
      then('returns array with brainAtomClaudeOpus', () => {
        const atoms = getBrainAtomsByAnthropic();
        expect(atoms).toHaveLength(1);
        expect(atoms[0]).toBe(brainAtomClaudeOpus);
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
      then('returns array with brainReplClaudeCode', () => {
        const repls = getBrainReplsByAnthropic();
        expect(repls).toHaveLength(1);
        expect(repls[0]).toBe(brainReplClaudeCode);
      });

      then('returns BrainRepl instances', () => {
        const repls = getBrainReplsByAnthropic();
        for (const repl of repls) {
          expect(repl).toBeInstanceOf(BrainRepl);
        }
      });
    });
  });
});
