import { isRoleModFileLitter } from './isRoleModFileLitter';

const TEST_CASES = [
  { path: 'briefs/.DS_Store', expect: true },
  { path: 'Thumbs.db', expect: true },
  { path: 'skills/desktop.ini', expect: true },
  { path: 'briefs/.gitkeep', expect: true },
  { path: 'briefs/.rule.md.swp', expect: true },
  { path: 'briefs/.rule.md.swo', expect: true },
  { path: 'briefs/.rule.md.swn', expect: true },
  { path: 'briefs/.rule.md.swa', expect: true },
  { path: 'briefs/rule.md~', expect: true },
  { path: 'briefs/rule.md', expect: false },
  { path: 'briefs/.readme.md', expect: false },
  { path: 'skills/say.sh', expect: false },
  { path: 'briefs/rule.swq', expect: false },
];

describe('isRoleModFileLitter', () => {
  TEST_CASES.map((thisCase) =>
    test(`${thisCase.path} reads as litter=${thisCase.expect}`, () => {
      expect(isRoleModFileLitter({ path: thisCase.path })).toEqual(
        thisCase.expect,
      );
    }),
  );
});
