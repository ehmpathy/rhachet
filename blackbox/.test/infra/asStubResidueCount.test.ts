import { given, then, when } from 'test-fns';

import { asStubResidueCount } from './asStubResidueCount';

describe('asStubResidueCount', () => {
  given('[case1] a ps table with stubs of this checkout, a peer checkout, and today', () => {
    const psTable = [
      ' 2-01:00:05 node /repo/src/.test/assets/stubBrainCli.cjs --settings a',
      '   07:24:00 node /repo/src/.test/assets/stubBrainCli.cjs --settings b',
      '      05:07 node /repo/src/.test/assets/stubBrainCli.cjs --settings c',
      ' 3-00:00:00 node /peer/src/.test/assets/stubBrainCli.cjs --settings d',
      ' 3-00:00:00 node /repo/bin/run.jit enroll claude',
      '',
    ].join('\n');

    when('[t0] the floor is thirty minutes', () => {
      then('only the old stubs of this checkout count', () => {
        expect(
          asStubResidueCount({
            psTable,
            stubPath: '/repo/src/.test/assets/stubBrainCli.cjs',
            stubAgeMinSeconds: 30 * 60,
          }),
        ).toEqual(2);
      });
    });
  });
});
