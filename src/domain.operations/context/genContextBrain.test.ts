import { BadRequestError, HelpfulError } from 'helpful-errors';
import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockedBrainAtom } from '@src/.test.assets/genMockedBrainAtom';
import { genMockedBrainOutput } from '@src/.test.assets/genMockedBrainOutput';
import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';
import { genSampleBrainSpec } from '@src/.test.assets/genSampleBrainSpec';
import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { BrainChoiceNotFoundError } from '@src/domain.objects/BrainChoiceNotFoundError';
import { BrainRepl } from '@src/domain.objects/BrainRepl';
import { isBrainAtom, isBrainRepl } from '@src/domain.objects/ContextBrain';

import { genContextBrain } from './genContextBrain';

const outputSchema = z.object({ content: z.string() });

describe('genContextBrain', () => {
  given('[case1] valid atoms and repls arrays', () => {
    const mockAtom = genMockedBrainAtom({ content: 'atom response' });
    const mockRepl = genMockedBrainRepl({ content: 'repl response' });

    when('[t0] genContextBrain is called', () => {
      then('it returns ContextBrain instance', () => {
        const context = genContextBrain({
          atoms: [mockAtom],
          repls: [mockRepl],
        });
        expect(context.brain).toBeDefined();
        expect(context.brain.atom).toBeDefined();
        expect(context.brain.repl).toBeDefined();
        expect(typeof context.brain.atom.ask).toBe('function');
        expect(typeof context.brain.repl.ask).toBe('function');
        expect(typeof context.brain.repl.act).toBe('function');
      });
    });

    when('[t1] context.brain.atom.ask is called', () => {
      then('it delegates to the correct atom', async () => {
        const context = genContextBrain({
          atoms: [mockAtom],
          repls: [mockRepl],
        });
        const result = await context.brain.atom.ask({
          brain: mockAtom,
          role: {},
          prompt: 'test prompt',
          schema: { output: outputSchema },
        });
        expect(result.output).toEqual({ content: 'atom response' });
      });
    });

    when('[t2] context.brain.repl.ask is called', () => {
      then('it delegates to the correct repl', async () => {
        const context = genContextBrain({
          atoms: [mockAtom],
          repls: [mockRepl],
        });
        const result = await context.brain.repl.ask({
          brain: mockRepl,
          role: {},
          prompt: 'test prompt',
          schema: { output: outputSchema },
        });
        expect(result.output).toEqual({ content: 'repl response' });
      });
    });

    when('[t3] context.brain.repl.act is called', () => {
      then('it delegates to the correct repl', async () => {
        const context = genContextBrain({
          atoms: [mockAtom],
          repls: [mockRepl],
        });
        const result = await context.brain.repl.act({
          brain: mockRepl,
          role: {},
          prompt: 'test action',
          schema: { output: outputSchema },
        });
        expect(result.output).toEqual({ content: 'repl response' });
      });
    });
  });

  given('[case2] atoms with duplicate { repo, slug }', () => {
    const atom1 = genMockedBrainAtom({
      description: 'first',
      content: 'first',
    });
    const atom2 = genMockedBrainAtom({
      description: 'duplicate',
      content: 'duplicate',
    });

    when('[t0] genContextBrain is called', () => {
      then('it throws BadRequestError with "duplicate atom identifier"', () => {
        expect(() => genContextBrain({ atoms: [atom1, atom2] })).toThrow(
          BadRequestError,
        );

        try {
          genContextBrain({ atoms: [atom1, atom2] });
        } catch (error) {
          expect((error as Error).message).toContain('duplicate atom');
        }
      });
    });
  });

  given('[case3] repls with duplicate { repo, slug }', () => {
    const repl1 = genMockedBrainRepl({
      description: 'first',
      content: 'first',
    });
    const repl2 = genMockedBrainRepl({
      description: 'duplicate',
      content: 'duplicate',
    });

    when('[t0] genContextBrain is called', () => {
      then('it throws BadRequestError with "duplicate repl identifier"', () => {
        expect(() => genContextBrain({ repls: [repl1, repl2] })).toThrow(
          BadRequestError,
        );

        try {
          genContextBrain({ repls: [repl1, repl2] });
        } catch (error) {
          expect((error as Error).message).toContain('duplicate repl');
        }
      });
    });
  });

  given('[case4] atoms is undefined', () => {
    const mockRepl = genMockedBrainRepl();
    const mockAtomNotInContext = genMockedBrainAtom();

    when('[t0] genContextBrain is called with only repls', () => {
      then('context is created successfully', () => {
        const context = genContextBrain({ repls: [mockRepl] });
        expect(context.brain.atom).toBeDefined();
        expect(context.brain.repl).toBeDefined();
      });

      then('brain.atom.ask throws "no atoms available" on call', async () => {
        const context = genContextBrain({ repls: [mockRepl] });
        await expect(
          context.brain.atom.ask({
            brain: mockAtomNotInContext,
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          }),
        ).rejects.toThrow('no atoms available');
      });
    });
  });

  given('[case5] repls is undefined', () => {
    const mockAtom = genMockedBrainAtom();
    const mockReplNotInContext = genMockedBrainRepl();

    when('[t0] genContextBrain is called with only atoms', () => {
      then('context is created successfully', () => {
        const context = genContextBrain({ atoms: [mockAtom] });
        expect(context.brain.atom).toBeDefined();
        expect(context.brain.repl).toBeDefined();
      });

      then('brain.repl.ask throws "no repls available" on call', async () => {
        const context = genContextBrain({ atoms: [mockAtom] });
        await expect(
          context.brain.repl.ask({
            brain: mockReplNotInContext,
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          }),
        ).rejects.toThrow('no repls available');
      });

      then('brain.repl.act throws "no repls available" on call', async () => {
        const context = genContextBrain({ atoms: [mockAtom] });
        await expect(
          context.brain.repl.act({
            brain: mockReplNotInContext,
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          }),
        ).rejects.toThrow('no repls available');
      });
    });
  });

  given('[case6] briefs are passed through to atom', () => {
    let capturedInput: any;
    const mockAtom = new BrainAtom({
      repo: '__mock_repo__',
      slug: '__mock_atom__',
      description: 'test atom that captures briefs',
      spec: genSampleBrainSpec(),
      ask: async (input) => {
        capturedInput = input;
        return genMockedBrainOutput({
          output: input.schema.output.parse({ content: '__mock_response__' }),
          brainChoice: 'atom',
        });
      },
    });
    const mockBriefs = [
      { content: 'brief 1' },
      { content: 'brief 2' },
    ] as any[];

    when('[t0] brain.atom.ask is called with briefs', () => {
      then('briefs are passed through to atom.ask', async () => {
        const context = genContextBrain({ atoms: [mockAtom] });
        await context.brain.atom.ask({
          brain: mockAtom,
          role: { briefs: mockBriefs },
          prompt: 'test prompt',
          schema: { output: outputSchema },
        });
        expect(capturedInput.role.briefs).toEqual(mockBriefs);
      });
    });
  });

  given('[case7] briefs are passed through to repl', () => {
    let capturedAskInput: any;
    let capturedActInput: any;
    const mockRepl = new BrainRepl({
      repo: '__mock_repo__',
      slug: '__mock_repl__',
      description: 'test repl that captures briefs',
      spec: genSampleBrainSpec(),
      ask: async (input) => {
        capturedAskInput = input;
        return genMockedBrainOutput({
          output: input.schema.output.parse({ content: '__mock_response__' }),
          brainChoice: 'repl',
        });
      },
      act: async (input) => {
        capturedActInput = input;
        return genMockedBrainOutput({
          output: input.schema.output.parse({ content: '__mock_response__' }),
          brainChoice: 'repl',
        });
      },
    });
    const mockBriefs = [
      { content: 'brief 1' },
      { content: 'brief 2' },
    ] as any[];

    when('[t0] brain.repl.ask is called with briefs', () => {
      then('briefs are passed through to repl.ask', async () => {
        const context = genContextBrain({ repls: [mockRepl] });
        await context.brain.repl.ask({
          brain: mockRepl,
          role: { briefs: mockBriefs },
          prompt: 'test prompt',
          schema: { output: outputSchema },
        });
        expect(capturedAskInput.role.briefs).toEqual(mockBriefs);
      });
    });

    when('[t1] brain.repl.act is called with briefs', () => {
      then('briefs are passed through to repl.act', async () => {
        const context = genContextBrain({ repls: [mockRepl] });
        await context.brain.repl.act({
          brain: mockRepl,
          role: { briefs: mockBriefs },
          prompt: 'test action',
          schema: { output: outputSchema },
        });
        expect(capturedActInput.role.briefs).toEqual(mockBriefs);
      });
    });
  });

  given('[case8] choice is undefined', () => {
    const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
    const mockRepl = genMockedBrainRepl({
      repo: 'anthropic',
      slug: 'claude-code',
    });

    when('[t0] genContextBrain is called without choice', () => {
      then('brain.choice is null', () => {
        const context = genContextBrain({
          atoms: [mockAtom],
          repls: [mockRepl],
        });
        expect(context.brain.choice).toBeNull();
      });
    });
  });

  given('[case9] choice is { repl: string }', () => {
    const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
    const mockRepl = genMockedBrainRepl({
      repo: 'anthropic',
      slug: 'claude-code',
    });

    when('[t0] genContextBrain is called with valid repl choice', () => {
      then('brain.choice is the repl', () => {
        const context = genContextBrain({
          atoms: [mockAtom],
          repls: [mockRepl],
          choice: { repl: 'anthropic/claude-code' },
        });
        expect(context.brain.choice).toBe(mockRepl);
      });
    });

    when('[t1] genContextBrain is called with invalid repl choice', () => {
      then('it throws BrainChoiceNotFoundError', () => {
        expect(() =>
          genContextBrain({
            atoms: [mockAtom],
            repls: [mockRepl],
            choice: { repl: 'notfound/brain' },
          }),
        ).toThrow(BrainChoiceNotFoundError);
      });
    });
  });

  given('[case10] choice is { atom: string }', () => {
    const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
    const mockRepl = genMockedBrainRepl({
      repo: 'anthropic',
      slug: 'claude-code',
    });

    when('[t0] genContextBrain is called with valid atom choice', () => {
      then('brain.choice is the atom', () => {
        const context = genContextBrain({
          atoms: [mockAtom],
          repls: [mockRepl],
          choice: { atom: 'xai/grok-3' },
        });
        expect(context.brain.choice).toBe(mockAtom);
      });
    });

    when('[t1] genContextBrain is called with invalid atom choice', () => {
      then('it throws BrainChoiceNotFoundError', () => {
        expect(() =>
          genContextBrain({
            atoms: [mockAtom],
            repls: [mockRepl],
            choice: { atom: 'notfound/brain' },
          }),
        ).toThrow(BrainChoiceNotFoundError);
      });
    });
  });

  given('[case11] choice is string (unambiguous)', () => {
    const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
    const mockRepl = genMockedBrainRepl({
      repo: 'anthropic',
      slug: 'claude-code',
    });

    when('[t0] genContextBrain is called with string that matches atom', () => {
      then('brain.choice is the atom', () => {
        const context = genContextBrain({
          atoms: [mockAtom],
          repls: [mockRepl],
          choice: 'xai/grok-3',
        });
        expect(context.brain.choice).toBe(mockAtom);
      });
    });

    when('[t1] genContextBrain is called with string that matches repl', () => {
      then('brain.choice is the repl', () => {
        const context = genContextBrain({
          atoms: [mockAtom],
          repls: [mockRepl],
          choice: 'anthropic/claude-code',
        });
        expect(context.brain.choice).toBe(mockRepl);
      });
    });
  });

  given('[case12] choice is string with no match', () => {
    const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
    const mockRepl = genMockedBrainRepl({
      repo: 'anthropic',
      slug: 'claude-code',
    });

    when('[t0] genContextBrain is called with unknown slug', () => {
      then('it throws BrainChoiceNotFoundError with "brain not found"', () => {
        expect(() =>
          genContextBrain({
            atoms: [mockAtom],
            repls: [mockRepl],
            choice: 'notfound/brain',
          }),
        ).toThrow(BrainChoiceNotFoundError);

        try {
          genContextBrain({
            atoms: [mockAtom],
            repls: [mockRepl],
            choice: 'notfound/brain',
          });
        } catch (error) {
          expect((error as Error).message).toContain('brain not found');
        }
      });
    });
  });

  given('[case13] choice is string (ambiguous)', () => {
    const mockAtom = genMockedBrainAtom({ repo: 'same', slug: 'brain' });
    const mockRepl = genMockedBrainRepl({ repo: 'same', slug: 'brain' });

    when(
      '[t0] genContextBrain is called with slug that matches multiple',
      () => {
        then('it throws BadRequestError with "ambiguous"', () => {
          expect(() =>
            genContextBrain({
              atoms: [mockAtom],
              repls: [mockRepl],
              choice: 'same/brain',
            }),
          ).toThrow(BadRequestError);

          try {
            genContextBrain({
              atoms: [mockAtom],
              repls: [mockRepl],
              choice: 'same/brain',
            });
          } catch (error) {
            expect((error as Error).message).toContain('ambiguous');
          }
        });
      },
    );
  });

  given('[case14] isBrainAtom type guard', () => {
    const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
    const mockRepl = genMockedBrainRepl({
      repo: 'anthropic',
      slug: 'claude-code',
    });

    when('[t0] isBrainAtom is called with an atom', () => {
      then('it returns true', () => {
        expect(isBrainAtom(mockAtom)).toBe(true);
      });
    });

    when('[t1] isBrainAtom is called with a repl', () => {
      then('it returns false', () => {
        expect(isBrainAtom(mockRepl)).toBe(false);
      });
    });
  });

  given('[case15] isBrainRepl type guard', () => {
    const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
    const mockRepl = genMockedBrainRepl({
      repo: 'anthropic',
      slug: 'claude-code',
    });

    when('[t0] isBrainRepl is called with a repl', () => {
      then('it returns true', () => {
        expect(isBrainRepl(mockRepl)).toBe(true);
      });
    });

    when('[t1] isBrainRepl is called with an atom', () => {
      then('it returns false', () => {
        expect(isBrainRepl(mockAtom)).toBe(false);
      });
    });
  });

  given('[case16] generic choice not found', () => {
    const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
    const mockRepl = genMockedBrainRepl({
      repo: 'anthropic',
      slug: 'claude-code',
    });

    when('[t0] genContextBrain is called with unknown slug', () => {
      then('error message includes formatted available brains', () => {
        try {
          genContextBrain({
            atoms: [mockAtom],
            repls: [mockRepl],
            choice: 'antrhopic/cloude-code',
          });
        } catch (error) {
          expect((error as Error).message).toContain('🔭 available brains');
          expect((error as Error).message).toContain('xai/grok-3');
          expect((error as Error).message).toContain('anthropic/claude-code');
        }
      });

      then('most similar brain appears first in list', () => {
        try {
          genContextBrain({
            atoms: [mockAtom],
            repls: [mockRepl],
            choice: 'antrhopic/cloude-code',
          });
        } catch (error) {
          const message = (error as Error).message;
          const claudePos = message.indexOf('anthropic/claude-code');
          const grokPos = message.indexOf('xai/grok-3');
          expect(claudePos).toBeLessThan(grokPos);
        }
      });
    });
  });

  given('[case17] repl choice not found', () => {
    const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
    const mockRepl = genMockedBrainRepl({
      repo: 'anthropic',
      slug: 'claude-code',
    });

    when('[t0] genContextBrain is called with invalid repl choice', () => {
      then('error message includes available repls only', () => {
        try {
          genContextBrain({
            atoms: [mockAtom],
            repls: [mockRepl],
            choice: { repl: 'notfound/brain' },
          });
        } catch (error) {
          expect((error as Error).message).toContain('🔭 available brains');
          expect((error as Error).message).toContain('anthropic/claude-code');
          expect((error as Error).message).not.toContain('xai/grok-3');
        }
      });
    });
  });

  given('[case18] atom choice not found', () => {
    const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
    const mockRepl = genMockedBrainRepl({
      repo: 'anthropic',
      slug: 'claude-code',
    });

    when('[t0] genContextBrain is called with invalid atom choice', () => {
      then('error message includes available atoms only', () => {
        try {
          genContextBrain({
            atoms: [mockAtom],
            repls: [mockRepl],
            choice: { atom: 'notfound/brain' },
          });
        } catch (error) {
          expect((error as Error).message).toContain('🔭 available brains');
          expect((error as Error).message).toContain('xai/grok-3');
          expect((error as Error).message).not.toContain(
            'anthropic/claude-code',
          );
        }
      });
    });
  });

  given('[case19] error metadata serialized in message', () => {
    const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
    const mockRepl = genMockedBrainRepl({
      repo: 'anthropic',
      slug: 'claude-code',
    });

    when('[t0] BrainChoiceNotFoundError is thrown', () => {
      then('message contains choice and available brains in metadata', () => {
        try {
          genContextBrain({
            atoms: [mockAtom],
            repls: [mockRepl],
            choice: 'notfound/brain',
          });
        } catch (error) {
          const message = (error as Error).message;
          expect(message).toContain('"choice": "notfound/brain"');
          expect(message).toContain('"xai/grok-3"');
          expect(message).toContain('"anthropic/claude-code"');
        }
      });
    });
  });

  given('[case20] error type is BrainChoiceNotFoundError', () => {
    const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });

    when('[t0] choice does not match any brain', () => {
      then('error is instanceof BrainChoiceNotFoundError', () => {
        expect(() =>
          genContextBrain({
            atoms: [mockAtom],
            choice: 'notfound/brain',
          }),
        ).toThrow(BrainChoiceNotFoundError);
      });
    });
  });

  given('[case21] BrainChoiceNotFoundError extends HelpfulError', () => {
    const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });

    when('[t0] choice does not match any brain', () => {
      then('error is instanceof HelpfulError', () => {
        try {
          genContextBrain({
            atoms: [mockAtom],
            choice: 'notfound/brain',
          });
        } catch (error) {
          expect(error).toBeInstanceOf(HelpfulError);
        }
      });
    });
  });

  given('[case22] slug already includes repo prefix (defensive)', () => {
    // some brain packages define slugs with the provider prefix included
    // e.g., rhachet-brains-xai uses slug: 'xai/grok/code-fast-1' with repo: 'xai'
    // this would result in 'xai/xai/grok/code-fast-1' without defensive logic
    const mockAtom = genMockedBrainAtom({
      repo: 'xai',
      slug: 'xai/grok/code-fast-1',
    });

    when('[t0] choice matches the full slug (no double prefix)', () => {
      then('brain.choice is the atom', () => {
        const context = genContextBrain({
          atoms: [mockAtom],
          choice: 'xai/grok/code-fast-1',
        });
        expect(context.brain.choice).toBe(mockAtom);
      });
    });

    when('[t1] choice is provided as typed atom choice', () => {
      then('brain.choice is the atom', () => {
        const context = genContextBrain({
          atoms: [mockAtom],
          choice: { atom: 'xai/grok/code-fast-1' },
        });
        expect(context.brain.choice).toBe(mockAtom);
      });
    });
  });
});
