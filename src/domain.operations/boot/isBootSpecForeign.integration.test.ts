import { genTempDir, given, then, when } from 'test-fns';

import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isBootSpecForeign } from './isBootSpecForeign';

/**
 * .what = clamps the one predicate the gate rests on — halt on OUR spec, warn on a foreign one
 * .why = it is the mechanism by which a budget refuses at a file the caller can WRITE. every
 *   remedy a halt names (catalogize, condense, reference, eliminate, raise) is a write, so a
 *   halt on a spec inside a version-pinned store would name fixes the halted party cannot make.
 * .note = `[case3]` clamps a symlink OUTSIDE the role coordinate, bounded by the
 *   `isUnderLinkedRole` guard — this repo's own in-tree symlinks (e.g. a route's `dreams/`
 *   into `.dream/`) stay OURS regardless.
 */
describe('isBootSpecForeign (integration)', () => {
  const testDir = genTempDir({ slug: 'isBootSpecForeign' });

  // the coordinate the invariant is bounded to — `roles link` is its only writer
  const dirRole = resolve(testDir, '.agent/repo=linked-repo/role=lodger');

  // a spec that lives elsewhere, and is the symlink TARGET below
  const dirStore = resolve(testDir, 'store');

  given('[case1] a spec that is a REGULAR FILE under a role coordinate', () => {
    const pathToSpec = resolve(dirRole, 'boot.yml');

    when('[t0] its ownership is read', () => {
      then('it is OURS — a regular file is what this repo writes', () => {
        mkdirSync(dirRole, { recursive: true });
        writeFileSync(pathToSpec, 'always:\n  briefs:\n    say: []\n');

        expect(isBootSpecForeign({ pathToSpec, cwd: testDir })).toEqual(false);
      });
    });
  });

  given('[case2] a spec that is a SYMLINK under a role coordinate', () => {
    const dirLinked = resolve(testDir, '.agent/repo=vendor/role=guest');
    const pathToSpec = resolve(dirLinked, 'boot.yml');
    const pathToTarget = resolve(dirStore, 'vendor.boot.yml');

    when('[t0] its ownership is read', () => {
      then('it is FOREIGN — a symlink here IS how a linked role enters', () => {
        mkdirSync(dirLinked, { recursive: true });
        mkdirSync(dirStore, { recursive: true });
        writeFileSync(pathToTarget, 'budget:\n  tokens: 20\n');
        symlinkSync(pathToTarget, pathToSpec);

        expect(isBootSpecForeign({ pathToSpec, cwd: testDir })).toEqual(true);
      });
    });
  });

  given('[case3] a SYMLINK that sits OUTSIDE any role coordinate', () => {
    // a route manifest symlinked within this repo is OURS — the ownership test binds
    // only under `.agent/repo=$slug/role=$name/`
    const dirRoute = resolve(testDir, '.behavior/v2026_09_17.some-feature');
    const pathToSpec = resolve(dirRoute, 'boot.yml');
    const pathToTarget = resolve(dirStore, 'route.boot.yml');

    when('[t0] its ownership is read', () => {
      then('🔴 it is OURS — the symlink test is bounded, never global', () => {
        mkdirSync(dirRoute, { recursive: true });
        mkdirSync(dirStore, { recursive: true });
        writeFileSync(pathToTarget, 'budget:\n  tokens: 5000\n');
        symlinkSync(pathToTarget, pathToSpec);

        // a bare symlink check with no coordinate bound would also match this case
        expect(isBootSpecForeign({ pathToSpec, cwd: testDir })).toEqual(false);
      });
    });
  });

  given('[case4] a spec that is ABSENT under a role coordinate', () => {
    const pathToSpec = resolve(testDir, '.agent/repo=.this/role=any/boot.yml');

    when('[t0] its ownership is read', () => {
      then(
        'it is OURS — a role with no spec says all, and says it as ours',
        () => {
          // deliberately NOT created. the say-all fallback makes absence routine here, so the
          // predicate must answer rather than raise
          expect(isBootSpecForeign({ pathToSpec, cwd: testDir })).toEqual(
            false,
          );
        },
      );
    });
  });
});
