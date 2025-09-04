import {
  addDuration,
  asUniDateTime,
  isUniDateTime,
  UniDateTime,
} from '@ehmpathy/uni-time';
import { ContextLogTrail } from 'as-procedure';
import { UnexpectedCodePathError } from 'helpful-errors';
import { given, then, when } from 'test-fns';
import { Empty } from 'type-fns';

import { genContextLogTrail } from '../../../.test/genContextLogTrail';
import { Stitch } from '../../../domain/objects/Stitch';
import { StitchStepCompute } from '../../../domain/objects/StitchStep';
import { GStitcher, Stitcher } from '../../../domain/objects/Stitcher';
import { Thread } from '../../../domain/objects/Thread';
import { Threads } from '../../../domain/objects/Threads';
import { genContextStitchTrail } from '../../context/genContextStitchTrail';
import { ContextStitchTrail } from '../../stitch/withStitchTrail';
import { GStitcherInferredFromRoute } from './GStitcherInferredFromRoute.generic';

describe('GStitcherInferredFromRoute', () => {
  const exampleContext = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
  };

  const stitcherGetTime = new StitchStepCompute<
    GStitcher<Threads<{ main: Empty }>, GStitcher['context'], UniDateTime>
  >({
    form: 'COMPUTE',
    readme: null,
    slug: 'get-time',
    stitchee: 'main',
    invoke: () => ({ input: null, output: asUniDateTime(new Date()) }),
  });

  const stitcherAddHours = new StitchStepCompute<
    GStitcher<Threads<{ main: Empty }>, GStitcher['context'], UniDateTime>
  >({
    form: 'COMPUTE',
    readme: null,
    slug: 'add-time',
    stitchee: 'main',
    invoke: ({ threads }) => {
      const lastStitch =
        threads.main.stitches.slice(-1)[0] ??
        UnexpectedCodePathError.throw('no stitches found on main thread yet.', {
          threads,
        });
      return {
        input: lastStitch.output,
        output: addDuration(isUniDateTime.assure(lastStitch.output), {
          hours: 1,
        }),
      };
    },
  });

  given('a sequence of stitchers declared not readonly', () => {
    const sequence = [stitcherGetTime, stitcherAddHours];

    then(
      'there should be a type error at usage, as we enforce readonly consts to maximize type inference, and fail fast when omitted',
      () => {
        // @ts-expect-error: Type 'StitchStepCompute<GStitcher<Threads<{ main: Empty; }>, Empty, string & OfGlossary<"uni-time.UniDateTime">>>[]' does not satisfy the constraint 'readonly [Stitcher<GStitcher>, ...Stitcher<GStitcher>[]]'.
        type Inferred = GStitcherInferredFromRoute<typeof sequence>;
        expect(true as any as Inferred); // just to satisfy the linter of unused type
      },
    );
  });

  given('a sequence of two compatible stitchers on the same thread', () => {
    const sequence = [stitcherGetTime, stitcherAddHours] as const;
    type Inferred = GStitcherInferredFromRoute<typeof sequence>;

    then('procedure context should be assignable', () => {
      const assertContext: Inferred['context'] = { ...exampleContext };
      expect(assertContext);
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
      GStitcher<Threads<{ clock: Empty }>, GStitcher['context'], UniDateTime>
    >({
      form: 'COMPUTE',
      readme: null,
      slug: 'with-clock',
      stitchee: 'clock',
      invoke: () => ({ input: null, output: asUniDateTime(new Date()) }),
    });

    const sequence = [stitcherGetTime, stitcherWithClock] as const;

    then('GStitcherInferred merges thread roles', () => {
      type Inferred = GStitcherInferredFromRoute<typeof sequence>;

      const keys: (keyof Inferred['threads'])[] = ['main', 'clock'];
      expect(keys).toEqual(expect.arrayContaining(['main', 'clock']));
    });
  });

  given('a custom context', () => {
    when('use any stitcher', () => {
      type StitcherWithCustomContext = Stitcher<
        GStitcher<
          Threads<{ two: Empty }>,
          { foo: number } & GStitcher['context'],
          UniDateTime
        >
      >;

      then(
        'when only one context is defined, it should infer that context',
        () => {
          type Inferred = GStitcherInferredFromRoute<
            readonly [StitcherWithCustomContext]
          >;

          const context: Inferred['context'] = { foo: 123, ...exampleContext };
          expect(context.foo).toBe(123);

          // @ts-expect-error: 'bob' does not exist in type '{ foo: number; log: LogMethods
          const contextFail: Inferred['context'] = { bob: 123 };
          expect(contextFail);
        },
      );
    });

    when('use a compute step ', () => {
      type StitchStepWithCustomContext = StitchStepCompute<
        GStitcher<
          Threads<{ two: Empty }>,
          { foo: number } & GStitcher['context'],
          UniDateTime
        >
      >;

      then(
        'when only one context is defined, it should infer that context',
        () => {
          type Inferred = GStitcherInferredFromRoute<
            readonly [StitchStepWithCustomContext]
          >;

          const context: Inferred['context'] = { foo: 123, ...exampleContext };
          expect(context.foo).toBe(123);

          // @ts-expect-error: 'bob' does not exist in type '{ foo: number; log: LogMethods
          const contextFail: Inferred['context'] = { bob: 123 };
          expect(contextFail);
        },
      );
    });
  });

  given('a sequence of stitchers with varied procedure.contexts', () => {
    const stitcherWithEmptyContext = new StitchStepCompute<
      GStitcher<Threads<{ one: Empty }>, GStitcher['context'], UniDateTime>
    >({
      form: 'COMPUTE',
      readme: null,
      slug: 'slug',
      stitchee: 'one',
      invoke: () => ({ input: null, output: asUniDateTime(new Date()) }),
    });

    const stitcherWithFooContext = new StitchStepCompute<
      GStitcher<
        Threads<{ two: Empty }>,
        { foo: number } & ContextLogTrail & ContextStitchTrail,
        UniDateTime
      >
    >({
      form: 'COMPUTE',
      readme: null,
      slug: 'slug',
      stitchee: 'two',
      invoke: () => ({ input: null, output: asUniDateTime(new Date()) }),
    });

    then(
      'when only one context is defined, it should infer that context',
      () => {
        const sequence = [stitcherWithFooContext] as const;
        type Inferred = GStitcherInferredFromRoute<typeof sequence>;

        const context: Inferred['context'] = { foo: 123, ...exampleContext };
        expect(context.foo).toBe(123);

        // @ts-expect-error: 'bob' does not exist in type '{ foo: number;
        const failure: Inferred['context'] = { bob: 123, ...exampleContext };
        expect(failure);
      },
    );

    const stitcherWithBarContext = new StitchStepCompute<
      GStitcher<
        Threads<{ three: Empty }>,
        { bar: string } & GStitcher['context'],
        UniDateTime
      >
    >({
      form: 'COMPUTE',
      readme: null,
      slug: 'slug',
      stitchee: 'three',
      invoke: () => ({ input: null, output: asUniDateTime(new Date()) }),
    });
    then('when multiple contexts are defined, it should merge them', () => {
      const sequence = [
        stitcherWithFooContext,
        stitcherWithBarContext,
      ] as const;
      type Inferred = GStitcherInferredFromRoute<typeof sequence>;

      const context: Inferred['context'] = {
        foo: 123,
        bar: 'hello',
        ...exampleContext,
      };
      expect(context.foo).toBe(123);
      expect(context.bar).toBe('hello');
    });

    then('when all contexts are Empty, result should be Empty', () => {
      const sequence = [stitcherWithEmptyContext] as const;
      type Inferred = GStitcherInferredFromRoute<typeof sequence>;

      const context: Inferred['context'] = { ...exampleContext };
      expect(context);
    });

    then('when mix of Empty and defined, it should merge correctly', () => {
      const sequence = [
        stitcherWithEmptyContext,
        stitcherWithBarContext,
      ] as const;
      type Inferred = GStitcherInferredFromRoute<typeof sequence>;

      const context: Inferred['context'] = {
        bar: 'hello',
        ...exampleContext,
      };
      expect(context.bar).toBe('hello');
    });
  });
});
