import { given, then } from 'test-fns';
import { Empty } from 'type-fns';

import { genContextLogTrail } from '../../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../../__test_assets__/genContextStitchTrail';
import { Stitch } from '../../../domain/objects/Stitch';
import { StitchStepCompute } from '../../../domain/objects/StitchStep';
import { GStitcher } from '../../../domain/objects/Stitcher';
import { Threads } from '../../../domain/objects/Threads';
import { genThread } from '../../thread/genThread';
import { GStitcherInferredFromFanout } from './GStitcherInferredFromFanout.generic';

const stitcherComputeRandom = new StitchStepCompute<
  GStitcher<Threads<{ main: Empty }>, GStitcher['context'], number>
>({
  slug: `compute-random`,
  form: 'COMPUTE',
  readme: null,
  stitchee: 'main',
  invoke: () => ({
    input: null,
    output: Math.floor(Math.random() * 100),
  }),
});

const stitcherAddAll = new StitchStepCompute<
  GStitcher<Threads<{ main: Empty }, 'multiple'>, GStitcher['context'], number>
>({
  slug: 'sum-up',
  form: 'COMPUTE',
  readme: null,
  stitchee: 'main',
  invoke: ({ threads }) => {
    const numbers = threads.main.peers.map((t) => {
      const last = t.stitches.at(-1);
      if (!last) throw new Error('Missing stitch on thread');
      return last.output as number;
    });

    const sum = numbers.reduce((a, b) => a + b, 0);

    return {
      input: numbers,
      output: sum,
    };
  },
});

describe('GStitcherInferredFromFanout', () => {
  given('two parallel single-threaded compute steps', () => {
    const parallels = [stitcherComputeRandom, stitcherComputeRandom] as const;
    const concluder = stitcherAddAll;

    type Inferred = GStitcherInferredFromFanout<
      typeof parallels,
      typeof concluder
    >;

    then(
      'it should merge the thread maps and infer the output from the concluder',
      () => {
        // prove can assign to threads
        const threads: Inferred['threads'] = {
          main: genThread({ role: 'main' }),
        };
        expect(threads);

        const context: Inferred['context'] = {
          ...genContextLogTrail(),
          ...genContextStitchTrail(),
        };
        expect(context);

        const output: Inferred['output'] = 42;
        expect(typeof output).toBe('number');
      },
    );

    then('it should error if threads has unknown keys', () => {
      const badThreads: Inferred['threads'] = {
        // @ts-expect-error unknown thread key "notreal"
        notreal: genThread({ role: 'notreal' }),
      };
      expect(badThreads);
    });

    then('it should error if context is missing required fields', () => {
      // @ts-expect-error missing ContextLogTrail + ContextStitchTrail
      const badContext: Inferred['context'] = {};
      expect(badContext);
    });

    then('it should error if output is not a number', () => {
      // @ts-expect-error string is not assignable to number
      const badOutput: Inferred['output'] = 'not-a-number';
      expect(badOutput);
    });
  });
});
