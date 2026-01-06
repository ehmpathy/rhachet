import { sleep } from 'iso-time';
import { given, then, when } from 'test-fns';
import type { Empty } from 'type-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import type { GStitcher } from '@src/domain.objects/Stitcher';
import { StitchStepCompute } from '@src/domain.objects/StitchStep';
import type { Threads } from '@src/domain.objects/Threads';
import { genContextStitchTrail } from '@src/domain.operations/context/genContextStitchTrail';
import { genThread } from '@src/domain.operations/thread/genThread';

import { genStitchCycle } from './compose/genStitchCycle';
import { enweaveOneCycle, StitcherHaltedError } from './enweaveOneCycle';

describe('enweaveOneCycle', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
  };

  given('a simple repeatee that gets released', () => {
    const repeatee = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], 'A'>
    >({
      slug: 'repeatee',
      readme: 'Repeat logic',
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'A' }),
    });

    const decider = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        { choice: 'release' }
      >
    >({
      slug: 'decider',
      readme: 'Choose to stop after one',
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: { choice: 'release' } }),
    });

    const stitcher = genStitchCycle({
      slug: 'release-after-one',
      readme: null,
      repeatee,
      decider,
    });

    when('run once and released', () => {
      const threads: Threads<{ main: Empty }> = {
        main: genThread({ role: 'main' }),
      };

      then('it should return after one cycle with A', async () => {
        const result = await enweaveOneCycle({ stitcher, threads }, context);
        expect(result.stitch.output).toBe('A');
        expect(result.threads.main.stitches.length).toBe(2);
      });
    });
  });

  given('a cycle that repeats twice then releases', () => {
    let callCount = 0;
    const repeatee = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], string>
    >({
      slug: 'repeatee-twice',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: `call-${++callCount}` }),
    });

    const decider = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        { choice: 'repeat' | 'release' }
      >
    >({
      slug: 'decider-twice',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({
        input: null,
        output: { choice: callCount === 2 ? 'release' : 'repeat' },
      }),
    });

    const stitcher = genStitchCycle({
      slug: 'repeat-twice-then-release',
      readme: null,
      repeatee,
      decider,
    });

    when('run until released', () => {
      const threads: Threads<{ main: Empty }> = {
        main: genThread({ role: 'main' }),
      };

      then(
        'it should run repeatee twice and return second output',
        async () => {
          const result = await enweaveOneCycle({ stitcher, threads }, context);
          expect(result.stitch.output).toBe('call-2');
          expect(result.threads.main.stitches.length).toBe(4); // 2 repeatee + 2 decider
        },
      );
    });
  });

  given('a halting decider', () => {
    const repeatee = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], 'A'>
    >({
      slug: 'rep',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'A' }),
    });

    const decider = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        { choice: 'halt' }
      >
    >({
      slug: 'halt-me',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: { choice: 'halt' } }),
    });

    const stitcher = genStitchCycle({
      slug: 'halt-once',
      readme: null,
      repeatee,
      decider,
    });

    when('run and told to halt', () => {
      const threads: Threads<{ main: Empty }> = {
        main: genThread({ role: 'main' }),
      };

      then(
        'it should throw a StitcherHaltedError(reason=DECIDED)',
        async () => {
          await expect(
            enweaveOneCycle({ stitcher, threads }, context),
          ).rejects.toThrow(/DECIDED/);
        },
      );
    });
  });

  given('a repeatee that never releases, with halter on repetitions', () => {
    const stitcherRepeatee = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], string>
    >({
      slug: 'infinite-step',
      readme: 'Always increment',
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'tick' }),
    });

    const stitcherDecider = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        { choice: 'repeat' }
      >
    >({
      slug: 'always-repeat',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: { choice: 'repeat' } }),
    });

    const stitcherCycle = genStitchCycle({
      slug: 'cycle-infinite-haltered',
      readme: null,
      repeatee: stitcherRepeatee,
      decider: stitcherDecider,
      halter: { threshold: { repetitions: 5 } },
    });

    when('executed', () => {
      const threads: Threads<{ main: Empty }> = {
        main: genThread({ role: 'main' }),
      };

      then('it should halt after 5 repetitions', async () => {
        await expect(
          enweaveOneCycle({ stitcher: stitcherCycle, threads }, context),
        ).rejects.toThrow(StitcherHaltedError);
      });
    });
  });

  given('a repeatee that exceeds time halter', () => {
    const stitcherRepeatee = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], string>
    >({
      slug: 'sleepy-step',
      readme: 'Sleeps each run',
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: async () => {
        await sleep({ seconds: 2 });
        return { input: null, output: 'zzz' };
      },
    });

    const stitcherDecider = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        { choice: 'repeat' }
      >
    >({
      slug: 'always-repeat-sleepy',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: { choice: 'repeat' } }),
    });

    const stitcherCycle = genStitchCycle({
      slug: 'cycle-timeout-halter',
      readme: null,
      repeatee: stitcherRepeatee,
      decider: stitcherDecider,
      halter: { threshold: { duration: { seconds: 3 } } },
    });

    when('executed', () => {
      const threads: Threads<{ main: Empty }> = {
        main: genThread({ role: 'main' }),
      };

      then('it should halt due to time threshold', async () => {
        await expect(
          enweaveOneCycle({ stitcher: stitcherCycle, threads }, context),
        ).rejects.toThrow(StitcherHaltedError);
      });
    });
  });
});
