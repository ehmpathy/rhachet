import {
  addDuration,
  asUniDateTime,
  isUniDateTime,
  UniDateTime,
} from '@ehmpathy/uni-time';
import { UnexpectedCodePathError } from 'helpful-errors';
import { given, then } from 'test-fns';
import { Empty } from 'type-fns';

import { Stitch } from '../../../domain/objects/Stitch';
import { GStitcher, StitchStepCompute } from '../../../domain/objects/Stitcher';
import { Thread } from '../../../domain/objects/Thread';
import { Threads } from '../../../domain/objects/Threads';
import { GStitcherInferred } from './GStitcherInferred.generic';

describe('GStitcherInferred', () => {
  const stitcherGetTime = new StitchStepCompute<
    GStitcher<Threads<{ main: Empty }>, Empty, UniDateTime>
  >({
    form: 'COMPUTE',
    stitchee: 'main',
    invoke: () =>
      new Stitch({ input: null, output: asUniDateTime(new Date()) }),
  });

  const stitcherAddHours = new StitchStepCompute<
    GStitcher<Threads<{ main: Empty }>, Empty, UniDateTime>
  >({
    form: 'COMPUTE',
    stitchee: 'main',
    invoke: ({ threads }) => {
      const lastStitch =
        threads.main.stitches.slice(-1)[0] ??
        UnexpectedCodePathError.throw('no stitches found on main thread yet.', {
          threads,
        });
      return new Stitch({
        input: lastStitch.output,
        output: addDuration(isUniDateTime.assure(lastStitch.output), {
          hours: 1,
        }),
      });
    },
  });

  given('a sequence of stitchers declared not readonly', () => {
    const sequence = [stitcherGetTime, stitcherAddHours];

    then(
      'there should be a type error at usage, as we enforce readonly consts to maximize type inference, and fail fast when omitted',
      () => {
        // @ts-expect-error: Type 'StitchStepCompute<GStitcher<Threads<{ main: Empty; }>, Empty, string & OfGlossary<"uni-time.UniDateTime">>>[]' does not satisfy the constraint 'readonly [Stitcher<GStitcher>, ...Stitcher<GStitcher>[]]'.
        type Inferred = GStitcherInferred<typeof sequence>;
        expect(true as any as Inferred); // just to satisfy the linter of unused type
      },
    );
  });

  given('a sequence of two compatible stitchers on the same thread', () => {
    const sequence = [stitcherGetTime, stitcherAddHours] as const;
    type Inferred = GStitcherInferred<typeof sequence>;

    then('procedure context should be assignable', () => {
      const assertContext: Inferred['procedure']['context'] = {};
      expect(assertContext).toEqual({});
    });

    then('expected threads should be assignable', () => {
      const threadsExpected: Threads<{ main: Empty }> = {
        main: new Thread({ context: { role: 'main' }, stitches: [] }),
      };
      const threadsInferred: Inferred['threads'] = threadsExpected;
      expect(threadsInferred);
    });

    then('output should match expected shape', () => {
      // positive case
      const assertOutput: Inferred['output'] = asUniDateTime(new Date());
      expect(assertOutput);

      // negative case
      // @ts-expect-error: number is not assignable to UniDateTime
      const expectError: Inferred['output'] = 821;
      expect(expectError);
    });

    then(
      'extra thread SHOULD be assignable',
      { because: 'all of the required threads are still available' },
      () => {
        const threadsExpected: Threads<{ main: Empty; extra: Empty }> = {
          main: new Thread({ context: { role: 'main' }, stitches: [] }),
          extra: new Thread({ context: { role: 'extra' }, stitches: [] }),
        };
        const threadsInferred: Inferred['threads'] = threadsExpected;
        expect(threadsInferred);
      },
    );

    then('missing required thread should not be assignable', () => {
      const threadsExpected: Threads<{ extra: Empty }> = {
        extra: new Thread({ context: { role: 'extra' }, stitches: [] }),
      };

      // @ts-expect-error: Property 'main' is missing in type 'Threads<{ extra: Empty; }>' but required in type 'ThreadsMerged<Threads<{ main: Empty; }>[]>'.ts(2741)
      const threadsInferred: Inferred['threads'] = threadsExpected;
      expect(threadsInferred);
    });

    then('thread with extra context shape SHOULD be assignable', () => {
      const threadsExpected: Threads<{ main: { foo: string } }> = {
        main: new Thread({
          context: { role: 'main', foo: 'unexpected' },
          stitches: [],
        }),
      };

      const threadsInferred: Inferred['threads'] = threadsExpected;
      expect(threadsInferred);
    });
  });

  given('a sequence of stitchers with different thread roles or output', () => {
    const stitcherWithClock = new StitchStepCompute<
      GStitcher<Threads<{ clock: Empty }>, Empty, UniDateTime>
    >({
      form: 'COMPUTE',
      stitchee: 'clock',
      invoke: () =>
        new Stitch({ input: null, output: asUniDateTime(new Date()) }),
    });

    const sequence = [stitcherGetTime, stitcherWithClock] as const;

    then('GStitcherInferred merges thread roles', () => {
      type Inferred = GStitcherInferred<typeof sequence>;

      const keys: (keyof Inferred['threads'])[] = ['main', 'clock'];
      expect(keys).toEqual(expect.arrayContaining(['main', 'clock']));
    });
  });

  given('a sequence of stitchers with varied procedure.contexts', () => {
    const stitcherWithEmptyContext = new StitchStepCompute<
      GStitcher<Threads<{ one: Empty }>, Empty, UniDateTime>
    >({
      form: 'COMPUTE',
      stitchee: 'one',
      invoke: () =>
        new Stitch({ input: null, output: asUniDateTime(new Date()) }),
    });

    const stitcherWithFooContext = new StitchStepCompute<
      GStitcher<Threads<{ two: Empty }>, { foo: number }, UniDateTime>
    >({
      form: 'COMPUTE',
      stitchee: 'two',
      invoke: () =>
        new Stitch({ input: null, output: asUniDateTime(new Date()) }),
    });

    const stitcherWithBarContext = new StitchStepCompute<
      GStitcher<Threads<{ three: Empty }>, { bar: string }, UniDateTime>
    >({
      form: 'COMPUTE',
      stitchee: 'three',
      invoke: () =>
        new Stitch({ input: null, output: asUniDateTime(new Date()) }),
    });

    then(
      'when only one context is defined, it should infer that context',
      () => {
        const sequence = [stitcherWithFooContext] as const;
        type Inferred = GStitcherInferred<typeof sequence>;

        const context: Inferred['procedure']['context'] = { foo: 123 };
        expect(context.foo).toBe(123);
      },
    );

    then('when multiple contexts are defined, it should merge them', () => {
      const sequence = [
        stitcherWithFooContext,
        stitcherWithBarContext,
      ] as const;
      type Inferred = GStitcherInferred<typeof sequence>;

      const context: Inferred['procedure']['context'] = {
        foo: 123,
        bar: 'hello',
      };
      expect(context.foo).toBe(123);
      expect(context.bar).toBe('hello');
    });

    then('when all contexts are Empty, result should be Empty', () => {
      const sequence = [stitcherWithEmptyContext] as const;
      type Inferred = GStitcherInferred<typeof sequence>;

      const context: Inferred['procedure']['context'] = {};
      expect(context).toEqual({});
    });

    then('when mix of Empty and defined, it should merge correctly', () => {
      const sequence = [
        stitcherWithEmptyContext,
        stitcherWithBarContext,
      ] as const;
      type Inferred = GStitcherInferred<typeof sequence>;

      const context: Inferred['procedure']['context'] = {
        bar: 'hello',
      };
      expect(context.bar).toBe('hello');
    });
  });
});
