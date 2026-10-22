import { given, then, useThen, when } from 'test-fns';
import { z } from 'zod';

import { genMockedBrainAtom } from '@src/.test.assets/genMockedBrainAtom';
import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { asBrainAtomWithContextBound } from './asBrainAtomWithContextBound';

/**
 * .what = the atom door passes for a leaf too: an atom is one api request, with no process
 *   and no tools, so it is not a spawn and the leaf bound does not apply (F3, ruled by the wisher)
 * .why = the repl door is clamped to refuse a leaf caller. this clamps the other half: should
 *   the atom door ever be routed through the depth scope, every leaf's atom call would be
 *   refused, and the vision's case=2 [t2] would break with no other test red
 *
 * .note = the caller's tty is pinned to "none" so the case reads the depth var, as a brain's
 *   tool shell does, whatever terminal runs the suite
 */
describe('asBrainAtomWithContextBound', () => {
  const ttyBefore = process.stdin.isTTY;
  const envBefore = { ...process.env };
  const keys = [
    CLONE_ENV_KEYS.depth,
    CLONE_ENV_KEYS.leaf,
    CLONE_ENV_KEYS.serial,
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
  const genRecorderAtom = () => {
    const mocked = genMockedBrainAtom({ content: 'reviewed' });
    const seen: Array<{
      depth: string | undefined;
      serial: string | undefined;
    }> = [];
    const brain = new BrainAtom({
      repo: mocked.repo,
      slug: mocked.slug,
      description: mocked.description,
      spec: mocked.spec,
      ask: async (input, context) => {
        seen.push({
          depth: process.env[CLONE_ENV_KEYS.depth],
          serial: process.env[CLONE_ENV_KEYS.serial],
        });
        return mocked.ask(input, context);
      },
    });
    return { brain: asBrainAtomWithContextBound(brain, {}), seen };
  };
  const atomInput = {
    role: {},
    prompt: 'review this',
    schema: { output: z.object({ content: z.string() }) },
  };

  given('[case1] a leaf clone at depth 1 — it carries the leaf mark', () => {
    when('[t0] its skill calls one atom', () => {
      const result = useThen('the call completes', async () => {
        process.env[CLONE_ENV_KEYS.depth] = '1';
        process.env[CLONE_ENV_KEYS.leaf] = '1';
        process.env[CLONE_ENV_KEYS.serial] = 'serial-leaf';
        const { brain, seen } = genRecorderAtom();
        const reply = await brain.ask(atomInput);
        return { reply, seen };
      });

      then('the atom replies — an atom is not a clone', () => {
        expect(result.reply.output).toEqual({ content: 'reviewed' });
      });

      then('the supplier ran once, with the caller env as it was', () => {
        expect(result.seen).toEqual([{ depth: '1', serial: 'serial-leaf' }]);
      });
    });
  });
});
