import { genTempDir, given, then, when } from 'test-fns';

import {
  lstatSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { setOnePackageJson } from './setOnePackageJson';

describe('setOnePackageJson', () => {
  given('[case1] a package.json on disk', () => {
    const dir = genTempDir({ slug: 'setOnePackageJson-plain' });

    when('[t0] a new record is written', () => {
      then('the file holds it in two-space json with a final newline', () => {
        const pkgPath = join(dir, 'package.json');
        writeFileSync(pkgPath, JSON.stringify({ name: 'before' }));
        setOnePackageJson({
          pkgPath,
          pkg: { name: 'after', scripts: { test: 'jest' } },
        });
        expect(readFileSync(pkgPath, 'utf8')).toEqual(
          JSON.stringify(
            { name: 'after', scripts: { test: 'jest' } },
            null,
            2,
          ) + '\n',
        );
      });

      then('no temp file is left beside it', () => {
        expect(readdirSync(dir)).toEqual(['package.json']);
      });
    });
  });

  given('[case2] a package.json that is a symlink', () => {
    const dir = genTempDir({ slug: 'setOnePackageJson-symlink' });

    when('[t0] a new record is written through the link', () => {
      then('the link stays a link, and its target holds the record', () => {
        const pkgTarget = join(dir, 'package.real.json');
        const pkgPath = join(dir, 'package.json');
        writeFileSync(pkgTarget, JSON.stringify({ name: 'before' }));
        symlinkSync('package.real.json', pkgPath);
        setOnePackageJson({ pkgPath, pkg: { name: 'after' } });
        expect(lstatSync(pkgPath).isSymbolicLink()).toEqual(true);
        expect(JSON.parse(readFileSync(pkgTarget, 'utf8'))).toEqual({
          name: 'after',
        });
      });
    });
  });
});
