import { given, then, when } from 'test-fns';

import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { symlinkResourceDirectories } from './symlinkResourceDirectories';

/**
 * .what = recursively restore write permissions so directory can be deleted
 * .why = some tests make directories readonly, cleanup needs to undo that first
 */
const restoreWritePermissions = (dirPath: string): void => {
  if (!existsSync(dirPath)) return;
  const lstats = lstatSync(dirPath);
  if (lstats.isSymbolicLink()) return;
  if (!lstats.isDirectory()) {
    chmodSync(dirPath, 0o755);
    return;
  }
  chmodSync(dirPath, 0o755);
  for (const entry of readdirSync(dirPath)) {
    restoreWritePermissions(resolve(dirPath, entry));
  }
};

describe('symlinkResourceDirectories', () => {
  const testDir = join(
    tmpdir(),
    `rhachet-test-symlinkResourceDirectories-${process.pid}`,
  );
  const originalCwd = process.cwd();

  const tmp = {
    path: testDir,
    rm: (relativePath: string) => {
      const targetPath = resolve(testDir, relativePath);
      restoreWritePermissions(targetPath);
      rmSync(targetPath, { force: true, recursive: true });
    },
  };

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });
  afterAll(() => {
    process.chdir(originalCwd);
  });

  beforeEach(() => {
    tmp.rm('.agent');
    tmp.rm('source');
  });

  given('[case1] single-dir mode with no prior symlink', () => {
    beforeEach(() => {
      // create source directory with files
      const sourceBriefs = resolve(tmp.path, 'source/briefs');
      mkdirSync(sourceBriefs, { recursive: true });
      writeFileSync(resolve(sourceBriefs, 'readme.md'), '# briefs');
      mkdirSync(resolve(sourceBriefs, 'practices'), { recursive: true });
      writeFileSync(
        resolve(sourceBriefs, 'practices/rule.md'),
        '# rule content',
      );
    });

    when('[t0] symlinkResourceDirectories is called', () => {
      then('creates symlink to source directory', () => {
        const targetDir = resolve(tmp.path, '.agent/repo=test/role=any/briefs');

        symlinkResourceDirectories({
          sourceDirs: { uri: 'source/briefs' },
          targetDir,
          resourceName: 'briefs',
        });

        expect(existsSync(targetDir)).toBe(true);
        expect(lstatSync(targetDir).isSymbolicLink()).toBe(true);
      });

      then('symlink target contains expected files', () => {
        const targetDir = resolve(tmp.path, '.agent/repo=test/role=any/briefs');

        symlinkResourceDirectories({
          sourceDirs: { uri: 'source/briefs' },
          targetDir,
          resourceName: 'briefs',
        });

        expect(existsSync(resolve(targetDir, 'readme.md'))).toBe(true);
        expect(existsSync(resolve(targetDir, 'practices/rule.md'))).toBe(true);
      });
    });
  });

  given('[case2] single-dir mode with prior symlink', () => {
    beforeEach(() => {
      // create two source directories
      const sourceBriefsOld = resolve(tmp.path, 'source/briefs-old');
      const sourceBriefsNew = resolve(tmp.path, 'source/briefs-new');
      mkdirSync(sourceBriefsOld, { recursive: true });
      mkdirSync(sourceBriefsNew, { recursive: true });
      writeFileSync(resolve(sourceBriefsOld, 'old.md'), '# old');
      writeFileSync(resolve(sourceBriefsNew, 'new.md'), '# new');

      // create prior symlink to old source
      const targetDir = resolve(tmp.path, '.agent/repo=test/role=any/briefs');
      mkdirSync(resolve(targetDir, '..'), { recursive: true });
      symlinkSync(sourceBriefsOld, targetDir);
    });

    when('[t0] symlinkResourceDirectories is called with new source', () => {
      then('replaces prior symlink with new one', () => {
        const targetDir = resolve(tmp.path, '.agent/repo=test/role=any/briefs');

        symlinkResourceDirectories({
          sourceDirs: { uri: 'source/briefs-new' },
          targetDir,
          resourceName: 'briefs',
        });

        expect(lstatSync(targetDir).isSymbolicLink()).toBe(true);
        expect(existsSync(resolve(targetDir, 'new.md'))).toBe(true);
        expect(existsSync(resolve(targetDir, 'old.md'))).toBe(false);
      });
    });
  });

  given('[case3] single-dir mode with readonly symlink target', () => {
    beforeEach(() => {
      // create source directory with readonly permissions (simulates node_modules)
      const sourceBriefsOld = resolve(tmp.path, 'source/briefs-old');
      const sourceBriefsNew = resolve(tmp.path, 'source/briefs-new');
      mkdirSync(sourceBriefsOld, { recursive: true });
      mkdirSync(resolve(sourceBriefsOld, 'practices'), { recursive: true });
      writeFileSync(resolve(sourceBriefsOld, 'practices/rule.md'), '# rule');
      mkdirSync(sourceBriefsNew, { recursive: true });
      writeFileSync(resolve(sourceBriefsNew, 'new.md'), '# new');

      // make old source readonly (simulates setDirectoryReadonlyExecutable)
      chmodSync(resolve(sourceBriefsOld, 'practices/rule.md'), 0o555);
      chmodSync(resolve(sourceBriefsOld, 'practices'), 0o555);
      chmodSync(sourceBriefsOld, 0o555);

      // create prior symlink to readonly source
      const targetDir = resolve(tmp.path, '.agent/repo=test/role=any/briefs');
      mkdirSync(resolve(targetDir, '..'), { recursive: true });
      symlinkSync(sourceBriefsOld, targetDir);
    });

    when('[t0] symlinkResourceDirectories is called with new source', () => {
      then('replaces symlink without recurse into readonly target', () => {
        const targetDir = resolve(tmp.path, '.agent/repo=test/role=any/briefs');

        // this would fail with EACCES if we tried to rmSync through the symlink
        symlinkResourceDirectories({
          sourceDirs: { uri: 'source/briefs-new' },
          targetDir,
          resourceName: 'briefs',
        });

        expect(lstatSync(targetDir).isSymbolicLink()).toBe(true);
        expect(existsSync(resolve(targetDir, 'new.md'))).toBe(true);
      });
    });
  });

  given('[case4] array-dir mode with no prior symlinks', () => {
    beforeEach(() => {
      // create multiple source directories
      const practicesDir = resolve(tmp.path, 'source/practices');
      const lessonsDir = resolve(tmp.path, 'source/lessons');
      mkdirSync(practicesDir, { recursive: true });
      mkdirSync(lessonsDir, { recursive: true });
      writeFileSync(resolve(practicesDir, 'rule.md'), '# rule');
      writeFileSync(resolve(lessonsDir, 'howto.md'), '# howto');
    });

    when('[t0] symlinkResourceDirectories is called with array', () => {
      then('creates symlinks for each source within target dir', () => {
        const targetDir = resolve(tmp.path, '.agent/repo=test/role=any/briefs');

        symlinkResourceDirectories({
          sourceDirs: [{ uri: 'source/practices' }, { uri: 'source/lessons' }],
          targetDir,
          resourceName: 'briefs',
        });

        expect(existsSync(targetDir)).toBe(true);
        expect(lstatSync(targetDir).isDirectory()).toBe(true);

        const practicesSymlink = resolve(targetDir, 'practices');
        const lessonsSymlink = resolve(targetDir, 'lessons');
        expect(lstatSync(practicesSymlink).isSymbolicLink()).toBe(true);
        expect(lstatSync(lessonsSymlink).isSymbolicLink()).toBe(true);
        expect(existsSync(resolve(practicesSymlink, 'rule.md'))).toBe(true);
        expect(existsSync(resolve(lessonsSymlink, 'howto.md'))).toBe(true);
      });
    });
  });

  given('[case5] array-dir mode with prior symlinks', () => {
    beforeEach(() => {
      // create source directories
      const practicesOld = resolve(tmp.path, 'source/practices-old');
      const practicesNew = resolve(tmp.path, 'source/practices-new');
      mkdirSync(practicesOld, { recursive: true });
      mkdirSync(practicesNew, { recursive: true });
      writeFileSync(resolve(practicesOld, 'old.md'), '# old');
      writeFileSync(resolve(practicesNew, 'new.md'), '# new');

      // create target dir with prior symlink
      const targetDir = resolve(tmp.path, '.agent/repo=test/role=any/briefs');
      mkdirSync(targetDir, { recursive: true });
      symlinkSync(practicesOld, resolve(targetDir, 'practices-new'));
    });

    when('[t0] symlinkResourceDirectories is called with new sources', () => {
      then('replaces prior symlinks with new ones', () => {
        const targetDir = resolve(tmp.path, '.agent/repo=test/role=any/briefs');

        symlinkResourceDirectories({
          sourceDirs: [{ uri: 'source/practices-new' }],
          targetDir,
          resourceName: 'briefs',
        });

        const symlink = resolve(targetDir, 'practices-new');
        expect(lstatSync(symlink).isSymbolicLink()).toBe(true);
        expect(existsSync(resolve(symlink, 'new.md'))).toBe(true);
        expect(existsSync(resolve(symlink, 'old.md'))).toBe(false);
      });
    });
  });

  given('[case6] array-dir mode with readonly symlink targets', () => {
    beforeEach(() => {
      // create source directories with readonly permissions
      const practicesOld = resolve(tmp.path, 'source/practices-old');
      const practicesNew = resolve(tmp.path, 'source/practices-new');
      mkdirSync(practicesOld, { recursive: true });
      mkdirSync(resolve(practicesOld, 'nested'), { recursive: true });
      writeFileSync(resolve(practicesOld, 'nested/rule.md'), '# old rule');
      mkdirSync(practicesNew, { recursive: true });
      writeFileSync(resolve(practicesNew, 'new.md'), '# new');

      // make old source readonly
      chmodSync(resolve(practicesOld, 'nested/rule.md'), 0o555);
      chmodSync(resolve(practicesOld, 'nested'), 0o555);
      chmodSync(practicesOld, 0o555);

      // create target dir with prior symlink to readonly source
      const targetDir = resolve(tmp.path, '.agent/repo=test/role=any/briefs');
      mkdirSync(targetDir, { recursive: true });
      symlinkSync(practicesOld, resolve(targetDir, 'practices-new'));
    });

    when('[t0] symlinkResourceDirectories is called with new sources', () => {
      then('replaces symlinks without recurse into readonly targets', () => {
        const targetDir = resolve(tmp.path, '.agent/repo=test/role=any/briefs');

        // this would fail with EACCES if we tried to rmSync through the symlink
        symlinkResourceDirectories({
          sourceDirs: [{ uri: 'source/practices-new' }],
          targetDir,
          resourceName: 'briefs',
        });

        const symlink = resolve(targetDir, 'practices-new');
        expect(lstatSync(symlink).isSymbolicLink()).toBe(true);
        expect(existsSync(resolve(symlink, 'new.md'))).toBe(true);
      });
    });
  });

  given('[case7] array-dir mode removes deprecated symlinks', () => {
    beforeEach(() => {
      // create source directories
      const practicesDir = resolve(tmp.path, 'source/practices');
      const deprecatedDir = resolve(tmp.path, 'source/deprecated');
      mkdirSync(practicesDir, { recursive: true });
      mkdirSync(deprecatedDir, { recursive: true });
      writeFileSync(resolve(practicesDir, 'rule.md'), '# rule');
      writeFileSync(resolve(deprecatedDir, 'old.md'), '# old');

      // create target dir with symlinks (one will be deprecated)
      const targetDir = resolve(tmp.path, '.agent/repo=test/role=any/briefs');
      mkdirSync(targetDir, { recursive: true });
      symlinkSync(practicesDir, resolve(targetDir, 'practices'));
      symlinkSync(deprecatedDir, resolve(targetDir, 'deprecated'));
    });

    when(
      '[t0] symlinkResourceDirectories called without deprecated source',
      () => {
        then('removes deprecated symlink', () => {
          const targetDir = resolve(
            tmp.path,
            '.agent/repo=test/role=any/briefs',
          );

          symlinkResourceDirectories({
            sourceDirs: [{ uri: 'source/practices' }],
            targetDir,
            resourceName: 'briefs',
          });

          expect(existsSync(resolve(targetDir, 'practices'))).toBe(true);
          expect(existsSync(resolve(targetDir, 'deprecated'))).toBe(false);
        });
      },
    );
  });

  given('[case8] clearPath throws on real directory', () => {
    beforeEach(() => {
      // create a real directory (not symlink) at target location
      const targetDir = resolve(tmp.path, '.agent/repo=test/role=any/briefs');
      mkdirSync(targetDir, { recursive: true });
      writeFileSync(resolve(targetDir, 'local.md'), '# local file');

      // create new source
      const sourceDir = resolve(tmp.path, 'source/briefs');
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(resolve(sourceDir, 'new.md'), '# new');
    });

    when('[t0] symlinkResourceDirectories is called', () => {
      then('throws error to protect source files', () => {
        const targetDir = resolve(tmp.path, '.agent/repo=test/role=any/briefs');

        expect(() =>
          symlinkResourceDirectories({
            sourceDirs: { uri: 'source/briefs' },
            targetDir,
            resourceName: 'briefs',
          }),
        ).toThrow(/expected symlink but found directory/);
      });
    });
  });
});
