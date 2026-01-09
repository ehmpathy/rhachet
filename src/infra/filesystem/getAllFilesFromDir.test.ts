import { given, then, when } from 'test-fns';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { getAllFilesFromDir } from './getAllFilesFromDir';

describe('getAllFilesFromDir', () => {
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
        const result = getAllFilesFromDir(resolve(testDir, 'nonexistent'));
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
        const result = getAllFilesFromDir(resolve(testDir, 'empty'));
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
        const result = getAllFilesFromDir(resolve(testDir, 'with-files'));
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
        const result = getAllFilesFromDir(resolve(testDir, 'nested'));
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
        const result = getAllFilesFromDir(resolve(testDir, 'symlink-file'));
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
        const result = getAllFilesFromDir(resolve(testDir, 'symlink-dir'));
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
          getAllFilesFromDir(resolve(testDir, 'broken-symlink')),
        ).not.toThrow();
      });

      then('returns only valid files', () => {
        const result = getAllFilesFromDir(resolve(testDir, 'broken-symlink'));
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
        const result = getAllFilesFromDir(resolve(testDir, 'nested-broken'));
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
        const result = getAllFilesFromDir(resolve(testDir, 'linked-target'));
        expect(result).toHaveLength(1);
        expect(result[0]).toContain('file.txt');
      });
    });
  });
});
