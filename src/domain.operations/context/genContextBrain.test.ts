import { BadRequestError, HelpfulError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockedBrainAtom } from '@src/.test.assets/genMockedBrainAtom';
import { genMockedBrainOutput } from '@src/.test.assets/genMockedBrainOutput';
import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';
import { genSampleBrainSpec } from '@src/.test.assets/genSampleBrainSpec';
import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import { BrainChoiceNotFoundError } from '@src/domain.objects/BrainChoiceNotFoundError';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import { isBrainAtom, isBrainRepl } from '@src/domain.objects/ContextBrain';

import { genContextBrain } from './genContextBrain';

const outputSchema = z.object({ content: z.string() });

describe('genContextBrain', () => {
  describe('explicit mode', () => {
    given('[case1] valid atoms and repls in brains object', () => {
      const mockAtom = genMockedBrainAtom({ content: 'atom response' });
      const mockRepl = genMockedBrainRepl({ content: 'repl response' });

      when('[t0] genContextBrain is called with brains', () => {
        then('it returns ContextBrain instance', () => {
          const context = genContextBrain({
            brains: { atoms: [mockAtom], repls: [mockRepl] },
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
            brains: { atoms: [mockAtom], repls: [mockRepl] },
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
            brains: { atoms: [mockAtom], repls: [mockRepl] },
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
            brains: { atoms: [mockAtom], repls: [mockRepl] },
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
        then('it throws BadRequestError with actionable message', async () => {
          const error = await getError(async () =>
            genContextBrain({ brains: { atoms: [atom1, atom2] } }),
          );
          expect(error).toBeInstanceOf(BadRequestError);
          expect((error as Error).message).toContain('duplicate atom');
          expect((error as Error).message).toMatchSnapshot();
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
        then('it throws BadRequestError with actionable message', async () => {
          const error = await getError(async () =>
            genContextBrain({ brains: { repls: [repl1, repl2] } }),
          );
          expect(error).toBeInstanceOf(BadRequestError);
          expect((error as Error).message).toContain('duplicate repl');
          expect((error as Error).message).toMatchSnapshot();
        });
      });
    });

    given('[case4] atoms is undefined in brains', () => {
      const mockRepl = genMockedBrainRepl();
      const mockAtomNotInContext = genMockedBrainAtom();

      when('[t0] genContextBrain is called with only repls', () => {
        then('context is created successfully', () => {
          const context = genContextBrain({ brains: { repls: [mockRepl] } });
          expect(context.brain.atom).toBeDefined();
          expect(context.brain.repl).toBeDefined();
        });

        then('brain.atom.ask throws actionable error on call', async () => {
          const context = genContextBrain({ brains: { repls: [mockRepl] } });
          const error = await getError(async () =>
            context.brain.atom.ask({
              brain: mockAtomNotInContext,
              role: {},
              prompt: 'test',
              schema: { output: outputSchema },
            }),
          );
          expect(error).toBeInstanceOf(BadRequestError);
          expect((error as BadRequestError).message).toContain(
            'no atoms available',
          );
          expect((error as BadRequestError).message).toMatchSnapshot();
        });
      });
    });

    given('[case5] repls is undefined in brains', () => {
      const mockAtom = genMockedBrainAtom();
      const mockReplNotInContext = genMockedBrainRepl();

      when('[t0] genContextBrain is called with only atoms', () => {
        then('context is created successfully', () => {
          const context = genContextBrain({ brains: { atoms: [mockAtom] } });
          expect(context.brain.atom).toBeDefined();
          expect(context.brain.repl).toBeDefined();
        });

        then('brain.repl.ask throws actionable error on call', async () => {
          const context = genContextBrain({ brains: { atoms: [mockAtom] } });
          const error = await getError(async () =>
            context.brain.repl.ask({
              brain: mockReplNotInContext,
              role: {},
              prompt: 'test',
              schema: { output: outputSchema },
            }),
          );
          expect(error).toBeInstanceOf(BadRequestError);
          expect((error as BadRequestError).message).toContain(
            'no repls available',
          );
          expect((error as BadRequestError).message).toMatchSnapshot();
        });

        then('brain.repl.act throws actionable error on call', async () => {
          const context = genContextBrain({ brains: { atoms: [mockAtom] } });
          const error = await getError(async () =>
            context.brain.repl.act({
              brain: mockReplNotInContext,
              role: {},
              prompt: 'test',
              schema: { output: outputSchema },
            }),
          );
          expect(error).toBeInstanceOf(BadRequestError);
          expect((error as BadRequestError).message).toContain(
            'no repls available',
          );
          expect((error as BadRequestError).message).toMatchSnapshot();
        });
      });
    });

    given('[case6] briefs are passed through to atom', () => {
      let capturedInput: unknown;
      const mockAtom: BrainAtom = {
        repo: '__mock_repo__',
        slug: '__mock_atom__',
        description: 'test atom that captures briefs',
        spec: genSampleBrainSpec(),
        ask: async (input, _context?) => {
          capturedInput = input;
          return genMockedBrainOutput({
            output: input.schema.output.parse({ content: '__mock_response__' }),
            brainChoice: 'atom',
          });
        },
      };
      const mockBriefs = [
        { content: 'brief 1' },
        { content: 'brief 2' },
      ] as unknown[];

      when('[t0] brain.atom.ask is called with briefs', () => {
        then('briefs are passed through to atom.ask', async () => {
          const context = genContextBrain({ brains: { atoms: [mockAtom] } });
          await context.brain.atom.ask({
            brain: mockAtom,
            role: { briefs: mockBriefs as never },
            prompt: 'test prompt',
            schema: { output: outputSchema },
          });
          expect(
            (capturedInput as { role: { briefs: unknown } }).role.briefs,
          ).toEqual(mockBriefs);
        });
      });
    });

    given('[case7] briefs are passed through to repl', () => {
      let capturedAskInput: unknown;
      let capturedActInput: unknown;
      const mockRepl: BrainRepl = {
        repo: '__mock_repo__',
        slug: '__mock_repl__',
        description: 'test repl that captures briefs',
        spec: genSampleBrainSpec(),
        ask: async (input, _context?) => {
          capturedAskInput = input;
          return genMockedBrainOutput({
            output: input.schema.output.parse({ content: '__mock_response__' }),
            brainChoice: 'repl',
          });
        },
        act: async (input, _context?) => {
          capturedActInput = input;
          return genMockedBrainOutput({
            output: input.schema.output.parse({ content: '__mock_response__' }),
            brainChoice: 'repl',
          });
        },
      };
      const mockBriefs = [
        { content: 'brief 1' },
        { content: 'brief 2' },
      ] as unknown[];

      when('[t0] brain.repl.ask is called with briefs', () => {
        then('briefs are passed through to repl.ask', async () => {
          const context = genContextBrain({ brains: { repls: [mockRepl] } });
          await context.brain.repl.ask({
            brain: mockRepl,
            role: { briefs: mockBriefs as never },
            prompt: 'test prompt',
            schema: { output: outputSchema },
          });
          expect(
            (capturedAskInput as { role: { briefs: unknown } }).role.briefs,
          ).toEqual(mockBriefs);
        });
      });

      when('[t1] brain.repl.act is called with briefs', () => {
        then('briefs are passed through to repl.act', async () => {
          const context = genContextBrain({ brains: { repls: [mockRepl] } });
          await context.brain.repl.act({
            brain: mockRepl,
            role: { briefs: mockBriefs as never },
            prompt: 'test action',
            schema: { output: outputSchema },
          });
          expect(
            (capturedActInput as { role: { briefs: unknown } }).role.briefs,
          ).toEqual(mockBriefs);
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
            brains: { atoms: [mockAtom], repls: [mockRepl] },
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
            brains: { atoms: [mockAtom], repls: [mockRepl] },
            choice: { repl: 'anthropic/claude-code' },
          });
          expect(context.brain.choice).toMatchObject({
            repo: mockRepl.repo,
            slug: mockRepl.slug,
          });
        });
      });

      when('[t1] genContextBrain is called with invalid repl choice', () => {
        then(
          'it throws BrainChoiceNotFoundError with actionable message',
          async () => {
            const error = await getError(async () =>
              genContextBrain({
                brains: { atoms: [mockAtom], repls: [mockRepl] },
                choice: { repl: 'notfound/brain' },
              }),
            );
            expect(error).toBeInstanceOf(BrainChoiceNotFoundError);
            expect(
              (error as BrainChoiceNotFoundError).message,
            ).toMatchSnapshot();
          },
        );
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
            brains: { atoms: [mockAtom], repls: [mockRepl] },
            choice: { atom: 'xai/grok-3' },
          });
          expect(context.brain.choice).toMatchObject({
            repo: mockAtom.repo,
            slug: mockAtom.slug,
          });
        });
      });

      when('[t1] genContextBrain is called with invalid atom choice', () => {
        then(
          'it throws BrainChoiceNotFoundError with actionable message',
          async () => {
            const error = await getError(async () =>
              genContextBrain({
                brains: { atoms: [mockAtom], repls: [mockRepl] },
                choice: { atom: 'notfound/brain' },
              }),
            );
            expect(error).toBeInstanceOf(BrainChoiceNotFoundError);
            expect(
              (error as BrainChoiceNotFoundError).message,
            ).toMatchSnapshot();
          },
        );
      });
    });

    given('[case11] choice is string (unambiguous)', () => {
      const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
      const mockRepl = genMockedBrainRepl({
        repo: 'anthropic',
        slug: 'claude-code',
      });

      when(
        '[t0] genContextBrain is called with string that matches atom',
        () => {
          then('brain.choice is the atom', () => {
            const context = genContextBrain({
              brains: { atoms: [mockAtom], repls: [mockRepl] },
              choice: 'xai/grok-3',
            });
            expect(context.brain.choice).toMatchObject({
              repo: mockAtom.repo,
              slug: mockAtom.slug,
            });
          });
        },
      );

      when(
        '[t1] genContextBrain is called with string that matches repl',
        () => {
          then('brain.choice is the repl', () => {
            const context = genContextBrain({
              brains: { atoms: [mockAtom], repls: [mockRepl] },
              choice: 'anthropic/claude-code',
            });
            expect(context.brain.choice).toMatchObject({
              repo: mockRepl.repo,
              slug: mockRepl.slug,
            });
          });
        },
      );
    });

    given('[case12] choice is string with no match', () => {
      const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });
      const mockRepl = genMockedBrainRepl({
        repo: 'anthropic',
        slug: 'claude-code',
      });

      when('[t0] genContextBrain is called with unknown slug', () => {
        then(
          'it throws BrainChoiceNotFoundError with actionable message',
          async () => {
            const error = await getError(async () =>
              genContextBrain({
                brains: { atoms: [mockAtom], repls: [mockRepl] },
                choice: 'notfound/brain',
              }),
            );
            expect(error).toBeInstanceOf(BrainChoiceNotFoundError);
            expect((error as BrainChoiceNotFoundError).message).toContain(
              'brain not found',
            );
            expect(
              (error as BrainChoiceNotFoundError).message,
            ).toMatchSnapshot();
          },
        );
      });
    });

    given('[case13] choice is string (ambiguous)', () => {
      const mockAtom = genMockedBrainAtom({ repo: 'same', slug: 'brain' });
      const mockRepl = genMockedBrainRepl({ repo: 'same', slug: 'brain' });

      when(
        '[t0] genContextBrain is called with slug that matches multiple',
        () => {
          then(
            'it throws BadRequestError with actionable message',
            async () => {
              const error = await getError(async () =>
                genContextBrain({
                  brains: { atoms: [mockAtom], repls: [mockRepl] },
                  choice: 'same/brain',
                }),
              );
              expect(error).toBeInstanceOf(BadRequestError);
              expect((error as BadRequestError).message).toContain('ambiguous');
              expect((error as BadRequestError).message).toMatchSnapshot();
            },
          );
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
        then('error message includes formatted available brains', async () => {
          const error = await getError(async () =>
            genContextBrain({
              brains: { atoms: [mockAtom], repls: [mockRepl] },
              choice: 'antrhopic/cloude-code',
            }),
          );
          expect(error).toBeInstanceOf(BrainChoiceNotFoundError);
          expect((error as BrainChoiceNotFoundError).message).toContain(
            '🔭 available brains',
          );
          expect((error as BrainChoiceNotFoundError).message).toContain(
            'xai/grok-3',
          );
          expect((error as BrainChoiceNotFoundError).message).toContain(
            'anthropic/claude-code',
          );
          expect((error as BrainChoiceNotFoundError).message).toMatchSnapshot();
        });

        then('most similar brain appears first in list', async () => {
          const error = await getError(async () =>
            genContextBrain({
              brains: { atoms: [mockAtom], repls: [mockRepl] },
              choice: 'antrhopic/cloude-code',
            }),
          );
          expect(error).toBeInstanceOf(BrainChoiceNotFoundError);
          const message = (error as BrainChoiceNotFoundError).message;
          const claudePos = message.indexOf('anthropic/claude-code');
          const grokPos = message.indexOf('xai/grok-3');
          expect(claudePos).toBeLessThan(grokPos);
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
        then('error message includes available repls only', async () => {
          const error = await getError(async () =>
            genContextBrain({
              brains: { atoms: [mockAtom], repls: [mockRepl] },
              choice: { repl: 'notfound/brain' },
            }),
          );
          expect(error).toBeInstanceOf(BrainChoiceNotFoundError);
          expect((error as BrainChoiceNotFoundError).message).toContain(
            '🔭 available brains',
          );
          expect((error as BrainChoiceNotFoundError).message).toContain(
            'anthropic/claude-code',
          );
          expect((error as BrainChoiceNotFoundError).message).not.toContain(
            'xai/grok-3',
          );
          expect((error as BrainChoiceNotFoundError).message).toMatchSnapshot();
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
        then('error message includes available atoms only', async () => {
          const error = await getError(async () =>
            genContextBrain({
              brains: { atoms: [mockAtom], repls: [mockRepl] },
              choice: { atom: 'notfound/brain' },
            }),
          );
          expect(error).toBeInstanceOf(BrainChoiceNotFoundError);
          expect((error as BrainChoiceNotFoundError).message).toContain(
            '🔭 available brains',
          );
          expect((error as BrainChoiceNotFoundError).message).toContain(
            'xai/grok-3',
          );
          expect((error as BrainChoiceNotFoundError).message).not.toContain(
            'anthropic/claude-code',
          );
          expect((error as BrainChoiceNotFoundError).message).toMatchSnapshot();
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
        then(
          'message contains choice and available brains in metadata',
          async () => {
            const error = await getError(async () =>
              genContextBrain({
                brains: { atoms: [mockAtom], repls: [mockRepl] },
                choice: 'notfound/brain',
              }),
            );
            expect(error).toBeInstanceOf(BrainChoiceNotFoundError);
            const message = (error as BrainChoiceNotFoundError).message;
            expect(message).toContain('"choice": "notfound/brain"');
            expect(message).toContain('"xai/grok-3"');
            expect(message).toContain('"anthropic/claude-code"');
            expect(message).toMatchSnapshot();
          },
        );
      });
    });

    given('[case20] error type is BrainChoiceNotFoundError', () => {
      const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });

      when('[t0] choice does not match any brain', () => {
        then('error is instanceof BrainChoiceNotFoundError', async () => {
          const error = await getError(async () =>
            genContextBrain({
              brains: { atoms: [mockAtom] },
              choice: 'notfound/brain',
            }),
          );
          expect(error).toBeInstanceOf(BrainChoiceNotFoundError);
          expect((error as BrainChoiceNotFoundError).message).toMatchSnapshot();
        });
      });
    });

    given('[case21] BrainChoiceNotFoundError extends HelpfulError', () => {
      const mockAtom = genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' });

      when('[t0] choice does not match any brain', () => {
        then('error is instanceof HelpfulError', async () => {
          const error = await getError(async () =>
            genContextBrain({
              brains: { atoms: [mockAtom] },
              choice: 'notfound/brain',
            }),
          );
          expect(error).toBeInstanceOf(HelpfulError);
          expect((error as Error).message).toMatchSnapshot();
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
            brains: { atoms: [mockAtom] },
            choice: 'xai/grok/code-fast-1',
          });
          expect(context.brain.choice).toMatchObject({
            repo: mockAtom.repo,
            slug: mockAtom.slug,
          });
        });
      });

      when('[t1] choice is provided as typed atom choice', () => {
        then('brain.choice is the atom', () => {
          const context = genContextBrain({
            brains: { atoms: [mockAtom] },
            choice: { atom: 'xai/grok/code-fast-1' },
          });
          expect(context.brain.choice).toMatchObject({
            repo: mockAtom.repo,
            slug: mockAtom.slug,
          });
        });
      });
    });

    given('[case23] creds are passed to genContextBrain', () => {
      // .note = mocks return captured context to avoid let declarations
      const genMockAtomWithCapture = () => {
        const captured: { context: unknown } = { context: undefined };
        const atom: BrainAtom = {
          repo: 'fireworks',
          slug: 'deepseek/v4-flash',
          description: 'atom that captures context',
          spec: genSampleBrainSpec(),
          ask: async (input, context?) => {
            captured.context = context;
            return genMockedBrainOutput({
              output: input.schema.output.parse({ content: '__mock__' }),
              brainChoice: 'atom',
            });
          },
        };
        return { atom, captured };
      };

      const genMockReplWithCapture = () => {
        const capturedAsk: { context: unknown } = { context: undefined };
        const capturedAct: { context: unknown } = { context: undefined };
        const repl: BrainRepl = {
          repo: 'anthropic',
          slug: 'claude-sonnet-4',
          description: 'repl that captures context',
          spec: genSampleBrainSpec(),
          ask: async (input, context?) => {
            capturedAsk.context = context;
            return genMockedBrainOutput({
              output: input.schema.output.parse({ content: '__mock__' }),
              brainChoice: 'repl',
            });
          },
          act: async (input, context?) => {
            capturedAct.context = context;
            return genMockedBrainOutput({
              output: input.schema.output.parse({ content: '__mock__' }),
              brainChoice: 'repl',
            });
          },
        };
        return { repl, capturedAsk, capturedAct };
      };

      const creds = { keyrack: { owner: 'ehmpath', env: 'test' as const } };

      when('[t0] brain.atom.ask is called with creds provided', () => {
        then('supplier context is passed to atom.ask', async () => {
          const { atom: mockAtom, captured } = genMockAtomWithCapture();
          const { repl: mockRepl } = genMockReplWithCapture();
          const context = genContextBrain({
            brains: { atoms: [mockAtom], repls: [mockRepl] },
            creds,
          });
          await context.brain.atom.ask({
            brain: mockAtom,
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          });
          expect(captured.context).toBeDefined();
          const ctx = captured.context as Record<string, unknown>;
          // each brain gets only its own supplier context (JIT, not all upfront)
          expect(ctx['brain.supplier.fireworks']).toBeDefined();
          expect(ctx['brain.supplier.anthropic']).toBeUndefined();
        });
      });

      when('[t1] brain.repl.ask is called with creds provided', () => {
        then('supplier context is passed to repl.ask', async () => {
          const { atom: mockAtom } = genMockAtomWithCapture();
          const { repl: mockRepl, capturedAsk } = genMockReplWithCapture();
          const context = genContextBrain({
            brains: { atoms: [mockAtom], repls: [mockRepl] },
            creds,
          });
          await context.brain.repl.ask({
            brain: mockRepl,
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          });
          expect(capturedAsk.context).toBeDefined();
          const ctx = capturedAsk.context as Record<string, unknown>;
          // each brain gets only its own supplier context (JIT, not all upfront)
          expect(ctx['brain.supplier.fireworks']).toBeUndefined();
          expect(ctx['brain.supplier.anthropic']).toBeDefined();
        });
      });

      when('[t2] brain.repl.act is called with creds provided', () => {
        then('supplier context is passed to repl.act', async () => {
          const { atom: mockAtom } = genMockAtomWithCapture();
          const { repl: mockRepl, capturedAct } = genMockReplWithCapture();
          const context = genContextBrain({
            brains: { atoms: [mockAtom], repls: [mockRepl] },
            creds,
          });
          await context.brain.repl.act({
            brain: mockRepl,
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          });
          expect(capturedAct.context).toBeDefined();
          const ctx = capturedAct.context as Record<string, unknown>;
          // each brain gets only its own supplier context (JIT, not all upfront)
          expect(ctx['brain.supplier.fireworks']).toBeUndefined();
          expect(ctx['brain.supplier.anthropic']).toBeDefined();
        });
      });
    });

    given('[case24] no creds provided', () => {
      when('[t0] brain.atom.ask is called without creds', () => {
        then('empty context is passed to atom.ask', async () => {
          const captured: { context: unknown } = { context: undefined };
          const mockAtom: BrainAtom = {
            repo: 'fireworks',
            slug: 'deepseek/v4-flash',
            description: 'atom that captures context',
            spec: genSampleBrainSpec(),
            ask: async (input, context?) => {
              captured.context = context;
              return genMockedBrainOutput({
                output: input.schema.output.parse({ content: '__mock__' }),
                brainChoice: 'atom',
              });
            },
          };
          const context = genContextBrain({
            brains: { atoms: [mockAtom] },
          });
          await context.brain.atom.ask({
            brain: mockAtom,
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          });
          expect(captured.context).toEqual({});
        });
      });
    });
  }); // end explicit mode

  describe('discovery mode', () => {
    given('[case25] genContextBrain called without brains (discovery)', () => {
      when('[t0] genContextBrain({}) is called', () => {
        then('returns a Promise', () => {
          const result = genContextBrain({});
          expect(result).toBeInstanceOf(Promise);
        });
      });
    });

    // .note = discovery mode integration tests require real brain packages
    // see genContextBrain.integration.test.ts for full discovery path tests
  });

  describe('context caller override', () => {
    given('[case26] bound brain with contextCaller passed to ask', () => {
      // .note = test verifies contextCaller overrides bound context
      const genMockAtomWithCapture = () => {
        const captured: { context: unknown } = { context: undefined };
        const atom: BrainAtom = {
          repo: 'fireworks',
          slug: 'deepseek/v4-flash',
          description: 'atom that captures context',
          spec: genSampleBrainSpec(),
          ask: async (input, context?) => {
            captured.context = context;
            return genMockedBrainOutput({
              output: input.schema.output.parse({ content: '__mock__' }),
              brainChoice: 'atom',
            });
          },
        };
        return { atom, captured };
      };

      const creds = { keyrack: { owner: 'ehmpath', env: 'test' as const } };

      when('[t0] brain.choice.ask is called with contextCaller', () => {
        then('contextCaller overrides bound context values', async () => {
          const { atom: mockAtom, captured } = genMockAtomWithCapture();
          const context = genContextBrain({
            brains: { atoms: [mockAtom] },
            choice: { atom: 'fireworks/deepseek/v4-flash' },
            creds,
          });

          // call choice.ask with contextCaller that overrides a key
          await context.brain.choice!.ask(
            { role: {}, prompt: 'test', schema: { output: outputSchema } },
            { customKey: 'caller-value', override: 'from-caller' } as never,
          );

          const ctx = captured.context as Record<string, unknown>;
          // contextCaller values should be present
          expect(ctx['customKey']).toBe('caller-value');
          expect(ctx['override']).toBe('from-caller');
        });
      });

      when('[t1] brain.choice.ask is called without contextCaller', () => {
        then('bound context values are preserved', async () => {
          const { atom: mockAtom, captured } = genMockAtomWithCapture();
          const context = genContextBrain({
            brains: { atoms: [mockAtom] },
            choice: { atom: 'fireworks/deepseek/v4-flash' },
            creds,
          });

          // call without contextCaller
          await context.brain.choice!.ask(
            { role: {}, prompt: 'test', schema: { output: outputSchema } },
            undefined,
          );

          const ctx = captured.context as Record<string, unknown>;
          // bound supplier context should be present
          expect(ctx['brain.supplier.fireworks']).toBeDefined();
        });
      });
    });

    given(
      '[case27] bound repl with contextCaller passed to ask and act',
      () => {
        const genMockReplWithCapture = () => {
          const capturedAsk: { context: unknown } = { context: undefined };
          const capturedAct: { context: unknown } = { context: undefined };
          const repl: BrainRepl = {
            repo: 'anthropic',
            slug: 'claude-sonnet-4',
            description: 'repl that captures context',
            spec: genSampleBrainSpec(),
            ask: async (input, context?) => {
              capturedAsk.context = context;
              return genMockedBrainOutput({
                output: input.schema.output.parse({ content: '__mock__' }),
                brainChoice: 'repl',
              });
            },
            act: async (input, context?) => {
              capturedAct.context = context;
              return genMockedBrainOutput({
                output: input.schema.output.parse({ content: '__mock__' }),
                brainChoice: 'repl',
              });
            },
          };
          return { repl, capturedAsk, capturedAct };
        };

        const creds = { keyrack: { owner: 'ehmpath', env: 'test' as const } };

        when(
          '[t0] brain.choice.ask (repl) is called with contextCaller',
          () => {
            then('contextCaller overrides bound context values', async () => {
              const { repl: mockRepl, capturedAsk } = genMockReplWithCapture();
              const context = genContextBrain({
                brains: { repls: [mockRepl] },
                choice: { repl: 'anthropic/claude-sonnet-4' },
                creds,
              });

              // call choice.ask with contextCaller
              await context.brain.choice!.ask(
                { role: {}, prompt: 'test', schema: { output: outputSchema } },
                { override: 'caller-wins' } as never,
              );

              const ctx = capturedAsk.context as Record<string, unknown>;
              expect(ctx['override']).toBe('caller-wins');
              // bound context should also be present
              expect(ctx['brain.supplier.anthropic']).toBeDefined();
            });
          },
        );

        when(
          '[t1] brain.choice.act (repl) is called with contextCaller',
          () => {
            then('contextCaller overrides bound context values', async () => {
              const { repl: mockRepl, capturedAct } = genMockReplWithCapture();
              const context = genContextBrain({
                brains: { repls: [mockRepl] },
                choice: { repl: 'anthropic/claude-sonnet-4' },
                creds,
              });

              // call choice.act with contextCaller
              await context.brain.choice!.act(
                { role: {}, prompt: 'test', schema: { output: outputSchema } },
                { override: 'act-caller-wins' } as never,
              );

              const ctx = capturedAct.context as Record<string, unknown>;
              expect(ctx['override']).toBe('act-caller-wins');
              // bound context should also be present
              expect(ctx['brain.supplier.anthropic']).toBeDefined();
            });
          },
        );
      },
    );

    given('[case28] bound brain via brain.atom.ask with contextCaller', () => {
      const genMockAtomWithCapture = () => {
        const captured: { context: unknown } = { context: undefined };
        const atom: BrainAtom = {
          repo: 'fireworks',
          slug: 'deepseek/v4-flash',
          description: 'atom that captures context',
          spec: genSampleBrainSpec(),
          ask: async (input, context?) => {
            captured.context = context;
            return genMockedBrainOutput({
              output: input.schema.output.parse({ content: '__mock__' }),
              brainChoice: 'atom',
            });
          },
        };
        return { atom, captured };
      };

      when('[t0] context.brain.atom.ask is called', () => {
        then('supplier context is bound to delegated atom', async () => {
          const { atom: mockAtom, captured } = genMockAtomWithCapture();
          const creds = { keyrack: { owner: 'ehmpath', env: 'test' as const } };
          const context = genContextBrain({
            brains: { atoms: [mockAtom] },
            creds,
          });

          await context.brain.atom.ask({
            brain: mockAtom,
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          });

          const ctx = captured.context as Record<string, unknown>;
          expect(ctx['brain.supplier.fireworks']).toBeDefined();
        });
      });
    });

    given('[case29] bound brain via brain.repl.ask with contextCaller', () => {
      const genMockReplWithCapture = () => {
        const capturedAsk: { context: unknown } = { context: undefined };
        const capturedAct: { context: unknown } = { context: undefined };
        const repl: BrainRepl = {
          repo: 'anthropic',
          slug: 'claude-sonnet-4',
          description: 'repl that captures context',
          spec: genSampleBrainSpec(),
          ask: async (input, context?) => {
            capturedAsk.context = context;
            return genMockedBrainOutput({
              output: input.schema.output.parse({ content: '__mock__' }),
              brainChoice: 'repl',
            });
          },
          act: async (input, context?) => {
            capturedAct.context = context;
            return genMockedBrainOutput({
              output: input.schema.output.parse({ content: '__mock__' }),
              brainChoice: 'repl',
            });
          },
        };
        return { repl, capturedAsk, capturedAct };
      };

      when('[t0] context.brain.repl.ask is called', () => {
        then('supplier context is bound to delegated repl', async () => {
          const { repl: mockRepl, capturedAsk } = genMockReplWithCapture();
          const creds = { keyrack: { owner: 'ehmpath', env: 'test' as const } };
          const context = genContextBrain({
            brains: { repls: [mockRepl] },
            creds,
          });

          await context.brain.repl.ask({
            brain: mockRepl,
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          });

          const ctx = capturedAsk.context as Record<string, unknown>;
          expect(ctx['brain.supplier.anthropic']).toBeDefined();
        });
      });

      when('[t1] context.brain.repl.act is called', () => {
        then('supplier context is bound to delegated repl', async () => {
          const { repl: mockRepl, capturedAct } = genMockReplWithCapture();
          const creds = { keyrack: { owner: 'ehmpath', env: 'test' as const } };
          const context = genContextBrain({
            brains: { repls: [mockRepl] },
            creds,
          });

          await context.brain.repl.act({
            brain: mockRepl,
            role: {},
            prompt: 'test',
            schema: { output: outputSchema },
          });

          const ctx = capturedAct.context as Record<string, unknown>;
          expect(ctx['brain.supplier.anthropic']).toBeDefined();
        });
      });
    });

    given('[case30] contextCaller merge precedence', () => {
      // .note = test that caller values override bound values for same keys
      const genMockAtomWithCapture = () => {
        const captured: { context: unknown } = { context: undefined };
        const atom: BrainAtom = {
          repo: 'test-repo',
          slug: 'test-atom',
          description: 'atom that captures context for merge test',
          spec: genSampleBrainSpec(),
          ask: async (input, context?) => {
            captured.context = context;
            return genMockedBrainOutput({
              output: input.schema.output.parse({ content: '__mock__' }),
              brainChoice: 'atom',
            });
          },
        };
        return { atom, captured };
      };

      when('[t0] contextCaller has same key as bound context', () => {
        then('contextCaller value wins', async () => {
          const { atom: mockAtom, captured } = genMockAtomWithCapture();
          const creds = { keyrack: { owner: 'ehmpath', env: 'test' as const } };
          const context = genContextBrain({
            brains: { atoms: [mockAtom] },
            choice: { atom: 'test-repo/test-atom' },
            creds,
          });

          // the bound context has 'brain.supplier.test-repo'
          // pass contextCaller with same key to verify override
          await context.brain.choice!.ask(
            { role: {}, prompt: 'test', schema: { output: outputSchema } },
            { 'brain.supplier.test-repo': 'caller-override' } as never,
          );

          const ctx = captured.context as Record<string, unknown>;
          // caller value should override bound value
          expect(ctx['brain.supplier.test-repo']).toBe('caller-override');
        });
      });

      when('[t1] contextCaller adds new keys', () => {
        then('both bound and caller keys are present', async () => {
          const { atom: mockAtom, captured } = genMockAtomWithCapture();
          const creds = { keyrack: { owner: 'ehmpath', env: 'test' as const } };
          const context = genContextBrain({
            brains: { atoms: [mockAtom] },
            choice: { atom: 'test-repo/test-atom' },
            creds,
          });

          await context.brain.choice!.ask(
            { role: {}, prompt: 'test', schema: { output: outputSchema } },
            { newCallerKey: 'caller-value' } as never,
          );

          const ctx = captured.context as Record<string, unknown>;
          // both should be present
          expect(ctx['brain.supplier.test-repo']).toBeDefined();
          expect(ctx['newCallerKey']).toBe('caller-value');
        });
      });
    });
  });
});
