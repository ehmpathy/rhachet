import { given, then } from 'test-fns';
import type { Empty } from 'type-fns';

import { genContextLogTrail } from '../../../.test/genContextLogTrail';
import type { GStitcher } from '../../../domain/objects/Stitcher';
import { StitchStepCompute } from '../../../domain/objects/StitchStep';
import type { Threads } from '../../../domain/objects/Threads';
import { genContextStitchTrail } from '../../context/genContextStitchTrail';
import { genThread } from '../../thread/genThread';
import { asStitcher } from './asStitcher';
import type { GStitcherInferredFromCycle } from './GStitcherInferredFromCycle.generic';
import { genStitchRoute } from './genStitchRoute';

describe('GStitcherInferredFromCycle', () => {
  given('a single compute step as the repeatee', () => {
    const repeatee = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        { foo: number } & GStitcher['context'],
        'done'
      >
    >({
      slug: 'do-one-thing',
      form: 'COMPUTE',
      readme: null,
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'done' }),
    });

    const decider = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        { flag: boolean } & GStitcher['context'],
        { choice: 'repeat' | 'release' | 'halt' }
      >
    >({
      slug: 'decide-again',
      form: 'COMPUTE',
      readme: null,
      stitchee: 'main',
      invoke: () => ({ input: null, output: { choice: 'release' } }),
    });

    type Inferred = GStitcherInferredFromCycle<typeof repeatee, typeof decider>;

    then('it should merge threads correctly', () => {
      const threads: Inferred['threads'] = {
        main: genThread({ role: 'main' }),
      };
      expect(threads);

      const badThreads: Inferred['threads'] = {
        // @ts-expect-error: extra thread
        foo: genThread({ role: 'foo' }),
      };
      expect(badThreads);
    });

    then('it should merge context from both steps', () => {
      const context: Inferred['context'] = {
        foo: 123,
        flag: true,
        ...genContextLogTrail(),
        ...genContextStitchTrail(),
      };
      expect(context);

      // @ts-expect-error: missing context key 'foo'
      const invalid: Inferred['context'] = {
        flag: true,
      };
      expect(invalid);
    });

    then('it should infer the output from repeatee', () => {
      const result: Inferred['output'] = 'done';
      expect(result);

      // @ts-expect-error: incorrect type
      const invalid: Inferred['output'] = 'not-done';
      expect(invalid);
    });
  });

  given('a repeatee route and a decider', () => {
    const stepA = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        { a: string } & GStitcher['context'],
        'A'
      >
    >({
      slug: 'step-a',
      form: 'COMPUTE',
      readme: null,
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'A' }),
    });

    const stepB = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        { b: number } & GStitcher['context'],
        'B'
      >
    >({
      slug: 'step-b',
      form: 'COMPUTE',
      readme: null,
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'B' }),
    });

    const repeatee = asStitcher(
      genStitchRoute({
        slug: 'route:combo',
        readme: null,
        sequence: [stepA, stepB],
      }),
    );

    const decider = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        { d: Date } & GStitcher['context'],
        { choice: 'repeat' | 'release' | 'halt' }
      >
    >({
      slug: 'decide-loop',
      form: 'COMPUTE',
      readme: null,
      stitchee: 'main',
      invoke: () => ({
        input: null,
        output: { choice: 'release' },
      }),
    });

    type Inferred = GStitcherInferredFromCycle<typeof repeatee, typeof decider>;

    then('it should merge threads correctly', () => {
      const threads: Inferred['threads'] = {
        main: genThread({ role: 'main' }),
      };
      expect(threads);

      const badThreads: Inferred['threads'] = {
        // @ts-expect-error: extra thread not allowed
        foo: genThread({ role: 'foo' }),
      };
      expect(badThreads);
    });

    then('it should merge context from both repeatee and decider', () => {
      const context: Inferred['context'] = {
        a: 'alpha',
        b: 123,
        d: new Date(),
        ...genContextLogTrail(),
        ...genContextStitchTrail(),
      };
      expect(context);

      // @ts-expect-error: missing 'b'
      const missingContext: Inferred['context'] = {
        a: 'alpha',
        d: new Date(),
      };
      expect(missingContext);

      const badContext: Inferred['context'] = {
        a: 'alpha',
        b: 123,
        // @ts-expect-error: wrong type for 'd'
        d: 'not-a-date',
      };
      expect(badContext);
    });

    then('it should infer output from repeatee', () => {
      const output: Inferred['output'] = 'B';
      expect(output);

      // @ts-expect-error: invalid output
      const badOutput: Inferred['output'] = 42;
      expect(badOutput);
    });
  });
});
