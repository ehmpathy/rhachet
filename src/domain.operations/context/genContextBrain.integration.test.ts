import {
  getBrainAtomsByAnthropic,
  getBrainReplsByAnthropic,
} from 'rhachet-brains-anthropic';
import {
  getBrainAtomsByOpenAI,
  getBrainReplsByOpenAI,
} from 'rhachet-brains-openai';
import { getError, given, then, useThen, when } from 'test-fns';
import { z } from 'zod';

import { genMockedBrainOutput } from '@src/.test.assets/genMockedBrainOutput';
import { genSampleBrainSpec } from '@src/.test.assets/genSampleBrainSpec';
import type { BrainAtom } from '@src/domain.objects/BrainAtom';
import { BrainChoiceNotFoundError } from '@src/domain.objects/BrainChoiceNotFoundError';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';

import { genContextBrain } from './genContextBrain';

const outputSchema = z.object({ content: z.string() });

describe('genContextBrain.integration', () => {
  given('[case1] combined atoms and repls from both plugins', () => {
    when('[t0] context is created from combined plugin brains', () => {
      then('context is created successfully', () => {
        // note: external brains from npm packages don't have spec yet; cast for compatibility
        const context = genContextBrain({
          brains: {
            atoms: [
              ...getBrainAtomsByAnthropic(),
              ...getBrainAtomsByOpenAI(),
            ] as unknown as BrainAtom[],
            repls: [
              ...getBrainReplsByAnthropic(),
              ...getBrainReplsByOpenAI(),
            ] as unknown as BrainRepl[],
          },
        });
        expect(context.brain).toBeDefined();
        expect(context.brain.atom).toBeDefined();
        expect(context.brain.repl).toBeDefined();
      });
    });

    when('[t1] atom ask is invoked', () => {
      then('atom ask is called', async () => {
        let askWasCalled = false;
        const testAtom: BrainAtom = {
          repo: '__mock_repo__',
          slug: '__mock_atom__',
          description: 'test atom that verifies ask invocation',
          spec: genSampleBrainSpec(),
          ask: async (input, _context?) => {
            askWasCalled = true;
            expect(input.prompt).toEqual('test prompt');
            return genMockedBrainOutput({
              output: input.schema.output.parse({
                content: '__mock_response__',
              }),
              brainChoice: 'atom',
            });
          },
        };

        const context = genContextBrain({
          brains: { atoms: [testAtom], repls: [] },
        });

        await context.brain.atom.ask({
          brain: testAtom,
          role: {},
          prompt: 'test prompt',
          schema: { output: outputSchema },
        });

        expect(askWasCalled).toBe(true);
      });
    });

    when('[t2] repl ask is invoked', () => {
      then('repl ask is called', async () => {
        let askWasCalled = false;
        const testRepl: BrainRepl = {
          repo: '__mock_repo__',
          slug: '__mock_repl__',
          description: 'test repl that verifies ask invocation',
          spec: genSampleBrainSpec(),
          ask: async (input, _context?) => {
            askWasCalled = true;
            expect(input.prompt).toEqual('test task');
            return genMockedBrainOutput({
              output: input.schema.output.parse({
                content: '__mock_response__',
              }),
              brainChoice: 'repl',
            });
          },
          act: async (input, _context?) =>
            genMockedBrainOutput({
              output: input.schema.output.parse({
                content: '__mock_response__',
              }),
              brainChoice: 'repl',
            }),
        };

        const context = genContextBrain({
          brains: { atoms: [], repls: [testRepl] },
        });

        await context.brain.repl.ask({
          brain: testRepl,
          role: {},
          prompt: 'test task',
          schema: { output: outputSchema },
        });

        expect(askWasCalled).toBe(true);
      });
    });

    when('[t3] repl act is invoked', () => {
      then('repl act is called', async () => {
        let actWasCalled = false;
        const testRepl: BrainRepl = {
          repo: '__mock_repo__',
          slug: '__mock_repl__',
          description: 'test repl that verifies act invocation',
          spec: genSampleBrainSpec(),
          ask: async (input, _context?) =>
            genMockedBrainOutput({
              output: input.schema.output.parse({
                content: '__mock_response__',
              }),
              brainChoice: 'repl',
            }),
          act: async (input, _context?) => {
            actWasCalled = true;
            expect(input.prompt).toEqual('test action');
            return genMockedBrainOutput({
              output: input.schema.output.parse({
                content: '__mock_response__',
              }),
              brainChoice: 'repl',
            });
          },
        };

        const context = genContextBrain({
          brains: { atoms: [], repls: [testRepl] },
        });

        await context.brain.repl.act({
          brain: testRepl,
          role: {},
          prompt: 'test action',
          schema: { output: outputSchema },
        });

        expect(actWasCalled).toBe(true);
      });
    });
  });

  given('[case2] role.briefs are passed through to plugins', () => {
    when('[t0] briefs are provided to atom ask', () => {
      then('briefs are forwarded to plugin ask', async () => {
        let receivedBriefs: unknown;
        const testAtom: BrainAtom = {
          repo: '__mock_repo__',
          slug: '__mock_atom__',
          description: 'test atom that captures briefs',
          spec: genSampleBrainSpec(),
          ask: async (input, _context?) => {
            receivedBriefs = input.role.briefs;
            return genMockedBrainOutput({
              output: input.schema.output.parse({
                content: '__mock_response__',
              }),
              brainChoice: 'atom',
            });
          },
        };

        const mockBriefs = [{ content: 'brief 1' }, { content: 'brief 2' }];
        const context = genContextBrain({ brains: { atoms: [testAtom] } });

        await context.brain.atom.ask({
          brain: testAtom,
          role: { briefs: mockBriefs as any },
          prompt: 'test',
          schema: { output: outputSchema },
        });

        expect(receivedBriefs).toEqual(mockBriefs);
      });
    });
  });

  describe('discovery mode (async path)', () => {
    // .note = tests the async path when no brains are provided
    // genContextBrain({}) discovers installed rhachet-brains-* packages

    given('[case3] genContextBrain({}) discovers installed brains', () => {
      when('[t0] awaited without choice', () => {
        const context = useThen('context is created via discovery', async () =>
          genContextBrain({}),
        );

        then('brain.choice is null', () => {
          expect(context.brain.choice).toBeNull();
        });

        then('brain.atom and brain.repl are defined', () => {
          expect(context.brain.atom).toBeDefined();
          expect(context.brain.repl).toBeDefined();
          expect(typeof context.brain.atom.ask).toBe('function');
          expect(typeof context.brain.repl.ask).toBe('function');
          expect(typeof context.brain.repl.act).toBe('function');
        });
      });
    });

    given('[case4] discovery mode with invalid choice', () => {
      when('[t0] generic choice does not match any discovered brain', () => {
        then(
          'throws BrainChoiceNotFoundError with actionable message',
          async () => {
            const error = await getError(async () =>
              genContextBrain({ choice: 'nonexistent/brain-slug-xyz' }),
            );
            expect(error).toBeInstanceOf(BrainChoiceNotFoundError);
            expect((error as Error).message).toContain('brain not found');
            expect((error as Error).message).toContain('available brains');
            expect((error as Error).message).toMatchSnapshot();
          },
        );
      });

      when('[t1] typed repl choice does not match', () => {
        then(
          'throws BrainChoiceNotFoundError with repls in message',
          async () => {
            const error = await getError(async () =>
              genContextBrain({ choice: { repl: 'nonexistent/repl-xyz' } }),
            );
            expect(error).toBeInstanceOf(BrainChoiceNotFoundError);
            expect((error as Error).message).toContain('repl brain not found');
            expect((error as Error).message).toMatchSnapshot();
          },
        );
      });

      when('[t2] typed atom choice does not match', () => {
        then(
          'throws BrainChoiceNotFoundError with atoms in message',
          async () => {
            const error = await getError(async () =>
              genContextBrain({ choice: { atom: 'nonexistent/atom-xyz' } }),
            );
            expect(error).toBeInstanceOf(BrainChoiceNotFoundError);
            expect((error as Error).message).toContain('atom brain not found');
            expect((error as Error).message).toMatchSnapshot();
          },
        );
      });
    });

    given('[case5] discovery mode with creds', () => {
      const creds = { keyrack: { owner: 'ehmpath', env: 'test' as const } };

      when('[t0] awaited with creds but no choice', () => {
        const context = useThen('context is created with creds', async () =>
          genContextBrain({ creds }),
        );

        then('brain context is created with null choice', () => {
          expect(context.brain).toBeDefined();
          expect(context.brain.choice).toBeNull();
        });

        then('brain delegates are available', () => {
          expect(context.brain.atom).toBeDefined();
          expect(context.brain.repl).toBeDefined();
        });
      });
    });
  });
});
