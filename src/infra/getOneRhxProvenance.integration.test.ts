import { genTempDir, given, then, when } from 'test-fns';

import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneRhxProvenance } from './getOneRhxProvenance';

/**
 * .what = the root of this checkout, which is the rhachet this test process runs
 */
const RHACHET_ROOT = join(__dirname, '../..');

/**
 * .what = a temp repo whose node_modules/rhachet holds the given manifest, or none
 */
const genRepoWithPin = (input: {
  slug: string;
  manifest: Record<string, unknown> | null;
}): string => {
  const repoPath = genTempDir({ slug: input.slug });
  if (input.manifest === null) return repoPath;
  const pinDir = join(repoPath, 'node_modules', 'rhachet');
  mkdirSync(pinDir, { recursive: true });
  writeFileSync(join(pinDir, 'package.json'), JSON.stringify(input.manifest));
  return repoPath;
};

describe('getOneRhxProvenance', () => {
  given('[case1] any repo', () => {
    when('[t0] the provenance is read', () => {
      then('active is the rhachet this process runs, with its version', () => {
        const repoPath = genRepoWithPin({
          slug: 'rhx-provenance-active',
          manifest: null,
        });
        const manifest = JSON.parse(
          readFileSync(join(RHACHET_ROOT, 'package.json'), 'utf8'),
        ) as { version: string };
        expect(getOneRhxProvenance({ repoPath }).active).toEqual({
          path: realpathSync(RHACHET_ROOT),
          version: manifest.version,
        });
      });
    });
  });

  given('[case2] a repo that pins rhachet', () => {
    when('[t0] the provenance is read', () => {
      then('pinned names the pin dir and its version', () => {
        const repoPath = genRepoWithPin({
          slug: 'rhx-provenance-pinned',
          manifest: { name: 'rhachet', version: '9.9.9' },
        });
        expect(getOneRhxProvenance({ repoPath }).pinned).toEqual({
          path: realpathSync(join(repoPath, 'node_modules', 'rhachet')),
          version: '9.9.9',
        });
      });
    });
  });

  given('[case3] a repo with no node_modules/rhachet', () => {
    when('[t0] the provenance is read', () => {
      then('pinned is null', () => {
        const repoPath = genRepoWithPin({
          slug: 'rhx-provenance-absent',
          manifest: null,
        });
        expect(getOneRhxProvenance({ repoPath }).pinned).toBeNull();
      });
    });
  });

  given(
    '[case4] a node_modules/rhachet dir whose manifest names another package',
    () => {
      when('[t0] the provenance is read', () => {
        then('pinned is null', () => {
          const repoPath = genRepoWithPin({
            slug: 'rhx-provenance-foreign',
            manifest: { name: 'not-rhachet', version: '1.0.0' },
          });
          expect(getOneRhxProvenance({ repoPath }).pinned).toBeNull();
        });
      });
    },
  );
});
