import { given, then, when } from 'test-fns';
import type { Empty } from 'type-fns';

import type { StitchChoice } from '../../../domain/objects/StitchChoice';
import type {
  GStitcher,
  GStitcherFlat,
  GStitcherOf,
  Stitcher,
} from '../../../domain/objects/Stitcher';
import { StitchStepCompute } from '../../../domain/objects/StitchStep';
import type { Threads } from '../../../domain/objects/Threads';
import { genThread } from '../../thread/genThread';
import { asStitcher } from './asStitcher';
import { genStitchChoice } from './genStitchChoice';

describe('genStitchChoice type preservation', () => {
  given('a choice between two stitchers with different outputs', () => {
    const stepA = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], number>
    >({
      slug: 'number-return',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 1 }),
    });

    const stepB = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], string>
    >({
      slug: 'string-return',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'value' }),
    });

    const decider = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        { choice: { slug: string } }
      >
    >({
      slug: 'choose-path',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({
        input: null,
        output: { choice: { slug: 'number-return' } },
      }),
    });

    const choice = genStitchChoice({
      slug: 'test:choice:basic',
      readme: null,
      decider,
      options: [stepA, stepB] as const,
    });

    type Choice = typeof choice;
    type ChoiceNormed = Stitcher<GStitcherFlat<GStitcherOf<Choice>>>;

    when('checking assignability to Stitcher<GStitcher>', () => {
      then('it should produce single threads', () => {
        type ThreadsKind = GStitcherOf<typeof choice>['threads'];
        type IsSingle =
          ThreadsKind extends Threads<any, 'single'> ? true : false;
        const check: IsSingle = true;
        expect(check);
      });

      then('it should produce a valid GStitcher', () => {
        type Result =
          GStitcherOf<typeof choice> extends GStitcher ? true : false;
        const result: Result = true;
        expect(result);
      });

      then(
        'it should be assignable to StitchChoice<T extends GStitcher>',
        () => {
          type IsAssignableToStitchChoice =
            typeof choice extends StitchChoice<infer T>
              ? T extends GStitcher
                ? true
                : false
              : false;

          const check: IsAssignableToStitchChoice = true;
          expect(check);
        },
      );

      then('it should be assignable generically', () => {
        type A =
          Choice extends Stitcher<infer T>
            ? T extends GStitcher
              ? true
              : false
            : false;
        type B =
          ChoiceNormed extends Stitcher<infer T>
            ? T extends GStitcher
              ? true
              : false
            : false;
        type C =
          typeof choice extends Stitcher<infer T>
            ? T extends GStitcher
              ? true
              : false
            : false;

        const checkA: A = true;
        const checkB: B = true;
        const checkC: C = true;

        expect(checkA);
        expect(checkB);
        expect(checkC);
      });

      then('it cannot be assignable exactly', () => {
        // @ts-expect-error: due to Generic Invariance on Classes
        const a: [Choice] extends [Stitcher<GStitcher>] ? true : false = true;
        expect(a);

        // @ts-expect-error: due to Generic Invariance on Classes
        const b: [ChoiceNormed] extends [Stitcher<GStitcher>] ? true : false =
          true;
        expect(b);
      });
    });

    then('you can still cast it manually with loss of type safety', () => {
      const forced = choice as Stitcher<GStitcher>;
      expect(forced.slug).toBe('test:choice:basic');
    });

    then('it should be assignable when normalized manually', () => {
      type Normalized = GStitcher<
        Threads<{ main: Empty }, 'single'>,
        GStitcher['context'],
        string | number
      >;

      const forced: Stitcher<Normalized> = choice as any;
      expect(forced.slug).toBe('test:choice:basic');
    });
  });

  given('a two-level decision tree for home service triage', () => {
    // Leaf steps
    const urgentPlumber = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        'plumber-urgent'
      >
    >({
      slug: 'plumber-urgent',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'plumber-urgent' }),
    });

    const scheduleInspection = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        'inspection-scheduled'
      >
    >({
      slug: 'inspect-later',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'inspection-scheduled' }),
    });

    const referToUtility = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], 'refer-utility'>
    >({
      slug: 'refer-utility',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'refer-utility' }),
    });

    const dispatchElectrician = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        'dispatch-electrician'
      >
    >({
      slug: 'dispatch-electrician',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 'dispatch-electrician' }),
    });

    // Inner choice: LEAK path
    const leakDecider = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        { choice: { slug: string } }
      >
    >({
      slug: 'decide-leak-type',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({
        input: null,
        output: { choice: { slug: 'plumber-urgent' } },
      }),
    });

    const leakChoice = genStitchChoice({
      slug: 'choice:leak',
      readme: null,
      decider: leakDecider,
      options: [urgentPlumber, scheduleInspection],
    });

    // Root choice: MAIN triage
    const rootDecider = new StitchStepCompute<
      GStitcher<
        Threads<{ main: Empty }>,
        GStitcher['context'],
        { choice: { slug: string } }
      >
    >({
      slug: 'decide-main-issue',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({
        input: null,
        output: { choice: { slug: 'choice:leak' } },
      }),
    });

    const rootChoice = genStitchChoice({
      slug: 'choice:whats-wrong',
      readme: 'Decide how to triage home emergency',
      decider: rootDecider,
      options: [asStitcher(leakChoice), referToUtility, dispatchElectrician],
    });

    when('checking type inference and assignability', () => {
      then('it should infer the correct output union', () => {
        type Output = GStitcherOf<typeof rootChoice>['output'];
        type ExpectUnion =
          | 'plumber-urgent'
          | 'inspection-scheduled'
          | 'refer-utility'
          | 'dispatch-electrician';

        const result: Output = 'dispatch-electrician';
        expect(result).toBe('dispatch-electrician');

        // compile-time check
        const check: Output extends ExpectUnion ? true : false = true;
        expect(check);

        // @ts-expect-error: Type '21' is not assignable to type '"plumber-urgent" | "inspection-scheduled" | "refer-utility" | "dispatch-electrician"'.ts(2322
        const result3: Output = 21;
        expect(result3);
      });

      then('it should infer threads correctly', () => {
        type ThreadsType = GStitcherOf<typeof rootChoice>['threads'];

        const threads: ThreadsType = {
          main: genThread({ role: 'main' as const }),

          // @ts-expect-error: 'bert' does not exist in type 'ThreadsMerged<[Threads<{ main: Empty; }>
          bert: genThread({ role: 'main' as const }),
        };

        expect(threads.main);
      });

      then('it should infer context correctly', () => {
        type ContextType = GStitcherOf<typeof rootChoice>['context'];

        // ✅ Valid assignment
        const context: ContextType = {
          log: console,
          stitch: { trail: [] },
        };

        expect(context.log).toBe(console);

        // @ts-expect-error: ⛔ missing required context keys
        const missing: ContextType = {};
        expect(missing);

        // @ts-expect-error: ⛔ wrong key ("stitchTrail" instead of "stitch")
        const wrongKey: ContextType = {
          log: console,
          stitchTrail: [],
        };
        expect(wrongKey);

        const wrongValue: ContextType = {
          // @ts-expect-error: ⛔ wrong type of value for log
          log: 'not-a-logger',
          stitch: { trail: [] },
        };
        expect(wrongValue);
      });

      then('it should be assignable to Stitcher<GStitcher>', () => {
        type G = GStitcherOf<typeof rootChoice>;
        const result: G extends GStitcher ? true : false = true;
        expect(result);
      });

      then('it should be assignable to StitchChoice<T>', () => {
        type Check =
          typeof rootChoice extends StitchChoice<infer G>
            ? G extends GStitcher
              ? true
              : false
            : false;

        const result: Check = true;
        expect(result);
      });

      then('you can normalize manually', () => {
        type Normalized = GStitcher<
          Threads<{ main: Empty }, 'single'>,
          GStitcher['context'],
          | 'plumber-urgent'
          | 'inspection-scheduled'
          | 'refer-utility'
          | 'dispatch-electrician'
        >;

        const forced: Stitcher<Normalized> = rootChoice as any;
        expect(forced.slug).toBe('choice:whats-wrong');
      });
    });
  });
});
