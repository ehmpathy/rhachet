import { given, then } from 'test-fns';
import { Empty } from 'type-fns';

import { Stitch } from '../../../domain/objects/Stitch';
import { StitchStepCompute } from '../../../domain/objects/StitchStep';
import {
  GStitcher,
  GStitcherOf,
  Stitcher,
} from '../../../domain/objects/Stitcher';
import { Threads } from '../../../domain/objects/Threads';
import { asStitcherFlat } from './asStitcherFlat';
import { genStitchRoute } from './genStitchRoute';

describe('asStitcherFlat (typed GStitcher version)', () => {
  given('a genStitchRoute that needs to be flattened and reused', () => {
    const step1 = new StitchStepCompute<
      GStitcher<Threads<{ alpha: Empty }>, GStitcher['context'], string>
    >({
      slug: 's1',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'alpha',
      invoke: () => ({ input: null, output: 'a' }),
    });

    const step2 = new StitchStepCompute<
      GStitcher<Threads<{ alpha: Empty }>, GStitcher['context'], string>
    >({
      slug: 's2',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'alpha',
      invoke: () => ({ input: null, output: 'b' }),
    });

    const route = genStitchRoute({
      slug: 'r1',
      readme: null,
      sequence: [step1, step2] as const,
    });

    type Flat = GStitcher<
      Threads<{ alpha: Empty }, 'single'>,
      GStitcher['context'],
      string
    >;

    const stitcher = asStitcherFlat<Flat>(route);

    then('it should be assignable to the flattened form', () => {
      const ok: Stitcher<Flat> = stitcher;
      expect(ok.slug).toBe('r1');
    });

    then('it should have the expected thread structure', () => {
      type T = GStitcherOf<typeof stitcher>;
      type ThreadsType = T['threads'];

      type IsSingle = ThreadsType extends Threads<any, 'single'> ? true : false;
      type HasAlpha = ThreadsType extends Threads<{ alpha: any }, 'single'>
        ? true
        : false;

      const single: IsSingle = true;
      const has: HasAlpha = true;
      expect(single);
      expect(has);
    });

    then('it should preserve output and context types', () => {
      type T = GStitcherOf<typeof stitcher>;
      type OutputOk = T['output'] extends string ? true : false;
      type ContextOk = keyof T['context'] extends string ? true : false;

      const a: OutputOk = true;
      const b: ContextOk = true;
      expect(a);
      expect(b);
    });

    then('it should no longer exactly match the original route', () => {
      // @ts-expect-error: not assignable anymore
      const exact: typeof stitcher extends typeof route ? true : false = true;
      expect(exact);
    });

    then('it should be usable in a route that expects flattened steps', () => {
      const outer = genStitchRoute({
        slug: 'outer',
        readme: null,
        sequence: [stitcher] as const,
      });

      expect(outer.slug).toBe('outer');
      expect(outer.sequence[0].slug).toBe('r1');
    });
  });

  given('a stitcher that does not match the given flat type', () => {
    const wrongStep = new StitchStepCompute<
      GStitcher<Threads<{ wrong: Empty }>, GStitcher['context'], number>
    >({
      slug: 'fail',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'wrong',
      invoke: () => ({ input: null, output: 123 }),
    });

    type Flat = GStitcher<
      Threads<{ alpha: Empty }, 'single'>,
      GStitcher['context'],
      string
    >;

    // @ts-expect-error: wrong thread role and output type
    const bad = asStitcherFlat<Flat>(wrongStep);
    expect(bad.slug).toBe('fail');
  });

  given(
    'flat can require more threads than the inferred stitcher needs',
    () => {
      const needslittle = new StitchStepCompute<
        GStitcher<Threads<{ alpha: Empty }>, GStitcher['context'], string>
      >({
        slug: 'succeed-broader-thread-context',
        readme: null,
        form: 'COMPUTE',
        stitchee: 'alpha',
        invoke: () => ({ input: null, output: 'oops' }),
      });

      type Flat = GStitcher<
        Threads<{ alpha: { tools: string[] } }, 'single'>,
        GStitcher['context'],
        string
      >;

      const overprovisioned = asStitcherFlat<Flat>(needslittle);
      expect(overprovisioned.slug).toBe('succeed-broader-thread-context');
    },
  );

  given(
    'flat cannot allow less threads than the inferred stitcher needs',
    () => {
      const unsupported = new StitchStepCompute<
        GStitcher<
          Threads<{ alpha: { tools: string[] } }>,
          GStitcher['context'],
          string
        >
      >({
        slug: 'fail-narrow-thread-context',
        readme: null,
        form: 'COMPUTE',
        stitchee: 'alpha',
        invoke: () => ({ input: null, output: 'oops' }),
      });

      type Flat = GStitcher<
        Threads<{ alpha: Empty }, 'single'>,
        GStitcher['context'],
        string
      >;

      // @ts-expect-error: Property 'tools' is missing in type 'ThreadContextRole<"alpha">' but required in type '{ tools: string[]; }'
      const bad = asStitcherFlat<Flat>(unsupported);
      expect(bad.slug).toBe('fail-narrow-thread-context');
    },
  );
});
