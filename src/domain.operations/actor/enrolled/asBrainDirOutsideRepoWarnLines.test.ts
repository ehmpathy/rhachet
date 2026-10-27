import { given, then, when } from 'test-fns';

import { asBrainDirOutsideRepoWarnLines } from './asBrainDirOutsideRepoWarnLines';
import { BrainDirOutsideRepoError } from './BrainDirOutsideRepoError';

const HINT =
  'point that dir, or the link above it, back inside the repo, then rerun `rhx init --hooks`';

const TEST_CASES = [
  {
    description: 'a hash actor dir: the effect is that one dir',
    given: { path: '.agent/.actors/actor.via.hash=aaaa1111/brain/.claude' },
    expect: {
      effect:
        '   ├─ effect = that brain dir got no hooks and no boot from this run',
    },
  },
  {
    description: 'the repo actor dir: the effect is every actor',
    given: { path: '.agent/.actors/actor.via.repo=ambient/brain/.claude' },
    expect: {
      effect:
        '   ├─ effect = the repo actor got no boot, and no actor gets its role hooks until it does',
    },
  },
];

describe('asBrainDirOutsideRepoWarnLines', () => {
  TEST_CASES.map((thisCase) =>
    given(`[case] ${thisCase.description}`, () => {
      when('[t0] the warn is rendered', () => {
        const lines = asBrainDirOutsideRepoWarnLines({
          error: new BrainDirOutsideRepoError(
            'refused a write outside the repo',
            { path: thisCase.given.path, landsAt: '/elsewhere', hint: HINT },
          ),
        });

        then('the effect line names what was missed', () => {
          expect(lines).toContain(thisCase.expect.effect);
        });

        then('the block matches snapshot', () => {
          expect(lines.join('\n')).toMatchSnapshot();
        });
      });
    }),
  );
});
