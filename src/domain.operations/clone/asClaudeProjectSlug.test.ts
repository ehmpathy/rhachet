import { asClaudeProjectSlug } from './asClaudeProjectSlug';

/**
 * .what = the cwd → claude project-dir slug encode, over the real char classes
 */
const TEST_CASES: {
  description: string;
  cwd: string;
  expect: string;
}[] = [
  {
    description:
      'the real worktree path claude wrote (slashes, underscore, dots)',
    cwd: '/home/vlad/git/ehmpathy/_worktrees/rhachet.vlad.enroll-with-interface',
    expect:
      '-home-vlad-git-ehmpathy--worktrees-rhachet-vlad-enroll-with-interface',
  },
  {
    description: 'a plain path — each slash becomes a dash, alnum preserved',
    cwd: '/a/b/c1',
    expect: '-a-b-c1',
  },
  {
    description: 'an extant hyphen is preserved (it is a dash already)',
    cwd: '/x-y',
    expect: '-x-y',
  },
];

describe('asClaudeProjectSlug', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(asClaudeProjectSlug({ cwd: thisCase.cwd })).toEqual(
        thisCase.expect,
      );
    }),
  );
});
