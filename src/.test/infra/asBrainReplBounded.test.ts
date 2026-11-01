import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import type { BrainRepl } from '@src/domain.objects/BrainRepl';

import { asBrainReplBounded } from './asBrainReplBounded';

/**
 * .what = a fake repl whose calls settle after a set delay
 * .why = the bound is a timer race, so a fake that never reaches a vendor proves it
 * .note = cast: the fake carries only the fields the bound reads (repo, slug, ask, act);
 *   a full BrainRepl's spec and output generics play no part in the race
 */
const genFakeRepl = (input: { delayMs: number }): BrainRepl =>
  ({
    repo: 'fake',
    slug: 'repl/slow',
    description: 'a fake repl for the bound test',
    spec: {},
    ask: () =>
      new Promise((done) =>
        setTimeout(() => done({ output: 'asked' }), input.delayMs),
      ),
    act: () =>
      new Promise((done) =>
        setTimeout(() => done({ output: 'acted' }), input.delayMs),
      ),
  }) as unknown as BrainRepl;

// cast: the fake repl never reads its input, so a minimal ask input stands in for a full one
const askInput = {
  role: {},
  prompt: 'say ok',
  schema: { output: {} },
} as unknown as Parameters<BrainRepl['ask']>[0];

describe('asBrainReplBounded', () => {
  given('[case1] a repl that answers inside the bound', () => {
    const brain = asBrainReplBounded({
      brain: genFakeRepl({ delayMs: 10 }),
      waitMs: 500,
    });
    when('[t0] ask is called', () => {
      then('it returns the answer of the repl', async () => {
        expect(await brain.ask(askInput)).toEqual({ output: 'asked' });
      });
    });
    when('[t1] act is called', () => {
      then('it returns the answer of the repl', async () => {
        expect(await brain.act(askInput)).toEqual({ output: 'acted' });
      });
    });
  });

  given('[case2] a repl that hangs past the bound, with no api key in its env', () => {
    const brain = asBrainReplBounded(
      { brain: genFakeRepl({ delayMs: 2_000 }), waitMs: 1_000 },
      { env: {} },
    );
    when('[t0] ask is called', () => {
      // .note = useBeforeAll hands back a proxy over a Record, so the error rides a field
      const result = useBeforeAll(async () => ({
        error: await getError(brain.ask(askInput)),
      }));

      then('it fails with a MalfunctionError', () => {
        expect(result.error).toBeInstanceOf(MalfunctionError);
      });

      then('it says the repl gave no answer, and names a rate limit', () => {
        expect(result.error.message).toContain('the repl brain gave no answer');
        expect(result.error.message).toContain('rate limit');
        expect(result.error.message).toMatchSnapshot();
      });

      then('it names the box login the repl used', () => {
        expect(result.error.message).toContain('the repl used the box login');
      });

      then('it names the probe for the box login', () => {
        expect(result.error.message).toContain(
          'rhx claude.vendor.probe --via login',
        );
      });
    });
  });

  given('[case3] a repl that hangs past the bound, with an api key in its env', () => {
    const brain = asBrainReplBounded(
      { brain: genFakeRepl({ delayMs: 2_000 }), waitMs: 1_000 },
      { env: { ANTHROPIC_API_KEY: 'sk-ant-api-fake' } },
    );
    when('[t0] ask is called', () => {
      const result = useBeforeAll(async () => ({
        error: await getError(brain.ask(askInput)),
      }));

      then('it fails with a MalfunctionError', () => {
        expect(result.error).toBeInstanceOf(MalfunctionError);
      });

      then('it names the api key it billed', () => {
        expect(result.error.message).toContain(
          'ANTHROPIC_API_KEY in the test env, so the repl billed the api',
        );
        expect(result.error.message).toMatchSnapshot();
      });

      then('it names the probe for the test key', () => {
        expect(result.error.message).toContain(
          'rhx claude.vendor.probe --via keyrack-test',
        );
      });

      then('it never prints the key value', () => {
        expect(result.error.message).not.toContain('sk-ant-api-fake');
      });

      then('it never sends the human to the box login probe', () => {
        expect(result.error.message).not.toContain('--via login');
      });
    });
  });
});
