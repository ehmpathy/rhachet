import { genTempDir, given, then, when } from 'test-fns';

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setFileAtomic } from './setFileAtomic';

describe('setFileAtomic.integration', () => {
  given('[case1] a target path that does not yet exist', () => {
    const dir = genTempDir({ slug: 'setFileAtomic-new' });
    const path = join(dir, 'secret.age');

    when('[t0] content is written atomically at mode 0o600', () => {
      then('the file lands whole with the given content and mode', () => {
        setFileAtomic({ path, content: 'ciphertext-v1', mode: 0o600 });

        expect(readFileSync(path, 'utf8')).toEqual('ciphertext-v1');
        // the secret-file permission holds — the temp file carried the mode
        // BEFORE the rename, so the target was never briefly world-readable
        expect(statSync(path).mode & 0o777).toEqual(0o600);
      });

      then('no stray temp file is left beside the target', () => {
        setFileAtomic({ path, content: 'ciphertext-v1', mode: 0o600 });

        // the whole point of the temp+rename swap is that the temp file is gone —
        // a leftover .tmp would signal the rename never happened (a torn write)
        const entries = readdirSync(dir);
        expect(entries).toEqual(['secret.age']);
      });
    });
  });

  given('[case2] a target that already holds a prior whole file', () => {
    const dir = genTempDir({ slug: 'setFileAtomic-overwrite' });
    const path = join(dir, 'manifest.age');

    when('[t0] a longer content overwrites a shorter prior content', () => {
      then('the target holds ONLY the new content, never a torn splice', () => {
        // a plain truncate-then-write could leave a mix of old+new bytes on a
        // crash; the rename swap guarantees the target is one whole file or the
        // other. write a short blob, then overwrite with a longer one
        writeFileSync(path, 'short', { mode: 0o600 });
        setFileAtomic({
          path,
          content: 'a-much-longer-ciphertext-that-exceeds-the-prior',
          mode: 0o600,
        });

        expect(readFileSync(path, 'utf8')).toEqual(
          'a-much-longer-ciphertext-that-exceeds-the-prior',
        );
        // no fragment of the prior content survives the swap
        expect(readFileSync(path, 'utf8')).not.toContain('short');
      });
    });
  });

  given('[case3] a mode that differs from the default umask', () => {
    const dir = genTempDir({ slug: 'setFileAtomic-mode' });
    const path = join(dir, 'blob.age');

    when('[t0] the caller passes an explicit non-secret mode', () => {
      then('the target reflects exactly the mode the caller asked for', () => {
        // proves the caller controls the mode (the re-key path preserves a blob's
        // prior perms because it passes them through verbatim)
        setFileAtomic({ path, content: 'x', mode: 0o644 });

        expect(statSync(path).mode & 0o777).toEqual(0o644);
      });
    });
  });
});
