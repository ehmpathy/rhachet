import { given, then, when } from 'test-fns';
import type { Empty } from 'type-fns';

import type {
  GStitcher,
  GStitcherFlat,
  GStitcherOf,
  Stitcher,
} from '../../../domain/objects/Stitcher';
import type { StitchRoute } from '../../../domain/objects/StitchRoute';
import { StitchStepCompute } from '../../../domain/objects/StitchStep';
import type { Threads } from '../../../domain/objects/Threads';
import { asStitcher } from './asStitcher';
import { genStitchRoute } from './genStitchRoute';

describe('genStitchRoute type preservation', () => {
  given('a route with two compute steps on the same thread', () => {
    const step1 = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], number>
    >({
      slug: 'step-1',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 1 }),
    });
    const check1: typeof step1 extends Stitcher<GStitcher> ? true : false =
      true;
    expect(check1);

    const step2 = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], number>
    >({
      slug: 'step-2',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 2 }),
    });
    const check2: typeof step2 extends Stitcher<GStitcher> ? true : false =
      true;
    expect(check2);

    const route = genStitchRoute({
      slug: 'route:example',
      readme: null,
      sequence: [step1, step2] as const,
    });

    type Route = typeof route;
    type RouteNormed = Stitcher<GStitcherFlat<GStitcherOf<Route>>>;

    when('checking assignability to Stitcher<GStitcher>', () => {
      then('it should produce single threads', () => {
        type RouteG = GStitcherOf<typeof route>;
        type RouteThreads = RouteG['threads'];
        type IsSingle =
          RouteThreads extends Threads<any, 'single'> ? true : false;
        const isSingle: IsSingle = true;
        expect(isSingle);
      });

      then('it should produce a valid gstitcher', () => {
        type RouteGStitcher = GStitcherOf<typeof route>;
        type IsValid = RouteGStitcher extends GStitcher ? true : false;
        const isValid: IsValid = true;
        expect(isValid);
      });

      then(
        'it should be assignable to StitchRoute<T extends GStitcher>',
        () => {
          type IsAssignableToStichRoute =
            typeof route extends StitchRoute<infer T>
              ? T extends GStitcher
                ? true
                : false
              : false;
          const isAssignable: IsAssignableToStichRoute = true;
          expect(isAssignable);
        },
      );

      then('it cannot be assignable to StitchRoute<GStitcher>', () => {
        type IsAssignableToStichRoute =
          typeof route extends StitchRoute<GStitcher> ? true : false;

        // @ts-expect-error: due to Generic Invariance on Classes
        const isAssignable: IsAssignableToStichRoute = true;
        expect(isAssignable);
      });

      then('it should be assignable generically', () => {
        type InferredA =
          Route extends Stitcher<infer T>
            ? T extends GStitcher
              ? true
              : false
            : false;
        const checkA: InferredA = true;
        expect(checkA);

        type InferredB =
          RouteNormed extends Stitcher<infer T>
            ? T extends GStitcher
              ? true
              : false
            : false;
        const checkB: InferredB = true;
        expect(checkB);

        type InferredC =
          typeof route extends Stitcher<infer T>
            ? T extends GStitcher
              ? true
              : false
            : false;
        const checkC: InferredC = true;
        expect(checkC);
      });

      then('it cannot be assignable exactly', () => {
        // @ts-expect-error: due to Generic Invariance on Classes
        const checkA: [Route] extends [Stitcher<GStitcher>] ? true : false =
          true;
        expect(checkA);

        // @ts-expect-error: due to Generic Invariance on Classes
        const checkB: [RouteNormed] extends [Stitcher<GStitcher>]
          ? true
          : false = true;
        expect(checkB);
      });
    });

    then('you can still cast it manually with loss of type safety', () => {
      const forced = route as Stitcher<GStitcher>;
      expect(forced.slug).toBe('route:example');
    });

    then(
      'it should be assignable if you normalize threads to Threads<..., "single">',
      () => {
        type Normalized = GStitcher<
          Threads<{ main: Empty }, 'single'>,
          GStitcher['context'],
          number
        >;

        const normalized: Stitcher<Normalized> = route as any;
        expect(normalized.slug).toBe('route:example');
      },
    );
  });

  given('a route within a route', () => {
    const step1 = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], number>
    >({
      slug: 'step-1',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 1 }),
    });

    const step2 = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], number>
    >({
      slug: 'step-2',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 2 }),
    });

    const innerRoute = genStitchRoute({
      slug: 'route:inner',
      readme: null,
      sequence: [step1, step2] as const,
    });

    const outerRoute = genStitchRoute({
      slug: 'route:outer',
      readme: null,
      sequence: [asStitcher(innerRoute)] as const,
    });

    then('innerRoute should be assignable to Stitcher<GStitcher>', () => {
      type Check =
        typeof innerRoute extends Stitcher<infer T>
          ? T extends GStitcher
            ? true
            : false
          : false;

      const result: Check = true;
      expect(result);
    });

    then('outerRoute should be assignable to Stitcher<GStitcher>', () => {
      type Check =
        typeof outerRoute extends Stitcher<infer T>
          ? T extends GStitcher
            ? true
            : false
          : false;

      const result: Check = true;
      expect(result);
    });

    then('innerRoute should be assignable to StitchRoute<GStitcher>', () => {
      type Check =
        typeof innerRoute extends Stitcher<infer T>
          ? T extends GStitcher
            ? true
            : false
          : false;

      const result: Check = true;
      expect(result);
    });

    then('outerRoute stitches should include the inner step structure', () => {
      const slug = outerRoute.slug;
      expect(slug).toBe('route:outer');
      expect(outerRoute.sequence[0].slug).toBe('route:inner');
    });
  });
});
