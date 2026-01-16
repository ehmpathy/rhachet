import * as fs from 'fs';
import { given, then, useBeforeAll, when } from 'test-fns';

// mock modules before function import
jest.mock('fs');
jest.mock('rhachet-artifact-git');

import { getGitRepoRoot } from 'rhachet-artifact-git';

import { getLinkedRolesWithHooks } from './getLinkedRolesWithHooks';

const mockExistsSync = fs.existsSync as jest.Mock;
const mockReaddirSync = fs.readdirSync as jest.Mock;
const mockGetGitRepoRoot = getGitRepoRoot as jest.Mock;

describe('getLinkedRolesWithHooks', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  given('[case1] no .agent/ directory', () => {
    when('[t0] .agent does not exist', () => {
      const scene = useBeforeAll(async () => {
        mockGetGitRepoRoot.mockResolvedValue('/test-repo');
        mockExistsSync.mockReturnValue(false);
        return getLinkedRolesWithHooks({ from: '/test-repo' });
      });

      then('returns empty roles array', () => {
        expect(scene.roles).toHaveLength(0);
      });

      then('returns empty errors array', () => {
        expect(scene.errors).toHaveLength(0);
      });
    });
  });

  given('[case2] only repo=.this exists', () => {
    when('[t0] .agent has only repo=.this', () => {
      const scene = useBeforeAll(async () => {
        mockGetGitRepoRoot.mockResolvedValue('/test-repo');
        mockExistsSync.mockReturnValue(true);
        mockReaddirSync.mockReturnValue(['repo=.this']);
        return getLinkedRolesWithHooks({ from: '/test-repo' });
      });

      then('returns empty roles array', () => {
        expect(scene.roles).toHaveLength(0);
      });

      then('returns empty errors array', () => {
        expect(scene.errors).toHaveLength(0);
      });
    });
  });

  given('[case3] linked role from package that cannot be loaded', () => {
    when('[t0] package does not exist', () => {
      const scene = useBeforeAll(async () => {
        mockGetGitRepoRoot.mockResolvedValue('/test-repo');
        mockExistsSync.mockReturnValue(true);
        mockReaddirSync
          .mockReturnValueOnce(['repo=.this', 'repo=nonexistent']) // .agent/
          .mockReturnValueOnce(['role=mechanic', 'role=designer']); // .agent/repo=nonexistent/

        // package rhachet-roles-nonexistent does not exist, so import will fail
        return getLinkedRolesWithHooks({ from: '/test-repo' });
      });

      then('returns empty roles array', () => {
        expect(scene.roles).toHaveLength(0);
      });

      then('returns errors for each linked role', () => {
        expect(scene.errors).toHaveLength(2);
        expect(scene.errors[0]?.repoSlug).toEqual('nonexistent');
        expect(scene.errors[0]?.roleSlug).toEqual('mechanic');
        expect(scene.errors[1]?.roleSlug).toEqual('designer');
      });

      then('error message indicates package resolution failed', () => {
        expect(scene.errors[0]?.error.message).toContain(
          'rhachet-roles-nonexistent',
        );
      });
    });
  });
});
