import { Empty } from 'type-fns';

import { Stitch } from '../../domain/objects/Stitch';
import { StitchStepCompute } from '../../domain/objects/StitchStep';
import { GStitcher } from '../../domain/objects/Stitcher';
import { Threads } from '../../domain/objects/Threads';
import { genStitchFanout } from '../../logic/weave/compose/genStitchFanout';

const stitcherComputeRandom = new StitchStepCompute<
  GStitcher<Threads<{ main: Empty }>, GStitcher['context'], number>
>({
  slug: `compute-random`,
  form: 'COMPUTE',
  readme: null,
  stitchee: 'main',
  invoke: () =>
    new Stitch({
      input: null,
      output: Math.floor(Math.random() * 100),
    }),
});

const stitcherAddAll = new StitchStepCompute<
  GStitcher<Threads<{ main: Empty }, 'multiple'>, GStitcher['context'], number>
>({
  slug: 'sum-up',
  form: 'COMPUTE',
  readme: null,
  stitchee: 'main',
  invoke: ({ threads }) => {
    const numbers = threads.main.peers.map((t) => {
      const last = t.stitches.at(-1);
      if (!last) throw new Error('Missing stitch on thread');
      return last.output as number;
    });

    const sum = numbers.reduce((a, b) => a + b, 0);

    return new Stitch({
      input: numbers,
      output: sum,
    });
  },
});

export const stitcherFanoutRandomSum = genStitchFanout({
  slug: 'random:x5:sum',
  readme: null,
  parallels: [
    stitcherComputeRandom,
    stitcherComputeRandom,
    stitcherComputeRandom,
  ],
  concluder: stitcherAddAll,
});
