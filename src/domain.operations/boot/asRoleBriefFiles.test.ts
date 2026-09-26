import { given, then, when } from 'test-fns';

import { asRoleBriefFiles } from './asRoleBriefFiles';

const briefsDir = '/repo/.agent/repo=x/role=y/briefs';

const TEST_CASES = [
  {
    description: 'a brief under the briefs dir is kept',
    given: [`${briefsDir}/rule.require.x.md`],
    expect: [`${briefsDir}/rule.require.x.md`],
  },
  {
    description: 'a file outside the briefs dir is dropped',
    given: [
      '/repo/.agent/repo=x/role=y/readme.md',
      '/repo/.agent/repo=x/role=y/skills/a.sh',
    ],
    expect: [],
  },
  {
    description: 'a brief under `.scratch/` or `.archive/` is dropped',
    given: [
      `${briefsDir}/.scratch/draft.md`,
      `${briefsDir}/deep/.archive/old.md`,
      `${briefsDir}/deep/kept.md`,
    ],
    expect: [`${briefsDir}/deep/kept.md`],
  },
  {
    description: 'a peer dir whose name merely starts the same is dropped',
    given: ['/repo/.agent/repo=x/role=y/briefs-archive/old.md'],
    expect: [],
  },
  {
    description: 'a name that merely holds `.scratch` is kept',
    given: [`${briefsDir}/howto.scratch.md`],
    expect: [`${briefsDir}/howto.scratch.md`],
  },
];

describe('asRoleBriefFiles', () => {
  given('[case1] a set of file lists beside the briefs dir', () => {
    TEST_CASES.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then(`it yields ${JSON.stringify(thisCase.expect)}`, () => {
          expect(
            asRoleBriefFiles({ allFiles: thisCase.given, briefsDir }),
          ).toEqual(thisCase.expect);
        });
      }),
    );
  });
});
