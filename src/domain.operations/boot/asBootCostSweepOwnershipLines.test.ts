import { given, then, when } from 'test-fns';

import { genSampleBootSpecCost as asCost } from '@src/.test/assets/genSampleBootSpecCost';

import { asBootCostSweepOwnershipLines } from './asBootCostSweepOwnershipLines';

const PATH_LINKED = '.agent/repo=ehmpathy/role=mechanic/boot.yml';
const PATH_OWNED = '.agent/repo=.this/role=any/boot.yml';

describe('asBootCostSweepOwnershipLines', () => {
  given('[case1] every spec is owned', () => {
    when('[t0] the lines are rendered', () => {
      then('no note is printed', () => {
        expect(
          asBootCostSweepOwnershipLines({
            costs: [asCost({ pathToSpec: PATH_OWNED, isForeign: false })],
            pathsToSpecModded: [],
          }),
        ).toEqual([]);
      });
    });
  });

  given('[case2] a linked spec with no mod', () => {
    when('[t0] the lines are rendered', () => {
      const lines = asBootCostSweepOwnershipLines({
        costs: [asCost({ pathToSpec: PATH_LINKED, isForeign: true })],
        pathsToSpecModded: [],
      });
      then('the note says it is not yours to trim', () => {
        expect(lines.join('\n')).toContain('not yours to trim');
      });
      then('no mod note is printed', () => {
        expect(lines.join('\n')).not.toContain('[~] modded');
      });
    });
  });

  given('[case3] a linked spec this repo mods', () => {
    when('[t0] the lines are rendered', () => {
      const lines = asBootCostSweepOwnershipLines({
        costs: [
          asCost({ pathToSpec: PATH_LINKED, isForeign: true }),
          asCost({ pathToSpec: PATH_OWNED, isForeign: false }),
        ],
        pathsToSpecModded: [PATH_LINKED],
      });
      then('the mod note names the part the reader can trim', () => {
        expect(lines.join('\n')).toContain(
          'yours to trim in .agent/repo=.mods/',
        );
        expect(lines.join('\n')).toContain('(1 of 1 linked here)');
      });
      then('the lines match the snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
