import { given, then } from 'test-fns';
import { Empty } from 'type-fns';

import { genContextLogTrail } from '../../../.test/genContextLogTrail';
import { Stitch } from '../../../domain/objects/Stitch';
import { StitchStepCompute } from '../../../domain/objects/StitchStep';
import { GStitcher } from '../../../domain/objects/Stitcher';
import { Threads } from '../../../domain/objects/Threads';
import { genContextStitchTrail } from '../../context/genContextStitchTrail';
import { genThread } from '../../thread/genThread';
import { GStitcherInferredFromChoice } from './GStitcherInferredFromChoice.generic';

const stitcherReturn42 = new StitchStepCompute<
  GStitcher<Threads<{ main: Empty }>, GStitcher['context'], number>
>({
  slug: `return-42`,
  form: 'COMPUTE',
  readme: null,
  stitchee: 'main',
  invoke: () => ({ input: null, output: 42 }),
});

const stitcherReturnHello = new StitchStepCompute<
  GStitcher<Threads<{ main: Empty }>, GStitcher['context'], string>
>({
  slug: `return-hello`,
  form: 'COMPUTE',
  readme: null,
  stitchee: 'main',
  invoke: () => ({ input: null, output: 'hello' }),
});

const stitcherChooseReturn = new StitchStepCompute<
  GStitcher<
    Threads<{ main: Empty }>,
    GStitcher['context'],
    { choice: { slug: string } }
  >
>({
  slug: 'choose-return',
  form: 'COMPUTE',
  readme: null,
  stitchee: 'main',
  invoke: () => ({ input: null, output: { choice: { slug: 'return-42' } } }),
});

describe('GStitcherInferredFromChoice', () => {
  given('a decider and two options with different output types', () => {
    const options = [stitcherReturn42, stitcherReturnHello] as const;
    const decider = stitcherChooseReturn;

    type Inferred = GStitcherInferredFromChoice<typeof options, typeof decider>;

    then(
      'it should merge threads and context, and infer a union output',
      () => {
        const threads: Inferred['threads'] = {
          main: genThread({ role: 'main' }),
        };
        expect(threads);

        const context: Inferred['context'] = {
          ...genContextLogTrail(),
          ...genContextStitchTrail(),
        };
        expect(context);

        const output1: Inferred['output'] = 42;
        const output2: Inferred['output'] = 'hello';
        expect(typeof output1 === 'number' || typeof output1 === 'string').toBe(
          true,
        );
        expect(typeof output2 === 'number' || typeof output2 === 'string').toBe(
          true,
        );
      },
    );

    then('it should error if threads has unknown keys', () => {
      const badThreads: Inferred['threads'] = {
        // @ts-expect-error extra thread "foo"
        foo: genThread({ role: 'foo' }),
      };
      expect(badThreads);
    });

    then('it should error if context is missing required fields', () => {
      // @ts-expect-error missing context
      const badContext: Inferred['context'] = {};
      expect(badContext);
    });

    then('it should error if output is not string or number', () => {
      // @ts-expect-error boolean not allowed
      const badOutput: Inferred['output'] = true;
      expect(badOutput);
    });
  });
});
