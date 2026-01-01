import type { BrainRepl } from 'rhachet';

/**
 * .what = rhachet configuration for the test repo
 * .why = test fixture for CLI invokeAct integration tests
 */

// mock brain repl for testing
const mockBrainRepl: BrainRepl = {
  repo: 'anthropic',
  slug: 'claude',
  description: 'mock brain for testing',
  ask: async () => ({ content: 'mock response' }),
  act: async () => ({ result: 'mock result' }),
};

export const rhachetUse = {
  roles: {
    registries: [
      // role registry with tester role
      {
        repo: '.this',
        roles: ['tester'],
      },
    ],
  },
  brains: {
    repls: [mockBrainRepl], // mock brain for tests
  },
};

export default rhachetUse;
