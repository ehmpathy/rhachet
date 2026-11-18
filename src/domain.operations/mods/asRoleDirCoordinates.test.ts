import { asRoleDirCoordinates } from './asRoleDirCoordinates';

const TEST_CASES = [
  {
    description: 'a package role dir names its cwd, repo, and role',
    roleDir: '/work/app/.agent/repo=bhrain/role=driver',
    coordinates: { cwd: '/work/app', repo: 'bhrain', role: 'driver' },
  },
  {
    description: 'a closing slash is ignored',
    roleDir: '/work/app/.agent/repo=bhrain/role=driver/',
    coordinates: { cwd: '/work/app', repo: 'bhrain', role: 'driver' },
  },
  {
    description: 'a dot repo slug is a coordinate like any other',
    roleDir: '/work/app/.agent/repo=.this/role=any',
    coordinates: { cwd: '/work/app', repo: '.this', role: 'any' },
  },
  {
    description: 'a cwd that holds an agent-like path keeps its whole prefix',
    roleDir: '/work/.agent/repo=x/role=y/.agent/repo=bhrain/role=driver',
    coordinates: {
      cwd: '/work/.agent/repo=x/role=y',
      repo: 'bhrain',
      role: 'driver',
    },
  },
  {
    description: 'a dir outside `.agent` is null',
    roleDir: '/work/app/src/domain.roles/driver',
    coordinates: null,
  },
  {
    description: 'a repo dir with no role segment is null',
    roleDir: '/work/app/.agent/repo=bhrain',
    coordinates: null,
  },
  {
    description: 'a dir below the role dir is null',
    roleDir: '/work/app/.agent/repo=bhrain/role=driver/briefs',
    coordinates: null,
  },
  {
    description: 'an `.agent/` path with no cwd prefix is null',
    roleDir: '.agent/repo=bhrain/role=driver',
    coordinates: null,
  },
] as const;

describe('asRoleDirCoordinates', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asRoleDirCoordinates({ roleDir: thisCase.roleDir })).toEqual(
        thisCase.coordinates,
      );
    }),
  );
});
