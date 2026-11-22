import { given, then, when } from 'test-fns';

import { asRoleContentDefectsOfOrphans } from './asRoleContentDefectsOfOrphans';

const REF = { repo: '.this', role: 'any' };
const CWD = '/repo';

const TEST_CASES = [
  {
    description: 'no orphans names no defect',
    given: { orphans: [] },
    expect: { paths: [] },
  },
  {
    description: 'each orphan is named once, by its repo-relative path',
    given: {
      orphans: [
        {
          pathToMinified: `${CWD}/.agent/repo=.this/role=any/briefs/lost.md.min`,
        },
        {
          pathToMinified: `${CWD}/.agent/repo=.this/role=any/briefs/gone.md.min`,
        },
      ],
    },
    expect: {
      paths: [
        '.agent/repo=.this/role=any/briefs/lost.md.min',
        '.agent/repo=.this/role=any/briefs/gone.md.min',
      ],
    },
  },
  {
    description: 'an orphan entry with no min path names no defect',
    given: { orphans: [{ pathToMinified: null }] },
    expect: { paths: [] },
  },
];

describe('asRoleContentDefectsOfOrphans', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the transformer runs', () => {
        then('it names the expected defects', () => {
          const defects = asRoleContentDefectsOfOrphans({
            orphans: thisCase.given.orphans,
            ref: REF,
            cwd: CWD,
          });
          expect(defects.map((one) => one.pathToFile)).toEqual(
            thisCase.expect.paths,
          );
          expect(defects.every((one) => one.kind === 'orphan-min')).toEqual(
            true,
          );
          expect(defects.every((one) => one.detail === null)).toEqual(true);
        });
      });
    }),
  );
});
