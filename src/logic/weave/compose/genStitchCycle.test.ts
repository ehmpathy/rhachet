import { given, then, when } from 'test-fns';
import type { Empty } from 'type-fns';

import { genContextLogTrail } from '../../../.test/genContextLogTrail';
import type {
  GStitcher,
  GStitcherFlat,
  GStitcherOf,
  Stitcher,
} from '../../../domain/objects/Stitcher';
import { StitchStepCompute } from '../../../domain/objects/StitchStep';
import type { Threads } from '../../../domain/objects/Threads';
import { genContextStitchTrail } from '../../context/genContextStitchTrail';
import { genThread } from '../../thread/genThread';
import { asStitcher } from './asStitcher';
import { asStitcherFlat } from './asStitcherFlat';
import { genStitchCycle } from './genStitchCycle';
import { genStitchRoute } from './genStitchRoute';

describe('genStitchCycle type preservation', () => {
  given('a repeatee and a decider', () => {
    const repeatee = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], number>
    >({
      slug: 'return-42',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 42 }),
    });

    const decider = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        { choice: 'repeat' | 'release' | 'halt' }
      >
    >({
      slug: 'decide-loop',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({
        input: null,
        output: { choice: 'repeat' },
      }),
    });

    const cycle = genStitchCycle({
      slug: 'loop-example',
      readme: 'Cycle until logic halts',
      repeatee,
      decider,
    });

    type Cycle = typeof cycle;
    type CycleNormed = Stitcher<GStitcherFlat<GStitcherOf<Cycle>>>;

    when('checking assignability to Stitcher<GStitcher>', () => {
      then('it should produce single-threaded inference', () => {
        type ThreadsKind = GStitcherOf<typeof cycle>['threads'];
        type IsSingle =
          ThreadsKind extends Threads<any, 'single'> ? true : false;
        const check: IsSingle = true;
        expect(check);
      });

      then('it should infer GStitcher shape', () => {
        type Result =
          GStitcherOf<typeof cycle> extends GStitcher ? true : false;
        const result: Result = true;
        expect(result);
      });

      then('it should have correct output type', () => {
        type Output = GStitcherOf<typeof cycle>['output'];
        const result: Output = 42;
        expect(result).toBe(42);

        // @ts-expect-error: string not allowed
        const invalid: Output = 'oops';
        expect(invalid);
      });

      then('it should be assignable generically', () => {
        type A =
          Cycle extends Stitcher<infer T>
            ? T extends GStitcher
              ? true
              : false
            : false;
        type B =
          CycleNormed extends Stitcher<infer T>
            ? T extends GStitcher
              ? true
              : false
            : false;
        const checkA: A = true;
        const checkB: B = true;
        expect(checkA);
        expect(checkB);
      });

      then(
        'it should not be exactly assignable due to generic invariance',
        () => {
          // @ts-expect-error: generic invariance on classes
          const a: [Cycle] extends [Stitcher<GStitcher>] ? true : false = true;
          expect(a);
        },
      );

      then('you can cast it manually with loss of type safety', () => {
        const forced = cycle as Stitcher<GStitcher>;
        expect(forced.slug).toBe('loop-example');
      });

      then('you can normalize it manually', () => {
        type Normalized = GStitcher<
          Threads<{ main: Empty }, 'single'>,
          GStitcher['context'],
          number
        >;
        const forced: Stitcher<Normalized> = cycle as any;
        expect(forced.slug).toBe('loop-example');
      });

      then('it should infer the correct context shape', () => {
        type Context = GStitcherOf<typeof cycle>['context'];
        const valid: Context = {
          ...genContextLogTrail(),
          ...genContextStitchTrail(),
        };
        expect(valid.log);

        // @ts-expect-error: missing context
        const invalid: Context = {};
        expect(invalid);
      });

      then('it should infer threads correctly', () => {
        type ThreadsType = GStitcherOf<typeof cycle>['threads'];

        const threads: ThreadsType = {
          main: genThread({ role: 'main' }),
        };

        expect(threads.main);

        const bad: ThreadsType = {
          // @ts-expect-error: extra thread
          foo: genThread({ role: 'foo' }),
        };
        expect(bad);
      });
    });
  });

  given('a repeatee that is a route of two steps', () => {
    const stepA = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        { a: number } & GStitcher['context'],
        string
      >
    >({
      slug: 'step-a',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'step-a' }),
    });

    const stepB = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        { b: boolean } & GStitcher['context'],
        string
      >
    >({
      slug: 'step-b',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'step-b' }),
    });

    const repeatee = asStitcher(
      genStitchRoute({
        slug: 'route:pair',
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
      slug: 'decide-again',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: { choice: 'release' } }),
    });

    const cycle = genStitchCycle({
      slug: 'loop-route',
      readme: 'Repeats a route',
      repeatee,
      decider,
    });

    type Output = GStitcherOf<typeof cycle>['output'];
    type Context = GStitcherOf<typeof cycle>['context'];

    then('it should merge context from both steps and decider', () => {
      const valid: Context = {
        a: 1,
        b: true,
        d: new Date(),
        log: console,
        stitch: { trail: [] },
      };
      expect(valid);

      // @ts-expect-error: missing required key `b`
      const invalid: Context = {
        a: 1,
        d: new Date(),
      };
      expect(invalid);
    });

    then('it should infer the output type from the repeatee route', () => {
      const val: Output = 'step-a';
      expect(val);

      // @ts-expect-error: number is not assignable
      const invalid: Output = 42;
      expect(invalid);
    });
  });

  given('a repeatee that is a route of two steps, asStitcherFlat', () => {
    const stepA = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        { a: number } & GStitcher['context'],
        string
      >
    >({
      slug: 'step-a',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'step-a' }),
    });

    const stepB = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        { b: boolean } & GStitcher['context'],
        string
      >
    >({
      slug: 'step-b',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'step-b' }),
    });

    const repeatee = asStitcherFlat<
      GStitcher<
        Threads<{ main: Empty }>,
        { a: number; b: boolean } & GStitcher['context'],
        string
      >
    >(
      genStitchRoute({
        slug: 'route:pair',
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
      slug: 'decide-again',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: { choice: 'release' } }),
    });

    const cycle = genStitchCycle({
      slug: 'loop-route',
      readme: 'Repeats a route',
      repeatee,
      decider,
    });

    type Output = GStitcherOf<typeof cycle>['output'];
    type Context = GStitcherOf<typeof cycle>['context'];

    then('it should merge context from both steps and decider', () => {
      const valid: Context = {
        a: 1,
        b: true,
        d: new Date(),
        log: console,
        stitch: { trail: [] },
      };
      expect(valid);

      // @ts-expect-error: missing required key `b`
      const invalid: Context = {
        a: 1,
        d: new Date(),
      };
      expect(invalid);
    });

    then('it should infer the output type from the repeatee route', () => {
      const val: Output = 'step-a';
      expect(val);

      // @ts-expect-error: number is not assignable
      const invalid: Output = 42;
      expect(invalid);
    });
  });

  given(
    'a repeatee asStitcherFlat that has different threads than decider',
    () => {
      const stepA = new StitchStepCompute<
        GStitcher<
          Threads<{ main: Empty }>,
          { a: number } & GStitcher['context'],
          string
        >
      >({
        slug: 'step-a',
        readme: null,
        form: 'COMPUTE',
        stitchee: 'main',
        invoke: () => ({ input: null, output: 'step-a' }),
      });
      const stepB = new StitchStepCompute<
        GStitcher<
          Threads<{ main: Empty }>,
          { b: boolean } & GStitcher['context'],
          string
        >
      >({
        slug: 'step-b',
        readme: null,
        form: 'COMPUTE',
        stitchee: 'main',
        invoke: () => ({ input: null, output: 'step-b' }),
      });
      const repeatee = asStitcherFlat<
        GStitcher<
          Threads<{ main: Empty }>,
          { a: number; b: boolean } & GStitcher['context'],
          string
        >
      >(
        genStitchRoute({
          slug: 'route:pair',
          readme: null,
          sequence: [stepA, stepB],
        }),
      );

      const decider = new StitchStepCompute<
        GStitcher<
          Threads<{ judge: Empty }>,
          { d: Date } & GStitcher['context'],
          { choice: 'repeat' | 'release' | 'halt' }
        >
      >({
        slug: 'decide-again',
        readme: null,
        form: 'COMPUTE',
        stitchee: 'judge',
        invoke: () => ({ input: null, output: { choice: 'release' } }),
      });

      const cycle = genStitchCycle({
        slug: 'loop-route',
        readme: 'Repeats a route',
        repeatee,
        decider,
      });

      type Output = GStitcherOf<typeof cycle>['output'];
      type Context = GStitcherOf<typeof cycle>['context'];

      then('it should merge context from both steps and decider', () => {
        const valid: Context = {
          a: 1,
          b: true,
          d: new Date(),
          log: console,
          stitch: { trail: [] },
        };
        expect(valid);

        // @ts-expect-error: missing required key `b`
        const invalid: Context = {
          a: 1,
          d: new Date(),
        };
        expect(invalid);
      });

      then('it should infer the output type from the repeatee route', () => {
        const val: Output = 'step-a';
        expect(val);

        // @ts-expect-error: number is not assignable
        const invalid: Output = 42;
        expect(invalid);
      });
    },
  );
});
