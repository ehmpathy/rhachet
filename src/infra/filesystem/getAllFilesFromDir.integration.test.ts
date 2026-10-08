import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { getAllFilesFromDir } from './getAllFilesFromDir';

describe('getAllFilesFromDir.integration', () => {
  const testDir = resolve(__dirname, './.temp/getAllFilesFromDir.integration');

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  beforeEach(() => {
    // clean test directory before each test
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  given('directory with broken symlink', () => {
    beforeEach(() => {
      const dir = resolve(testDir, 'broken-symlink');
      mkdirSync(dir, { recursive: true });

      // create valid file
      writeFileSync(resolve(dir, 'valid.txt'), 'valid content');
      chmodSync(resolve(dir, 'valid.txt'), '644');

      // create broken symlink (points to nonexistent target)
      symlinkSync(resolve(dir, 'nonexistent.txt'), resolve(dir, 'broken.txt'));
    });

    when('called on dir with broken symlink', () => {
      then('skips broken symlink without ENOENT error', () => {
        expect(() =>
          getAllFilesFromDir({ dir: resolve(testDir, 'broken-symlink') }),
        ).not.toThrow();
      });

      then('returns only valid files', () => {
        const result = getAllFilesFromDir({
          dir: resolve(testDir, 'broken-symlink'),
        });
        expect(result).toHaveLength(1);
        expect(result[0]).toContain('valid.txt');
      });
    });
  });

  given('nested directory with broken symlink', () => {
    beforeEach(() => {
      const dir = resolve(testDir, 'nested-broken');
      mkdirSync(resolve(dir, 'subdir'), { recursive: true });

      // create valid files
      writeFileSync(resolve(dir, 'root.txt'), 'root');
      writeFileSync(resolve(dir, 'subdir/nested.txt'), 'nested');

      // create broken symlink in subdir
      symlinkSync(
        resolve(dir, 'subdir/nonexistent.txt'),
        resolve(dir, 'subdir/broken.txt'),
      );
    });

    when('called on dir with nested broken symlink', () => {
      then('skips broken symlink and finds valid files', () => {
        const result = getAllFilesFromDir({
          dir: resolve(testDir, 'nested-broken'),
        });
        expect(result).toHaveLength(2);
        expect(result.map((f) => f.split('/').pop())).toEqual(
          expect.arrayContaining(['root.txt', 'nested.txt']),
        );
      });
    });
  });

  given('broken symlink to directory', () => {
    beforeEach(() => {
      const dir = resolve(testDir, 'broken-dir-symlink');
      mkdirSync(dir, { recursive: true });

      // create valid file
      writeFileSync(resolve(dir, 'valid.txt'), 'valid');

      // create broken symlink to nonexistent directory
      symlinkSync(
        resolve(dir, 'nonexistent-dir'),
        resolve(dir, 'broken-dir-link'),
      );
    });

    when('called on dir with broken directory symlink', () => {
      then('skips broken directory symlink without error', () => {
        const result = getAllFilesFromDir({
          dir: resolve(testDir, 'broken-dir-symlink'),
        });
        expect(result).toHaveLength(1);
        expect(result[0]).toContain('valid.txt');
      });
    });
  });

  /**
   * .what = the cycle clamps
   *
   * 🔴 .why = the extant cases above all cover a BROKEN symlink — one that resolves to naught.
   *   a CYCLE is the opposite failure: every hop resolves, so the walk never terminates and the
   *   kernel raises ELOOP at ~40 hops. the two share a keyword and no mechanism, so a broken-link
   *   case cannot clamp a cycle.
   *
   * 🟡 the first case is a real shape: this repo ships `"rhachet": "link:."`, so
   *   `node_modules/rhachet` links back to the repo root, and a `--manifest` file at the repo root
   *   sets the walk root there.
   */
  given('[case1] a dir that links back to itself, as `link:.` does', () => {
    beforeEach(() => {
      const dir = resolve(testDir, 'cycle-self');
      mkdirSync(resolve(dir, 'node_modules'), { recursive: true });
      writeFileSync(resolve(dir, 'boot.yml'), 'always:');

      // the self-link: node_modules/self → the walk root itself
      symlinkSync(dir, resolve(dir, 'node_modules/self'));
    });

    when('[t0] walked', () => {
      then('it terminates rather than raises ELOOP', () => {
        // 🔴 the cycle guard stops the walk from a root → node_modules/self → … loop
        expect(() =>
          getAllFilesFromDir({ dir: resolve(testDir, 'cycle-self') }),
        ).not.toThrow();
      });

      then('it yields each real file exactly once', () => {
        const result = getAllFilesFromDir({
          dir: resolve(testDir, 'cycle-self'),
        });
        // the one real file, never one copy per hop the walk survived
        expect(result.filter((f) => f.endsWith('boot.yml'))).toHaveLength(1);
      });
    });
  });

  given('[case2] two dirs that link to each other', () => {
    beforeEach(() => {
      const dirA = resolve(testDir, 'cycle-mutual/a');
      const dirB = resolve(testDir, 'cycle-mutual/b');
      mkdirSync(dirA, { recursive: true });
      mkdirSync(dirB, { recursive: true });
      writeFileSync(resolve(dirA, 'a.txt'), 'a');
      writeFileSync(resolve(dirB, 'b.txt'), 'b');

      symlinkSync(dirB, resolve(dirA, 'to-b'));
      symlinkSync(dirA, resolve(dirB, 'to-a'));
    });

    when('[t0] walked from one end', () => {
      then('it terminates, and each file appears once', () => {
        const result = getAllFilesFromDir({
          dir: resolve(testDir, 'cycle-mutual/a'),
        });
        expect(result.filter((f) => f.endsWith('a.txt'))).toHaveLength(1);
        expect(result.filter((f) => f.endsWith('b.txt'))).toHaveLength(1);
      });
    });
  });

  /**
   * .what = bounds the cycle guard from below: a dag is not a cycle
   * .why = `alias` and `shared` name one real dir by two peer routes; neither is an ancestor of
   *   the other, so the walk terminates and keeps one yield per route
   * .note = the payload dedupes per real path; see `genBootPayload` `[case3]`
   */
  given('[case3] one dir reachable by two paths, with no cycle at all', () => {
    beforeEach(() => {
      const dir = resolve(testDir, 'dag');
      mkdirSync(resolve(dir, 'shared'), { recursive: true });
      writeFileSync(resolve(dir, 'shared/once.txt'), 'once');

      // a second, non-cyclic route to the same real directory
      symlinkSync(resolve(dir, 'shared'), resolve(dir, 'alias'));
    });

    when('[t0] walked', () => {
      then('it terminates — a dag needs no guard to close it', () => {
        expect(() =>
          getAllFilesFromDir({ dir: resolve(testDir, 'dag') }),
        ).not.toThrow();
      });

      then('the file is yielded once PER ROUTE', () => {
        // two, never one — a collapse here would narrow the cycle clamp above
        const result = getAllFilesFromDir({ dir: resolve(testDir, 'dag') });
        expect(result.filter((f) => f.endsWith('once.txt'))).toHaveLength(2);
      });
    });
  });

  /**
   * .what = a walk root that is a FILE refuses as a `ConstraintError` (exit 2), never an empty
   *   list (`rule.require.exit-code-semantics`, `rule.forbid.failhide`)
   * .why = the path comes from caller input (a role dir or a declared `*.dirs` uri), so the
   *   caller can repair it
   */
  given('[case4] a walk root that is a FILE rather than a dir', () => {
    const pathFile = resolve(testDir, 'not-a-dir.txt');

    beforeEach(() => {
      writeFileSync(pathFile, 'a file');
    });

    when('[t0] walked', () => {
      then('it refuses as a CALLER defect, never a malfunction', () => {
        // 🔴 the exit code is what this row buys. a raw `ENOTDIR` `Error` exits 1 and sends a
        //    human to read server logs for a path they could have retyped
        const error = getError(() => getAllFilesFromDir({ dir: pathFile }));

        expect(error).toBeInstanceOf(ConstraintError);
      });

      then('the refusal names what it found, and how to repair it', () => {
        const error = getError(() => getAllFilesFromDir({ dir: pathFile }));

        expect(error.message).toContain('a regular file');
        expect(error.message).toContain('rename the file');
      });

      then(
        'it does NOT return an empty list — a file at the root is no absence',
        () => {
          // 🔴 the bound from BELOW. a `[]` here is the silent answer, and on the budget gate's
          //    denominator it reads as "this dir holds no files" for a path that holds a file
          expect(() => getAllFilesFromDir({ dir: pathFile })).toThrow();
        },
      );
    });
  });

  /**
   * .what = bounds the per-entry `ENOENT` arm: a broken symlink skips; a vanished entry refuses
   * .why = a broken link is a normal state of a linked-role tree, and `lstatSync` stats the
   *   link, so it lstats cleanly where a vanished entry raises `ENOENT` again
   * .note = the vanish arm is a kernel race with no deterministic drive
   *   (`rule.forbid.integration.mocks`), so this case clamps the skip's width
   */
  given('[case5] a stale link beside a real file', () => {
    beforeEach(() => {
      const dir = resolve(testDir, 'enoent-arm');
      const sub = resolve(dir, 'sub');
      mkdirSync(sub, { recursive: true });
      writeFileSync(resolve(dir, 'real.txt'), 'real');

      // a broken link at the top level, and a second one a level down — both lstat cleanly,
      // so both are stale-link skips rather than vanishes
      symlinkSync(resolve(dir, 'gone.txt'), resolve(dir, 'stale.txt'));
      symlinkSync(resolve(sub, 'gone.txt'), resolve(sub, 'stale.txt'));
    });

    when('[t0] walked', () => {
      then('the stale links are skipped, never refused', () => {
        // 🔴 it does NOT throw. a repair that refused every per-entry `ENOENT` would halt a boot
        //    on a stale link, which is a normal state of a tree `roles link` maintains
        expect(() =>
          getAllFilesFromDir({ dir: resolve(testDir, 'enoent-arm') }),
        ).not.toThrow();
      });

      then('the real file is still yielded', () => {
        const result = getAllFilesFromDir({
          dir: resolve(testDir, 'enoent-arm'),
        });
        expect(result.filter((f) => f.endsWith('real.txt'))).toHaveLength(1);
      });

      then('no stale link enters the list', () => {
        // the walk reports what it can READ. a stale link is not a readable file, so a count of
        // one is the whole answer — and on a budget gate the count IS the measurement
        const result = getAllFilesFromDir({
          dir: resolve(testDir, 'enoent-arm'),
        });
        expect(result).toHaveLength(1);
      });
    });
  });

  /**
   * .what = an unreadable dir throws, raw and unclassified (exit 1)
   * .why = a skip would undercount, and an undercount passes a boot the budget gate must refuse
   * .note = the fault arrives at `readdirSync`, not the per-entry `statSync`; a root process
   *   ignores mode 000, so the probe fails loud with the uid (`rule.require.failfast`)
   */
  given('[case6] a dir the process may not read', () => {
    const dirRoot = resolve(testDir, 'eacces-arm');
    const dirLocked = resolve(dirRoot, 'locked');

    beforeEach(() => {
      mkdirSync(dirLocked, { recursive: true });
      writeFileSync(resolve(dirRoot, 'readable.txt'), 'readable');
      writeFileSync(resolve(dirLocked, 'hidden.txt'), 'hidden');

      chmodSync(dirLocked, 0o000);

      // fail loud rather than skip an undetected refusal (rule.require.failfast)
      const refusal = ((): NodeJS.ErrnoException | null => {
        try {
          readdirSync(dirLocked);
          return null;
        } catch (error) {
          return error as NodeJS.ErrnoException;
        }
      })();

      if (!refusal) {
        chmodSync(dirLocked, 0o755); // restore first — a 000 dir poisons the temp-dir prune
        throw new ConstraintError(
          '[case6] needs a dir that refuses a read, and mode 000 is not enforced on this host',
          {
            hint: 'run this case as a non-root user — uid 0 ignores the mode bits',
            dir: dirLocked,
            uid: process.getuid?.() ?? null,
          },
        );
      }

      // 🚨 allowlist the refusal, never absorb it. only EACCES means "it exists and refuses a
      //   read", which IS the premise. any other code means the premise is absent, and a bare
      //   `catch → proceed` would read that as "unreadable" and let the case run over an
      //   unexercised path (`rule.forbid.failhide`)
      if (refusal.code !== 'EACCES') {
        chmodSync(dirLocked, 0o755);
        throw new ConstraintError(
          '[case6] needs the locked dir to refuse a read with EACCES, and the probe failed for another reason',
          {
            hint: 'run this case on a posix host where a mode 000 dir raises EACCES on readdir',
            dir: dirLocked,
            code: refusal.code ?? null,
            probeError: refusal.message,
          },
        );
      }
    });

    afterEach(() => {
      // 🔴 restore, ALWAYS. the suite-wide `beforeEach` prunes `testDir` with a recursive
      //    `rmSync`, and a mode 000 dir refuses that prune — so a skipped restore does not
      //    merely leak, it breaks every case that runs after this one
      if (existsSync(dirLocked)) chmodSync(dirLocked, 0o755);
    });

    when('[t0] walked', () => {
      then('it throws rather than skip the unreadable dir in silence', () => {
        // 🔴 the invariant: an unreadable dir fails loud, so a budget gate never undercounts
        expect(() => getAllFilesFromDir({ dir: dirRoot })).toThrow();
      });

      then('the fault it raises is the EACCES the kernel gave it', () => {
        // the narrow `ENOENT`-only catch let the code through unchanged, which is what keeps a
        // permission fault distinguishable from a broken link (`rule.forbid.failhide`)
        const error = getError(() => getAllFilesFromDir({ dir: dirRoot }));
        expect((error as NodeJS.ErrnoException).code).toEqual('EACCES');
      });

      then('it is NOT yet classified as a caller-fixable refusal', () => {
        // 🔴 pins the deferred state: a raw errno is not a `HelpfulError`, so this exits 1 —
        //    a malfunction code for the caller's own unreadable dir
        const error = getError(() => getAllFilesFromDir({ dir: dirRoot }));
        expect(error).not.toBeInstanceOf(ConstraintError);
      });
    });
  });

  given('[case7] a tree with a node_modules subdir and a skip list', () => {
    const dirRoot = resolve(testDir, 'case7');

    beforeEach(() => {
      mkdirSync(resolve(dirRoot, 'briefs'), { recursive: true });
      mkdirSync(resolve(dirRoot, 'node_modules/pkg'), { recursive: true });
      writeFileSync(resolve(dirRoot, 'briefs/core.md'), '# core');
      writeFileSync(resolve(dirRoot, 'node_modules/pkg/index.js'), 'x');
    });

    when('[t0] walked with node_modules on the skip list', () => {
      then('the skipped tree contributes no file', () => {
        const files = getAllFilesFromDir(
          { dir: dirRoot },
          { skipDirNames: ['node_modules'] },
        );
        expect(files).toEqual([resolve(dirRoot, 'briefs/core.md')]);
      });
    });

    when('[t1] walked with no skip list', () => {
      then('every file is collected, as before', () => {
        const files = getAllFilesFromDir({ dir: dirRoot }).sort();
        expect(files).toEqual(
          [
            resolve(dirRoot, 'briefs/core.md'),
            resolve(dirRoot, 'node_modules/pkg/index.js'),
          ].sort(),
        );
      });
    });
  });

  /**
   * .what = a root whose PARENT component is a regular file reads as absent, exactly as an
   *   ENOENT root does
   * .why = `statSync` raises ENOTDIR there, and an unclassified raw `Error` exits 1 — a
   *   malfunction code for a path the caller can retype
   *   (define.statsync-and-lstatsync-suppress-different-errnos)
   */
  given('[case8] a root that runs THROUGH a regular file', () => {
    const pathFile = resolve(testDir, 'case8.txt');

    beforeEach(() => {
      writeFileSync(pathFile, 'a file');
    });

    when('[t0] walked', () => {
      then('it returns an empty list, as for a root that names naught', () => {
        const files = getAllFilesFromDir({ dir: resolve(pathFile, 'briefs') });
        expect(files).toEqual([]);
      });
    });
  });
});

describe('getAllFilesFromDir (walk basics)', () => {
  const testDir = resolve(__dirname, './.temp/getAllFilesFromDir');

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  beforeEach(() => {
    // clean test directory before each test
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  given('directory does not exist', () => {
    when('called with nonexistent path', () => {
      then('returns empty array', () => {
        const result = getAllFilesFromDir({
          dir: resolve(testDir, 'nonexistent'),
        });
        expect(result).toEqual([]);
      });
    });
  });

  given('empty directory', () => {
    beforeEach(() => {
      mkdirSync(resolve(testDir, 'empty'), { recursive: true });
    });

    when('called on empty dir', () => {
      then('returns empty array', () => {
        const result = getAllFilesFromDir({ dir: resolve(testDir, 'empty') });
        expect(result).toEqual([]);
      });
    });
  });

  given('directory with files', () => {
    beforeEach(() => {
      const dir = resolve(testDir, 'with-files');
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'file1.txt'), 'content1');
      writeFileSync(resolve(dir, 'file2.txt'), 'content2');
    });

    when('called on dir with files', () => {
      then('returns all files', () => {
        const result = getAllFilesFromDir({
          dir: resolve(testDir, 'with-files'),
        });
        expect(result).toHaveLength(2);
        expect(result.map((f) => f.split('/').pop())).toEqual(
          expect.arrayContaining(['file1.txt', 'file2.txt']),
        );
      });
    });
  });

  given('directory with nested subdirectories', () => {
    beforeEach(() => {
      const dir = resolve(testDir, 'nested');
      mkdirSync(resolve(dir, 'sub1/sub2'), { recursive: true });
      writeFileSync(resolve(dir, 'root.txt'), 'root');
      writeFileSync(resolve(dir, 'sub1/mid.txt'), 'mid');
      writeFileSync(resolve(dir, 'sub1/sub2/deep.txt'), 'deep');
    });

    when('called on nested dir', () => {
      then('recursively finds all files', () => {
        const result = getAllFilesFromDir({ dir: resolve(testDir, 'nested') });
        expect(result).toHaveLength(3);
        expect(result.map((f) => f.split('/').pop())).toEqual(
          expect.arrayContaining(['root.txt', 'mid.txt', 'deep.txt']),
        );
      });
    });
  });

  given('directory with valid symlink to file', () => {
    beforeEach(() => {
      const dir = resolve(testDir, 'symlink-file');
      mkdirSync(dir, { recursive: true });

      // create real file
      writeFileSync(resolve(dir, 'real.txt'), 'real content');

      // create symlink to real file
      symlinkSync(resolve(dir, 'real.txt'), resolve(dir, 'link.txt'));
    });

    when('called on dir with symlinked file', () => {
      then('includes symlinked file', () => {
        const result = getAllFilesFromDir({
          dir: resolve(testDir, 'symlink-file'),
        });
        expect(result).toHaveLength(2);
        expect(result.map((f) => f.split('/').pop())).toEqual(
          expect.arrayContaining(['real.txt', 'link.txt']),
        );
      });
    });
  });

  given('directory with valid symlink to directory', () => {
    beforeEach(() => {
      const dir = resolve(testDir, 'symlink-dir');
      mkdirSync(resolve(dir, 'real-subdir'), { recursive: true });

      // create file in real subdir
      writeFileSync(resolve(dir, 'real-subdir/nested.txt'), 'nested');

      // create symlink to real subdir
      symlinkSync(resolve(dir, 'real-subdir'), resolve(dir, 'linked-subdir'));
    });

    when('called on dir with symlinked directory', () => {
      then('traverses symlinked directory', () => {
        const result = getAllFilesFromDir({
          dir: resolve(testDir, 'symlink-dir'),
        });
        expect(result).toHaveLength(2);
      });
    });
  });

  given('directory with broken symlink', () => {
    beforeEach(() => {
      const dir = resolve(testDir, 'broken-symlink');
      mkdirSync(dir, { recursive: true });

      // create valid file
      writeFileSync(resolve(dir, 'valid.txt'), 'valid content');
      chmodSync(resolve(dir, 'valid.txt'), '644');

      // create broken symlink (points to nonexistent target)
      symlinkSync(resolve(dir, 'nonexistent.txt'), resolve(dir, 'broken.txt'));
    });

    when('called on dir with broken symlink', () => {
      then('skips broken symlink without error', () => {
        expect(() =>
          getAllFilesFromDir({ dir: resolve(testDir, 'broken-symlink') }),
        ).not.toThrow();
      });

      then('returns only valid files', () => {
        const result = getAllFilesFromDir({
          dir: resolve(testDir, 'broken-symlink'),
        });
        expect(result).toHaveLength(1);
        expect(result[0]).toContain('valid.txt');
      });
    });
  });

  given('nested directory with broken symlink', () => {
    beforeEach(() => {
      const dir = resolve(testDir, 'nested-broken');
      mkdirSync(resolve(dir, 'subdir'), { recursive: true });

      // create valid files
      writeFileSync(resolve(dir, 'root.txt'), 'root');
      writeFileSync(resolve(dir, 'subdir/nested.txt'), 'nested');

      // create broken symlink in subdir
      symlinkSync(
        resolve(dir, 'subdir/nonexistent.txt'),
        resolve(dir, 'subdir/broken.txt'),
      );
    });

    when('called on dir with nested broken symlink', () => {
      then('skips broken symlink and finds valid files', () => {
        const result = getAllFilesFromDir({
          dir: resolve(testDir, 'nested-broken'),
        });
        expect(result).toHaveLength(2);
        expect(result.map((f) => f.split('/').pop())).toEqual(
          expect.arrayContaining(['root.txt', 'nested.txt']),
        );
      });
    });
  });

  given('directory that is itself a symlink to valid target', () => {
    beforeEach(() => {
      const realDir = resolve(testDir, 'real-target');
      mkdirSync(realDir, { recursive: true });
      writeFileSync(resolve(realDir, 'file.txt'), 'content');

      // create symlink to real directory
      symlinkSync(realDir, resolve(testDir, 'linked-target'));
    });

    when('called on symlinked directory', () => {
      then('traverses the symlink target', () => {
        const result = getAllFilesFromDir({
          dir: resolve(testDir, 'linked-target'),
        });
        expect(result).toHaveLength(1);
        expect(result[0]).toContain('file.txt');
      });
    });
  });
});
