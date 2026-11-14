import { isBootSpecPathOfRoleMod } from './isBootSpecPathOfRoleMod';

const TEST_CASES = [
  {
    description: 'a spec under the mods repo is a mod spec',
    cwd: '/work/app',
    path: '/work/app/.agent/repo=.mods/role=mechanic/boot.yml',
    isMod: true,
  },
  {
    description: 'a spec under a package repo is no mod spec',
    cwd: '/work/app',
    path: '/work/app/.agent/repo=ehmpathy/role=mechanic/boot.yml',
    isMod: false,
  },
  {
    description: 'a spec under the native repo is no mod spec',
    cwd: '/work/app',
    path: '/work/app/.agent/repo=.this/role=any/boot.yml',
    isMod: false,
  },
  {
    description: 'a route spec is no mod spec',
    cwd: '/work/app',
    path: '/work/app/.behavior/v1.surf-wax/boot.yml',
    isMod: false,
  },
  {
    description: 'a near-miss of the mods slug is no mod spec',
    cwd: '/work/app',
    path: '/work/app/.agent/repo=.mod/role=mechanic/boot.yml',
    isMod: false,
  },
  {
    description: 'a cwd that sits under a mods dir does not mark its own specs',
    cwd: '/work/.agent/repo=.mods/app',
    path: '/work/.agent/repo=.mods/app/.agent/repo=.this/role=any/boot.yml',
    isMod: false,
  },
] as const;

describe('isBootSpecPathOfRoleMod', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(
        isBootSpecPathOfRoleMod({ cwd: thisCase.cwd, path: thisCase.path }),
      ).toEqual(thisCase.isMod);
    }),
  );
});
