import { given, then, when } from 'test-fns';

import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  realpathSync,
  rmdirSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getHomeHash } from './getHomeHash';

describe('getHomeHash', () => {
  given('[case1] HOME is set to a real path', () => {
    const homeOriginal = process.env['HOME'];

    afterEach(() => {
      process.env['HOME'] = homeOriginal;
    });

    when('[t0] getHomeHash is called', () => {
      then('returns 8-char hex string', () => {
        const hash = getHomeHash();
        expect(hash).toMatch(/^[0-9a-f]{8}$/);
      });
    });

    when('[t1] getHomeHash is called twice with same HOME', () => {
      then('returns same hash', () => {
        const hash1 = getHomeHash();
        const hash2 = getHomeHash();
        expect(hash1).toEqual(hash2);
      });
    });

    when('[t2] HOME is changed to different path', () => {
      then('returns different hash', () => {
        const hashBefore = getHomeHash();

        // change HOME to a different path
        const tempDir = mkdtempSync(join(tmpdir(), 'keyrack-test-'));
        process.env['HOME'] = tempDir;

        const hashAfter = getHomeHash();
        expect(hashAfter).not.toEqual(hashBefore);

        // cleanup
        rmdirSync(tempDir);
      });
    });
  });

  given('[case2] HOME is unset', () => {
    const homeOriginal = process.env['HOME'];

    afterEach(() => {
      process.env['HOME'] = homeOriginal;
    });

    when('[t0] getHomeHash is called', () => {
      then('uses process.cwd() as fallback', () => {
        delete process.env['HOME'];

        const hash = getHomeHash();

        // verify it matches hash of cwd
        const cwdRealPath = realpathSync(process.cwd());
        const cwdHash = createHash('sha256')
          .update(cwdRealPath)
          .digest('hex')
          .slice(0, 8);
        expect(hash).toEqual(cwdHash);
      });
    });
  });

  given('[case3] HOME is a symlink', () => {
    const homeOriginal = process.env['HOME'];
    let tempDir: string;
    let symlinkDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'keyrack-test-real-'));
      symlinkDir = join(tmpdir(), `keyrack-test-symlink-${Date.now()}`);
      symlinkSync(tempDir, symlinkDir);
    });

    afterEach(() => {
      process.env['HOME'] = homeOriginal;
      unlinkSync(symlinkDir); // symlinks are removed with unlink, not rmdir
      rmdirSync(tempDir);
    });

    when('[t0] HOME points to symlink', () => {
      then(
        'uses real path for hash (symlink and real path get same hash)',
        () => {
          // hash via symlink
          process.env['HOME'] = symlinkDir;
          const hashViaSymlink = getHomeHash();

          // hash via real path
          process.env['HOME'] = tempDir;
          const hashViaReal = getHomeHash();

          expect(hashViaSymlink).toEqual(hashViaReal);
        },
      );
    });
  });
});
