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
import { genThread } from '../../thread/genThread';
import { asStitcher } from './asStitcher';
import { genStitchRoute } from './genStitchRoute';

describe('asStitcher type normalization', () => {
  given('a StitchStepCompute with basic threads and number output', () => {
    const step = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], number>
    >({
      slug: 'step',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 42 }),
    });

    const stitcher = asStitcher(step);

    then('the thread type should be narrowly defined', () => {
      type T = GStitcherOf<typeof stitcher>;
      type ThreadType = T['threads'];

      const threads: ThreadType = {
        main: genThread({ role: 'main' as const }),

        // @ts-expect-error: bert does not exist
        bert: genThread({ role: 'main' as const }),
      };
      expect(threads);
    });

    then('it should preserve thread keys and force single fanin', () => {
      type T = GStitcherOf<typeof stitcher>;
      type ThreadsType = T['threads'];

      type IsSingle = ThreadsType extends Threads<any, 'single'> ? true : false;
      type HasMain = ThreadsType extends Threads<{ main: any }, 'single'>
        ? true
        : false;

      const checkA: IsSingle = true;
      const checkB: HasMain = true;
      expect(checkA);
      expect(checkB);
    });
    then('it should preserve context and output', () => {
      type T = GStitcherOf<typeof stitcher>;
      type OutputOk = T['output'] extends number ? true : false;
      type HasContext = keyof T['context'] extends string ? true : false;

      const checkA: OutputOk = true;
      const checkB: HasContext = true;
      expect(checkA);
      expect(checkB);
    });

    then('it should still be assignable to Stitcher<GStitcher>', () => {
      type Check = typeof stitcher extends Stitcher<GStitcher> ? true : false;
      const result: Check = true;
      expect(result);
    });

    then('it should no longer exactly match the original', () => {
      // @ts-expect-error: structural change after normalization
      const exactMatch: typeof stitcher extends typeof step ? true : false =
        true;
      expect(exactMatch);
    });
  });

  given('a genStitchRoute that needs to be normalized for reuse', () => {
    const step1 = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], number>
    >({
      slug: 's1',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 1 }),
    });

    const step2 = new StitchStepCompute<
      GStitcher<Threads<{ main: Empty }>, GStitcher['context'], number>
    >({
      slug: 's2',
      readme: null,
      form: 'COMPUTE',
      stitchee: 'main',
      invoke: () => ({ input: null, output: 2 }),
    });

    const route = genStitchRoute({
      slug: 'route',
      readme: null,
      sequence: [step1, step2] as const,
    });

    const stitcher = asStitcher(route);

    then(
      'it should allow reuse in another route that expects single-threaded steps',
      () => {
        const outer = genStitchRoute({
          slug: 'outer',
          readme: null,
          sequence: [stitcher] as const,
        });

        expect(outer.slug).toBe('outer');
        expect(outer.sequence[0].slug).toBe('route');
      },
    );

    then('it should preserve thread structure', () => {
      type T = GStitcherOf<typeof stitcher>;
      type ThreadsType = T['threads'];

      type IsSingle = ThreadsType extends Threads<any, 'single'> ? true : false;
      type HasMain = ThreadsType extends Threads<{ main: any }, 'single'>
        ? true
        : false;

      const checkA: IsSingle = true;
      const checkB: HasMain = true;
      expect(checkA);
      expect(checkB);
    });

    then('it should be assignable to Stitcher<GStitcher>', () => {
      type Check = typeof stitcher extends Stitcher<GStitcher> ? true : false;
      const result: Check = true;
      expect(result);
    });

    then('it should no longer match StitchRoute<T> exactly', () => {
      // @ts-expect-error: nominal break due to generic rewrite
      const exactMatch: typeof stitcher extends typeof route ? true : false =
        true;
      expect(exactMatch);
    });
  });
});
