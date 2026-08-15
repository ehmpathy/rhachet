import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { isRepoLinked } from './isRepoLinked';

describe('isRepoLinked.integration', () => {
  given('[case1] a repo with NO .agent/ directory (never linked)', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'hasAgent-unlinked' });
      return { repoPath };
    });

    when('[t0] the repo is probed', () => {
      then('it reports the repo is NOT linked', () => {
        expect(isRepoLinked({ repoPath: scene.repoPath })).toEqual(false);
      });
    });
  });

  given('[case2] a repo WITH an .agent/ directory (linked)', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'hasAgent-linked' });
      mkdirSync(join(repoPath, '.agent'), { recursive: true });
      return { repoPath };
    });

    when('[t0] the repo is probed', () => {
      then('it reports the repo IS linked', () => {
        expect(isRepoLinked({ repoPath: scene.repoPath })).toEqual(true);
      });
    });
  });
});
