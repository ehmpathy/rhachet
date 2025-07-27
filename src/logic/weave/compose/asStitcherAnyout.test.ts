import { given, then, when } from 'test-fns';

import { StitchStepCompute } from '../../../domain/objects/StitchStep';
import { GStitcher, GStitcherOf } from '../../../domain/objects/Stitcher';
import { Threads } from '../../../domain/objects/Threads';
import { asStitcherAnyout } from './asStitcherAnyout';

describe('asStitcherAnyout', () => {
  given(
    'an input stitcher with output: { status: "good" | "bad" } and DesiredStitcher with output: { result: "success" | "failure" }',
    () => {
      const before = new StitchStepCompute<
        GStitcher<
          Threads<{ alpha: { tools: string[] } }, 'single'>,
          { debug: boolean } & GStitcher['context'],
          { status: 'good' | 'bad' }
        >
      >({
        slug: 's',
        form: 'COMPUTE',
        stitchee: 'alpha',
        readme: null,
        invoke: () => ({ input: null, output: { status: 'good' } }),
      });

      type Desired = GStitcher<
        Threads<{ alpha: { tools: string[] } }, 'single'>,
        { debug: boolean } & GStitcher['context'],
        { result: 'success' | 'failure' }
      >;

      when('as stitcher anyout', () => {
        const after = asStitcherAnyout<Desired>(before);

        then('it should preserve the thread roles from Desired', () => {
          type ThreadsOk = GStitcherOf<
            typeof after
          >['threads'] extends Desired['threads']
            ? true
            : false;

          const check: ThreadsOk = true;
          expect(check);
        });

        then('it should preserve the context from Desired', () => {
          type ContextOk = GStitcherOf<
            typeof after
          >['context'] extends Desired['context']
            ? true
            : false;

          const check: ContextOk = true;
          expect(check);
        });
        then('it should erase the output type to any', () => {
          type OutputAfter = GStitcherOf<typeof after>['output'];
          type IsExactlyAny = 0 extends 1 & OutputAfter ? true : false;

          const exact: IsExactlyAny = true;
          expect(exact);
        });
      });
    },
  );
});
