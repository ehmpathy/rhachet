import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { getOneTempDirRoot, given, then, when } from 'test-fns';

import { genTestTempDirNonRepo } from './genTestTempDirNonRepo';

describe('genTestTempDirNonRepo', () => {
  given('[case1] a non-repo temp dir is asked for', () => {
    when('[t0] it is allocated with a label', () => {
      const { path } = genTestTempDirNonRepo({ label: 'nonrepo-probe' });

      then('it exists, empty, under the derived temp root', () => {
        expect(existsSync(path)).toBe(true);
        expect(readdirSync(path)).toEqual([]);
        expect(path.startsWith(`${getOneTempDirRoot().pathPhysical}/`)).toBe(
          true,
        );
      });

      then('the label rides in its name, for a legible failure trace', () => {
        expect(path).toContain('.nonrepo-probe.');
      });

      then('no git repo sits at or above it', () => {
        // the whole contract: a cwd here must read as "not a git repo"
        const result = spawnSync('git', ['rev-parse', '--show-toplevel'], {
          cwd: path,
          encoding: 'utf-8',
        });
        expect(result.status).not.toEqual(0);
        expect(result.stderr).toContain('not a git repository');
      });
    });

    when('[t1] it is allocated with no label', () => {
      const { path } = genTestTempDirNonRepo();

      then('the default label names the intent', () => {
        expect(path).toContain('.non-git-cwd.');
      });
    });
  });
});
