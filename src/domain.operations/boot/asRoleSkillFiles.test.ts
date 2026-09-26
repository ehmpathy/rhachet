import { given, then, when } from 'test-fns';

import { asRoleSkillFiles } from './asRoleSkillFiles';

const skillsDir = '/repo/.agent/repo=x/role=y/skills';

const TEST_CASES = [
  {
    description: 'a skill under the skills dir is kept',
    given: [`${skillsDir}/deploy.sh`],
    expect: [`${skillsDir}/deploy.sh`],
  },
  {
    description: 'a file outside the skills dir is dropped',
    given: [
      '/repo/.agent/repo=x/role=y/readme.md',
      '/repo/.agent/repo=x/role=y/briefs/rule.require.x.md',
    ],
    expect: [],
  },
  {
    description: 'a skill nested under the skills dir is kept',
    given: [`${skillsDir}/git.commit/git.commit.set.sh`],
    expect: [`${skillsDir}/git.commit/git.commit.set.sh`],
  },
  {
    description: 'a peer dir whose name merely starts the same is dropped',
    given: ['/repo/.agent/repo=x/role=y/skills-archive/old.sh'],
    expect: [],
  },
  {
    /**
     * ⚠️ .note = the asymmetry with `asRoleBriefFiles`, pinned on purpose: the brief
     *   peer drops `.scratch/` and `.archive/`, this one does NOT. whether a skill
     *   under those dirs should reach the corpus is an open question, recorded in
     *   `.dream/v2026_09_24.ask.should-skills-drop-scratch-and-archive-dirs.md`
     */
    description: 'a skill under `.scratch/` is kept — unlike its brief peer',
    given: [`${skillsDir}/.scratch/draft.sh`],
    expect: [`${skillsDir}/.scratch/draft.sh`],
  },
];

describe('asRoleSkillFiles', () => {
  given('[case1] a set of file lists beside the skills dir', () => {
    TEST_CASES.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then(`it yields ${JSON.stringify(thisCase.expect)}`, () => {
          expect(
            asRoleSkillFiles({ allFiles: thisCase.given, skillsDir }),
          ).toEqual(thisCase.expect);
        });
      }),
    );
  });
});
