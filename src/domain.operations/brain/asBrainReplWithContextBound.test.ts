import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useThen, when } from 'test-fns';
import { z } from 'zod';

import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';
import { BrainRepl } from '@src/domain.objects/BrainRepl';
import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { asBrainReplWithContextBound } from './asBrainReplWithContextBound';

/**
 * .what = the repl door, as a role package reaches it: both `ask` and `act` pass the
 *   depth scope, so the supplier reads the child depth and a reviewer caller is refused
 * .why = the scope itself is proven in `withCloneSpawnDepthScope.test.ts`; this pins the
 *   wire. `act` grants the brain a shell (Q4), so an `act` left outside the scope would
 *   reopen the door the wish closes, with every scope test still green
 *
 * .note = the caller's tty is pinned to "none" so the case reads the depth var, as a
 *   brain's tool shell does, whatever terminal runs the suite
 */
describe('asBrainReplWithContextBound', () => {
  const ttyBefore = process.stdin.isTTY;
  const envBefore = { ...process.env };
  const keys = [
    CLONE_ENV_KEYS.depth,
    CLONE_ENV_KEYS.leaf,
    CLONE_ENV_KEYS.serial,
    CLONE_ENV_KEYS.socket,
  ];
  beforeAll(() => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      configurable: true,
    });
  });
  afterAll(() => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: ttyBefore,
      configurable: true,
    });
    for (const key of keys) {
      delete process.env[key];
      if (envBefore[key] !== undefined) process.env[key] = envBefore[key];
    }
  });

  // a supplier stub that records the env it reads at call time, as a real supplier does
  const genRecorderRepl = () => {
    const mocked = genMockedBrainRepl();
    const seen: Array<{
      door: 'ask' | 'act';
      depth: string | undefined;
      serial: string | undefined;
    }> = [];
    const brain = new BrainRepl({
      repo: mocked.repo,
      slug: mocked.slug,
      description: mocked.description,
      spec: mocked.spec,
      ask: async (input, context) => {
        seen.push({
          door: 'ask',
          depth: process.env[CLONE_ENV_KEYS.depth],
          serial: process.env[CLONE_ENV_KEYS.serial],
        });
        return mocked.ask(input, context);
      },
      act: async (input, context) => {
        seen.push({
          door: 'act',
          depth: process.env[CLONE_ENV_KEYS.depth],
          serial: process.env[CLONE_ENV_KEYS.serial],
        });
        return mocked.act(input, context);
      },
    });
    return { brain: asBrainReplWithContextBound(brain, {}), seen };
  };
  const replInput = {
    role: {},
    prompt: 'review this',
    schema: { output: z.object({ content: z.string() }) },
  };

  given('[case1] a caller at depth 0', () => {
    when('[t0] it calls ask, then act', () => {
      const result = useThen('both calls run', async () => {
        process.env[CLONE_ENV_KEYS.depth] = '0';
        process.env[CLONE_ENV_KEYS.serial] = 'serial-parent';
        const { brain, seen } = genRecorderRepl();
        await brain.ask(replInput);
        await brain.act(replInput);
        return { seen, depthAfter: process.env[CLONE_ENV_KEYS.depth] };
      });

      then('the supplier reads depth 1 through ask', () => {
        expect(result.seen[0]).toEqual({
          door: 'ask',
          depth: '1',
          serial: undefined,
        });
      });

      then('the supplier reads depth 1 through act', () => {
        expect(result.seen[1]).toEqual({
          door: 'act',
          depth: '1',
          serial: undefined,
        });
      });

      then('the caller env is restored after the calls', () => {
        expect(result.depthAfter).toEqual('0');
      });
    });
  });

  given('[case2] a reviewer caller — it carries the leaf mark', () => {
    when('[t0] it calls ask', () => {
      then('it is refused as a constraint, and no brain runs', async () => {
        process.env[CLONE_ENV_KEYS.depth] = '1';
        process.env[CLONE_ENV_KEYS.leaf] = '1';
        const { brain, seen } = genRecorderRepl();
        const error = await getError(() => brain.ask(replInput));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('a reviewer clone may not spawn');
        expect(seen).toEqual([]);
        // the refusal a review skill's caller reads, rendered whole for review
        expect(error.message).toMatchSnapshot();
      });
    });

    when('[t1] it calls act', () => {
      then('it is refused as a constraint, and no brain runs', async () => {
        process.env[CLONE_ENV_KEYS.depth] = '1';
        process.env[CLONE_ENV_KEYS.leaf] = '1';
        const { brain, seen } = genRecorderRepl();
        const error = await getError(() => brain.act(replInput));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('a reviewer clone may not spawn');
        expect(seen).toEqual([]);
        // the refusal a review skill's caller reads, rendered whole for review
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('[case3] a work clone at depth 1 — a driver with no tty', () => {
    // 🔴 the #577 defect: the old absolute cap refused this caller's every review
    when('[t0] it calls ask', () => {
      const result = useThen('the call runs', async () => {
        process.env[CLONE_ENV_KEYS.depth] = '1';
        delete process.env[CLONE_ENV_KEYS.leaf];
        const { brain, seen } = genRecorderRepl();
        await brain.ask(replInput);
        return { seen };
      });

      then('the supplier reads depth 2', () => {
        expect(result.seen[0]?.depth).toEqual('2');
      });
    });
  });
});
