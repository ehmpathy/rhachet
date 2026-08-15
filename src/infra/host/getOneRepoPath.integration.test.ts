import { MalfunctionError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { mkdirSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { getOneRepoPath } from './getOneRepoPath';

describe('getOneRepoPath.integration', () => {
  given('[case1] a real repo dir reached through a symlink', () => {
    const scene = useBeforeAll(async () => {
      const base = genTempDir({ slug: 'getOneRepoPath-symlink' });
      const realDir = join(base, 'realrepo');
      const linkDir = join(base, 'linkrepo');
      mkdirSync(realDir, { recursive: true });
      symlinkSync(realDir, linkDir);
      // the canonical answer: what realpath resolves the real dir to
      const canonical = realpathSync(realDir);
      return { realDir, linkDir, canonical };
    });

    when('[t0] canonicalized from the symlink path', () => {
      then('the symlink hop is expanded to the true path', () => {
        expect(getOneRepoPath({ from: scene.linkDir })).toEqual(
          scene.canonical,
        );
      });

      then(
        'the symlink and the real dir canonicalize to the SAME string',
        () => {
          expect(getOneRepoPath({ from: scene.linkDir })).toEqual(
            getOneRepoPath({ from: scene.realDir }),
          );
        },
      );
    });
  });

  given('[case2] a repo path with a slash suffix', () => {
    const scene = useBeforeAll(async () => {
      const base = genTempDir({ slug: 'getOneRepoPath-slash' });
      const realDir = join(base, 'realrepo');
      mkdirSync(realDir, { recursive: true });
      return { realDir, canonical: realpathSync(realDir) };
    });

    when('[t0] canonicalized with and without the slash suffix', () => {
      then("'/repo' and '/repo/' never fork identity", () => {
        expect(getOneRepoPath({ from: scene.realDir + '/' })).toEqual(
          scene.canonical,
        );
        expect(getOneRepoPath({ from: scene.realDir })).toEqual(
          scene.canonical,
        );
      });
    });
  });

  given('[case3] a path that has been pruned from disk', () => {
    const scene = useBeforeAll(async () => {
      const base = genTempDir({ slug: 'getOneRepoPath-pruned' });
      const gone = join(base, 'gonerepo');
      mkdirSync(gone, { recursive: true });
      rmSync(gone, { recursive: true, force: true }); // prune it after capture
      return { gone };
    });

    when('[t0] canonicalized from the absent path', () => {
      then(
        'it fails loud with a MalfunctionError, never a silent empty',
        async () => {
          const error = await getError(() =>
            getOneRepoPath({ from: scene.gone }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain('cannot canonicalize repoPath');
        },
      );
    });
  });
});
