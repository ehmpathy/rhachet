import { given, then, when } from 'test-fns';

import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import { Role } from '@src/domain.objects/Role';

import { actorAsk } from './actorAsk';

// mock getRoleBriefs to avoid .agent/ directory requirement in unit tests
jest.mock('@src/domain.operations/role/getRoleBriefs', () => ({
  getRoleBriefs: jest.fn().mockResolvedValue([]),
}));

describe('actorAsk', () => {
  // create test role
  const testRole = new Role({
    slug: 'tester',
    name: 'Tester',
    purpose: 'test role for unit tests',
    readme: { uri: '.test/readme.md' }, // 'a role for testing actorAsk',
    traits: [],
    skills: {
      dirs: { uri: '.agent/repo=.this/role=tester/skills' },
      refs: [],
    },
    briefs: { dirs: { uri: '.agent/repo=.this/role=tester/briefs' } },
  });

  // create mock brain
  // note: brain.ask returns { response: string } object, not raw string
  const mockBrain = {
    repo: 'anthropic',
    slug: 'claude',
    description: 'mock brain for testing',
    act: jest.fn().mockResolvedValue({ summary: 'test summary' }),
    ask: jest.fn().mockResolvedValue({ response: 'hello from the brain' }),
  } as unknown as BrainRepl;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] a valid role and brain', () => {
    when('[t0] actorAsk is called with a prompt', () => {
      then('invokes brain.ask with the prompt', async () => {
        await actorAsk({
          role: testRole,
          brain: mockBrain,
          prompt: 'what is the meaning of life?',
        });

        expect(mockBrain.ask).toHaveBeenCalledTimes(1);
        expect(mockBrain.ask).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: 'what is the meaning of life?',
          }),
        );
      });

      then('returns the response from brain.ask', async () => {
        const result = await actorAsk({
          role: testRole,
          brain: mockBrain,
          prompt: 'hello',
        });

        expect(result).toEqual({ response: 'hello from the brain' });
      });
    });
  });

  given('[case2] brain.ask returns a string', () => {
    when('[t0] actorAsk is called', () => {
      then('wraps response in { response: string } object', async () => {
        const result = await actorAsk({
          role: testRole,
          brain: mockBrain,
          prompt: 'test',
        });

        expect(result).toHaveProperty('response');
        expect(typeof result.response).toEqual('string');
      });
    });
  });
});
