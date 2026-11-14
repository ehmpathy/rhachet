import { ConstraintError } from 'helpful-errors';
import { genTempDir, getError, given, then, useThen, when } from 'test-fns';

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readOneBootSpecFile } from './readOneBootSpecFile';

/**
 * .what = clamps the spec read's fault classification
 * .why = a spec that vanishes between check and read is a caller race, so it must exit 2
 *        as a `ConstraintError`, never 1 as a raw `Error` (`rule.require.exit-code-semantics`)
 */
describe('readOneBootSpecFile (integration)', () => {
  const testDir = genTempDir({ slug: 'readOneBootSpecFile' });

  given('[case1] a spec path whose file is gone', () => {
    const pathToSpec = resolve(testDir, 'vanished/boot.yml');

    when('[t0] it is read', () => {
      // wrapped in an object: the shared-result proxy hands back a plain object, never the error
      const result = useThen('it fails', () => ({
        error: getError(() => readOneBootSpecFile({ pathToSpec })),
      }));

      then('it raises a ConstraintError — the caller re-runs', () => {
        expect(result.error).toBeInstanceOf(ConstraintError);
      });

      then('the message names the race rather than the symptom', () => {
        // .why = `ENOENT: no such file` names what node saw; the caller needs what it
        //        MEANS and what to do (`rule.require.errors-name-the-fix`)
        expect(result.error.message).toContain('vanished');
      });

      then('the fault carries the path and the fix', () => {
        expect(JSON.stringify(result.error)).toContain('boot.yml');
        expect(JSON.stringify(result.error)).toContain('re-run');
      });
    });
  });

  given('[case2] a spec path that points at a DIRECTORY', () => {
    const pathToSpec = resolve(testDir, 'adir');
    mkdirSync(pathToSpec, { recursive: true });

    when('[t0] it is read', () => {
      then('the fault escapes UNCHANGED — it is no caller race', () => {
        // only `ENOENT` is re-classed; a directory is a real defect, never a race
        const error = getError(() => readOneBootSpecFile({ pathToSpec }));

        expect(error).not.toBeInstanceOf(ConstraintError);
        expect((error as NodeJS.ErrnoException).code).toEqual('EISDIR');
      });
    });
  });

  given('[case3] a spec that is there', () => {
    const pathToSpec = resolve(testDir, 'present/boot.yml');
    mkdirSync(resolve(testDir, 'present'), { recursive: true });
    writeFileSync(pathToSpec, 'budget:\n  tokens: 5000\n');

    when('[t0] it is read', () => {
      then('it hands back the content, byte for byte', () => {
        expect(readOneBootSpecFile({ pathToSpec })).toEqual(
          'budget:\n  tokens: 5000\n',
        );
      });
    });
  });
});
