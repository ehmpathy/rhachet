import { given, then, when } from 'test-fns';

import { describeBrainLiveOnDemand } from './describeBrainLiveOnDemand';

/**
 * .what = fake jest globals that record each registration
 * .why = observe what the gate registers, with no real describe or todo
 */
const genFakeJestGlobals = (input: { env: NodeJS.ProcessEnv }) => {
  const calls: { kind: 'describe' | 'skip' | 'todo'; name: string }[] = [];
  const describeFake = Object.assign(
    (name: string, _fn: () => void) => {
      calls.push({ kind: 'describe', name });
    },
    {
      skip: (name: string, _fn: () => void) => {
        calls.push({ kind: 'skip', name });
      },
    },
  );
  const testFake = {
    todo: (name: string) => {
      calls.push({ kind: 'todo', name });
    },
  };
  return {
    calls,
    context: { env: input.env, describe: describeFake, test: testFake },
  };
};

describe('describeBrainLiveOnDemand', () => {
  given('[case1] an env with no BRAIN_LIVE_SCOPE', () => {
    when('[t0] a suite is gated', () => {
      then('it skips the suite under its own title, beside a todo row that names the flag', () => {
        const fake = genFakeJestGlobals({ env: {} });
        describeBrainLiveOnDemand('actorAsk', () => {}, fake.context);
        expect(fake.calls).toEqual([
          {
            kind: 'todo',
            name: '[gated: tier-3 live brain] actorAsk — run with rhx test.brain.live, which sets BRAIN_LIVE_SCOPE=all',
          },
          { kind: 'skip', name: 'actorAsk' },
        ]);
      });
    });
  });

  given('[case2] an env with BRAIN_LIVE_SCOPE=all', () => {
    when('[t0] a suite is gated', () => {
      then('it runs the suite under its own title, with no todo row', () => {
        const fake = genFakeJestGlobals({ env: { BRAIN_LIVE_SCOPE: 'all' } });
        describeBrainLiveOnDemand('actorAsk', () => {}, fake.context);
        expect(fake.calls).toEqual([{ kind: 'describe', name: 'actorAsk' }]);
      });
    });
  });
});