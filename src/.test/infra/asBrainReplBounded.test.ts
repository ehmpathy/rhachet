import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import type { BrainRepl } from '@src/domain.objects/BrainRepl';

import { asBrainReplBounded } from './asBrainReplBounded';

/**
 * .what = a fake repl whose calls settle after a set delay
 * .why = the bound is a timer race, so a fake that never reaches a vendor proves it
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
    when('[t0] ask and act are called', () => {
      then('each returns the answer of the repl', async () => {
        expect(await brain.ask(askInput)).toEqual({ output: 'asked' });
        expect(await brain.act(askInput)).toEqual({ output: 'acted' });
      });
    });
  });

  given('[case2] a repl that hangs past the bound', () => {
    const brain = asBrainReplBounded({
      brain: genFakeRepl({ delayMs: 2_000 }),
      waitMs: 1_000,
    });
    when('[t0] ask is called', () => {
      then('it fails with a MalfunctionError that names the causes', async () => {
        const error = await getError(brain.ask(askInput));
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain('the repl brain gave no answer');
        expect(error.message).toContain('rate limit');
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
