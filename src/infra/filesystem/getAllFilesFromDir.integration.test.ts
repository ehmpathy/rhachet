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
        const result = getAllFilesFromDir(
          resolve(testDir, 'broken-dir-symlink'),
        );
        expect(result).toHaveLength(1);
        expect(result[0]).toContain('valid.txt');
      });
    });
  });
});
