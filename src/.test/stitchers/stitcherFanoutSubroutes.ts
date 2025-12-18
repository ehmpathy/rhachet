import { Empty } from 'type-fns';

import { StitchStepCompute } from '@src/domain.objects/StitchStep';
import { GStitcher } from '@src/domain.objects/Stitcher';
import { Threads } from '@src/domain.objects/Threads';
import { asStitcher } from '@src/domain.operations/weave/compose/asStitcher';
import { genStitchFanout } from '@src/domain.operations/weave/compose/genStitchFanout';
import { genStitchRoute } from '@src/domain.operations/weave/compose/genStitchRoute';

const stepAdd1 = new StitchStepCompute<
  GStitcher<Threads<{ main: Empty }>, GStitcher['context'], number>
>({
  slug: 'add-1',
  form: 'COMPUTE',
  readme: null,
  stitchee: 'main',
  invoke: ({ threads }) => {
    const last = threads.main.stitches.at(-1)?.output;
    const base = typeof last === 'number' ? last : 0;
    return { input: base, output: base + 1 };
  },
});

const stepAdd2 = new StitchStepCompute<
  GStitcher<Threads<{ main: Empty }>, GStitcher['context'], number>
>({
  slug: 'add-2',
  form: 'COMPUTE',
  readme: null,
  stitchee: 'main',
  invoke: ({ threads }) => {
    const last = threads.main.stitches.at(-1)?.output;
    const base = typeof last === 'number' ? last : 0;
    return { input: base, output: base + 2 };
  },
});

const stepAdd3 = new StitchStepCompute<
  GStitcher<Threads<{ main: Empty }>, GStitcher['context'], number>
>({
  slug: 'add-3',
  form: 'COMPUTE',
  readme: null,
  stitchee: 'main',
  invoke: ({ threads }) => {
    const last = threads.main.stitches.at(-1)?.output;
    const base = typeof last === 'number' ? last : 0;
    return { input: base, output: base + 3 };
  },
});

const route1 = genStitchRoute({
  slug: 'route-1',
  readme: null,
  sequence: [stepAdd1, stepAdd2] as const, // 1 + 2 = 3
});

const route2 = genStitchRoute({
  slug: 'route-2',
  readme: null,
  sequence: [stepAdd1, stepAdd2, stepAdd3], // 1 + 2 + 3 = 6
});

const concluderSumRoutes = new StitchStepCompute<
  GStitcher<Threads<{ main: Empty }, 'multiple'>, GStitcher['context'], number>
>({
  slug: 'sum-routes',
  form: 'COMPUTE',
  readme: null,
  stitchee: 'main',
  invoke: ({ threads }) => {
    console.log(JSON.stringify(threads, null, 2));
    const outputs = threads.main.peers.map((t) => {
      const last = t.stitches.at(-1);
      if (!last) throw new Error('Missing stitch');
      return last.output as number;
    });

    return {
      input: outputs,
      output: outputs.reduce((a, b) => a + b, 0),
    };
  },
});

export const stitcherFanoutWithRoutes = genStitchFanout({
  slug: 'fanout-with-routes',
  readme: 'parallel route of 2 steps and 3 steps',
  parallels: [asStitcher(route1), asStitcher(route2)] as const,
  concluder: concluderSumRoutes,
});
