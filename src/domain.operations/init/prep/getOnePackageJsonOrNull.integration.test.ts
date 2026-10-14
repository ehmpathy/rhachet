import { ConstraintError } from 'helpful-errors';
import { genTempDir, getError, given, then, when } from 'test-fns';

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOnePackageJsonOrNull } from './getOnePackageJsonOrNull';

describe('getOnePackageJsonOrNull', () => {
  given('[case1] a dir with no package.json', () => {
    const dir = genTempDir({ slug: 'getOnePackageJsonOrNull-absent' });

    when('[t0] it is read', () => {
      then('it returns null', () => {
        expect(getOnePackageJsonOrNull({ dir })).toEqual(null);
      });
    });
  });

  given('[case2] a package.json that holds an object', () => {
    const dir = genTempDir({ slug: 'getOnePackageJsonOrNull-object' });

    when('[t0] it is read', () => {
      then('it returns the path and the parsed record', () => {
        writeFileSync(
          join(dir, 'package.json'),
          JSON.stringify({ name: 'test-pkg', scripts: { test: 'jest' } }),
        );
        expect(getOnePackageJsonOrNull({ dir })).toEqual({
          pkgPath: join(dir, 'package.json'),
          pkg: { name: 'test-pkg', scripts: { test: 'jest' } },
        });
      });
    });
  });

  given('[case3] a package.json that is not valid json', () => {
    const dir = genTempDir({ slug: 'getOnePackageJsonOrNull-badjson' });

    when('[t0] it is read', () => {
      then('it fails loud with a ConstraintError', async () => {
        writeFileSync(join(dir, 'package.json'), '{ "name": ');
        const error = await getError(async () =>
          getOnePackageJsonOrNull({ dir }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('invalid package.json');
      });
    });
  });

  given('[case4] a package.json that is valid json but not an object', () => {
    const dir = genTempDir({ slug: 'getOnePackageJsonOrNull-array' });

    when('[t0] it holds an array', () => {
      then('it fails loud — never reads as a record', async () => {
        writeFileSync(join(dir, 'package.json'), '["not", "a", "pkg"]');
        const error = await getError(async () =>
          getOnePackageJsonOrNull({ dir }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('not a json object');
      });
    });
  });
});
