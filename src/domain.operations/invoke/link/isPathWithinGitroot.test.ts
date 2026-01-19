import { given, then, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import { isPathWithinGitroot } from './isPathWithinGitroot';

describe('isPathWithinGitroot', () => {
  given('[case1] path inside gitroot', () => {
    const context = new ContextCli({
      cwd: '/repo',
      gitroot: '/repo',
    });

    when('[t0] path is a subdirectory of gitroot', () => {
      then('returns true', () => {
        const result = isPathWithinGitroot({ path: '/repo/dist/foo' }, context);
        expect(result).toBe(true);
      });
    });

    when('[t1] path is deeply nested inside gitroot', () => {
      then('returns true', () => {
        const result = isPathWithinGitroot(
          { path: '/repo/src/domain/objects/Foo.ts' },
          context,
        );
        expect(result).toBe(true);
      });
    });
  });

  given('[case2] path outside gitroot', () => {
    const context = new ContextCli({
      cwd: '/repo',
      gitroot: '/repo',
    });

    when('[t0] path is in /tmp', () => {
      then('returns false', () => {
        const result = isPathWithinGitroot(
          { path: '/tmp/node_modules/pkg' },
          context,
        );
        expect(result).toBe(false);
      });
    });

    when('[t1] path is in a completely different directory', () => {
      then('returns false', () => {
        const result = isPathWithinGitroot(
          { path: '/home/user/other-project/src' },
          context,
        );
        expect(result).toBe(false);
      });
    });
  });

  given('[case3] path with similar prefix but different root', () => {
    const context = new ContextCli({
      cwd: '/repo',
      gitroot: '/repo',
    });

    when('[t0] path starts with gitroot as prefix but is a sibling dir', () => {
      then('returns false', () => {
        // /repo-other starts with /repo but is not inside /repo
        const result = isPathWithinGitroot(
          { path: '/repo-other/dist/foo' },
          context,
        );
        expect(result).toBe(false);
      });
    });

    when('[t1] path has gitroot embedded in the middle', () => {
      then('returns false', () => {
        const result = isPathWithinGitroot(
          { path: '/home/repo/dist/foo' },
          context,
        );
        expect(result).toBe(false);
      });
    });
  });

  given('[case4] path equals gitroot exactly', () => {
    const context = new ContextCli({
      cwd: '/repo',
      gitroot: '/repo',
    });

    when('[t0] path is identical to gitroot', () => {
      then('returns true', () => {
        const result = isPathWithinGitroot({ path: '/repo' }, context);
        expect(result).toBe(true);
      });
    });

    when('[t1] path is gitroot with terminal slash normalized', () => {
      then('returns true', () => {
        // resolve() will normalize /repo/ to /repo
        const result = isPathWithinGitroot({ path: '/repo/' }, context);
        expect(result).toBe(true);
      });
    });
  });
});
