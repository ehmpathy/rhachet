import { asPathRelPosix } from './asPathRelPosix';

const TEST_CASES = [
  {
    description: 'a file below the dir is its path from the dir',
    from: '/work/app/role',
    to: '/work/app/role/briefs/a.md',
    path: 'briefs/a.md',
  },
  {
    description: 'the dir itself is an empty path',
    from: '/work/app/role',
    to: '/work/app/role',
    path: '',
  },
  {
    description: 'a file beside the dir climbs out of it',
    from: '/work/app/role',
    to: '/work/app/other/a.md',
    path: '../other/a.md',
  },
] as const;

describe('asPathRelPosix', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asPathRelPosix({ from: thisCase.from, to: thisCase.to })).toEqual(
        thisCase.path,
      );
    }),
  );
});
