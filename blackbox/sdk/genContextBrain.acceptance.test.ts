import { given, then, when } from 'test-fns';

// import from dist to verify export works for consumers
import {
  BrainAtom,
  BrainChoice,
  BrainRepl,
  genContextBrain,
  isBrainAtom,
  isBrainRepl,
} from '../../dist';

// import test fixtures from shared infra
import { genMockedBrainAtom } from '@src/.test.assets/genMockedBrainAtom';
import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';

describe('genContextBrain', () => {
  given('[case1] choice: string (generic)', () => {
    const atom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
    const repl = genMockedBrainRepl({ repo: 'anthropic', slug: 'claude-code' });

    when('[t0] choice matches an atom', () => {
      then('brain.choice is that atom', () => {
        const context = genContextBrain({
          brains: { atoms: [atom], repls: [repl] },
          choice: 'xai/grok-3',
        });
        expect(context.brain.choice).toBe(atom);
      });
    });

    when('[t1] choice matches a repl', () => {
      then('brain.choice is that repl', () => {
        const context = genContextBrain({
          brains: { atoms: [atom], repls: [repl] },
          choice: 'anthropic/claude-code',
        });
        expect(context.brain.choice).toBe(repl);
      });
    });
  });

  given('[case2] choice: { repl: string } (typed)', () => {
    const atom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
    const repl = genMockedBrainRepl({ repo: 'anthropic', slug: 'claude-code' });

    when('[t0] typed repl choice provided', () => {
      then('brain.choice is the repl with correct type', () => {
        const context = genContextBrain({
          brains: { atoms: [atom], repls: [repl] },
          choice: { repl: 'anthropic/claude-code' },
        });
        // typed choice gives precise type: BrainRepl
        const choice: BrainRepl = context.brain.choice;
        expect(choice).toBe(repl);
        expect(choice.act).toBeDefined();
      });
    });
  });

  given('[case3] choice: { atom: string } (typed)', () => {
    const atom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
    const repl = genMockedBrainRepl({ repo: 'anthropic', slug: 'claude-code' });

    when('[t0] typed atom choice provided', () => {
      then('brain.choice is the atom with correct type', () => {
        const context = genContextBrain({
          brains: { atoms: [atom], repls: [repl] },
          choice: { atom: 'xai/grok-3' },
        });
        // typed choice gives precise type: BrainAtom
        const choice: BrainAtom = context.brain.choice;
        expect(choice).toBe(atom);
        expect(choice.ask).toBeDefined();
      });
    });
  });

  given('[case4] no choice provided', () => {
    const atom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
    const repl = genMockedBrainRepl({ repo: 'anthropic', slug: 'claude-code' });

    when('[t0] context is created without choice', () => {
      then('brain.choice is null', () => {
        const context = genContextBrain({
          brains: { atoms: [atom], repls: [repl] },
        });
        // no choice gives type: null
        const choice: null = context.brain.choice;
        expect(choice).toBeNull();
      });
    });
  });

  given('[case5] runtime guards for adhoc validation', () => {
    const atom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
    const repl = genMockedBrainRepl({ repo: 'anthropic', slug: 'claude-code' });

    when('[t0] isBrainAtom guard is used', () => {
      then('it correctly identifies atoms', () => {
        const context = genContextBrain({
          brains: { atoms: [atom], repls: [repl] },
          choice: 'xai/grok-3',
        });

        const choice: BrainChoice = context.brain.choice;
        if (isBrainAtom(choice)) {
          expect(choice.ask).toBeDefined();
        } else {
          fail('expected atom');
        }
      });
    });

    when('[t1] isBrainRepl guard is used', () => {
      then('it correctly identifies repls', () => {
        const context = genContextBrain({
          brains: { atoms: [atom], repls: [repl] },
          choice: 'anthropic/claude-code',
        });

        const choice: BrainChoice = context.brain.choice;
        if (isBrainRepl(choice)) {
          expect(choice.act).toBeDefined();
        } else {
          fail('expected repl');
        }
      });
    });
  });

});
