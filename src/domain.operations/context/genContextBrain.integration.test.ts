import { given, then, when } from 'test-fns';
import { z } from 'zod';

import {
  getBrainAtomsByAnthropic,
  getBrainReplsByAnthropic,
} from '@src/_topublish/rhachet-brain-anthropic/src/index';
import {
  getBrainAtomsByOpenAI,
  getBrainReplsByOpenAI,
} from '@src/_topublish/rhachet-brain-openai/src/index';
import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { BrainRepl } from '@src/domain.objects/BrainRepl';

import { genContextBrain } from './genContextBrain';

const outputSchema = z.object({ content: z.string() });

describe('genContextBrain.integration', () => {
  given('[case1] combined atoms and repls from both plugins', () => {
    when('[t0] context is created from combined plugin brains', () => {
      then('context is created successfully', () => {
        const context = genContextBrain({
          atoms: [...getBrainAtomsByAnthropic(), ...getBrainAtomsByOpenAI()],
          repls: [...getBrainReplsByAnthropic(), ...getBrainReplsByOpenAI()],
        });
        expect(context.brain).toBeDefined();
        expect(context.brain.atom).toBeDefined();
        expect(context.brain.repl).toBeDefined();
      });
    });

    when('[t1] atom imagine is invoked', () => {
      then('atom imagine is called', async () => {
        let imagineWasCalled = false;
        const testAtom = new BrainAtom({
          repo: '__mock_repo__',
          slug: '__mock_atom__',
          description: 'test atom verifying imagine invocation',
          imagine: async (input) => {
            imagineWasCalled = true;
            expect(input.prompt).toEqual('test prompt');
            return input.schema.output.parse({ content: '__mock_response__' });
          },
        });

        const context = genContextBrain({
          atoms: [testAtom],
          repls: [],
        });

        await context.brain.atom.imagine({
          brain: testAtom,
          role: {},
          prompt: 'test prompt',
          schema: { output: outputSchema },
        });

        expect(imagineWasCalled).toBe(true);
      });
    });

    when('[t2] repl imagine is invoked', () => {
      then('repl imagine is called', async () => {
        let imagineWasCalled = false;
        const testRepl = new BrainRepl({
          repo: '__mock_repo__',
          slug: '__mock_repl__',
          description: 'test repl verifying imagine invocation',
          imagine: async (input) => {
            imagineWasCalled = true;
            expect(input.prompt).toEqual('test task');
            return input.schema.output.parse({ content: '__mock_response__' });
          },
        });

        const context = genContextBrain({
          atoms: [],
          repls: [testRepl],
        });

        await context.brain.repl.imagine({
          brain: testRepl,
          role: {},
          prompt: 'test task',
          schema: { output: outputSchema },
        });

        expect(imagineWasCalled).toBe(true);
      });
    });
  });

  given('[case2] role.briefs are passed through to plugins', () => {
    when('[t0] briefs are provided to atom imagine', () => {
      then('briefs are forwarded to plugin imagine', async () => {
        let receivedBriefs: unknown;
        const testAtom = new BrainAtom({
          repo: '__mock_repo__',
          slug: '__mock_atom__',
          description: 'test atom capturing briefs',
          imagine: async (input) => {
            receivedBriefs = input.role.briefs;
            return input.schema.output.parse({ content: '__mock_response__' });
          },
        });

        const mockBriefs = [{ content: 'brief 1' }, { content: 'brief 2' }];
        const context = genContextBrain({ atoms: [testAtom] });

        await context.brain.atom.imagine({
          brain: testAtom,
          role: { briefs: mockBriefs as any },
          prompt: 'test',
          schema: { output: outputSchema },
        });

        expect(receivedBriefs).toEqual(mockBriefs);
      });
    });
  });
});
