import { given, then, useBeforeAll, when } from 'test-fns';

import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname } from 'node:path';
import { genTestTempRepo } from './genTestTempRepo';
import { getAllResidueTestRepoDirs } from './getAllResidueTestRepoDirs';

/**
 * .what = proves a test repo is minted under the reclaimed temp root, never straight in the os
 *   temp root
 * .why = a repo minted in the os temp root outlives its run (225 found on #748). the residue
 *   notice counts that root box-wide, so its count can rise from another checkout's runs; this
 *   test is the proof that THIS checkout's runs add none
 */
describe('genTestTempRepo', () => {
  given('[case1] a test repo minted from a fixture', () => {
    const scene = useBeforeAll(async () => genTestTempRepo({ fixture: 'minimal' }));

    when('[t0] its path is read', () => {
      then('it sits under the test-fns temp root, which the run reclaims', () => {
        expect(scene.path).toContain('/test-fns/');
        expect(scene.path).toContain('/.temp/');
      });

      then('it is not a dir of the os temp root itself', () => {
        expect(dirname(scene.path)).not.toEqual(realpathSync(tmpdir()));
      });

      then('the residue scan of the os temp root never counts it', () => {
        expect(getAllResidueTestRepoDirs({ tmpRoot: tmpdir() })).not.toContain(
          basename(scene.path),
        );
      });
    });
  });
});
