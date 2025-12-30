import { BadRequestError } from 'helpful-errors';
import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockedBrainAtom } from '@src/__test_assets__/genMockedBrainAtom';
import { genMockedBrainRepl } from '@src/__test_assets__/genMockedBrainRepl';
import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { BrainRepl } from '@src/domain.objects/BrainRepl';

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
        expect(typeof context.brain.atom.imagine).toBe('function');
        expect(typeof context.brain.repl.imagine).toBe('function');
      });
    });

    when('[t1] context.brain.atom.imagine is called', () => {
      then('it delegates to the correct atom', async () => {
        const context = genContextBrain({
          atoms: [mockAtom],
          repls: [mockRepl],
        });
        const result = await context.brain.atom.imagine({
          brain: mockAtom,
          role: {},
          prompt: 'test prompt',
          schema: { output: outputSchema },
        });
        expect(result).toEqual({ content: 'atom response' });
      });
    });

    when('[t2] context.brain.repl.imagine is called', () => {
      then('it delegates to the correct repl', async () => {
        const context = genContextBrain({
          atoms: [mockAtom],
          repls: [mockRepl],
        });
        const result = await context.brain.repl.imagine({
          brain: mockRepl,
          role: {},
          prompt: 'test prompt',
          schema: { output: outputSchema },
        });
        expect(result).toEqual({ content: 'repl response' });
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

      then(
        'brain.atom.imagine throws "no atoms available" on call',
        async () => {
          const context = genContextBrain({ repls: [mockRepl] });
          await expect(
            context.brain.atom.imagine({
              brain: mockAtomNotInContext,
              role: {},
              prompt: 'test',
              schema: { output: outputSchema },
            }),
          ).rejects.toThrow('no atoms available');
        },
      );
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

      then(
        'brain.repl.imagine throws "no repls available" on call',
        async () => {
          const context = genContextBrain({ atoms: [mockAtom] });
          await expect(
            context.brain.repl.imagine({
              brain: mockReplNotInContext,
              role: {},
              prompt: 'test',
              schema: { output: outputSchema },
            }),
          ).rejects.toThrow('no repls available');
        },
      );
    });
  });

  given('[case6] briefs are passed through to atom', () => {
    let capturedInput: any;
    const mockAtom = new BrainAtom({
      repo: '__mock_repo__',
      slug: '__mock_atom__',
      description: 'test atom capturing briefs',
      imagine: async (input) => {
        capturedInput = input;
        return input.schema.output.parse({ content: '__mock_response__' });
      },
    });
    const mockBriefs = [
      { content: 'brief 1' },
      { content: 'brief 2' },
    ] as any[];

    when('[t0] brain.atom.imagine is called with briefs', () => {
      then('briefs are passed through to atom.imagine', async () => {
        const context = genContextBrain({ atoms: [mockAtom] });
        await context.brain.atom.imagine({
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
    let capturedInput: any;
    const mockRepl = new BrainRepl({
      repo: '__mock_repo__',
      slug: '__mock_repl__',
      description: 'test repl capturing briefs',
      imagine: async (input) => {
        capturedInput = input;
        return input.schema.output.parse({ content: '__mock_response__' });
      },
    });
    const mockBriefs = [
      { content: 'brief 1' },
      { content: 'brief 2' },
    ] as any[];

    when('[t0] brain.repl.imagine is called with briefs', () => {
      then('briefs are passed through to repl.imagine', async () => {
        const context = genContextBrain({ repls: [mockRepl] });
        await context.brain.repl.imagine({
          brain: mockRepl,
          role: { briefs: mockBriefs },
          prompt: 'test prompt',
          schema: { output: outputSchema },
        });
        expect(capturedInput.role.briefs).toEqual(mockBriefs);
      });
    });
  });
});
