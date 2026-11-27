import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneResidueFromBefore } from './getOneResidueFromBefore';

describe('getOneResidueFromBefore', () => {
  given('[case1] a temp root with a residue repo, a unit test dir, and a live stub', () => {
    const scene = useBeforeAll(async () => {
      // a temp root and a checkout of its own, so the count reads only what this test planted
      const tmpRoot = genTempDir({ slug: 'residue-tmp-root' });
      const repoRoot = genTempDir({ slug: 'residue-repo-root' });

      // a residue test repo carries the test ssh key; a unit test's own dir does not
      mkdirSync(join(tmpRoot, 'rhachet-test-old', '.ssh'), { recursive: true });
      writeFileSync(join(tmpRoot, 'rhachet-test-old', '.ssh', 'id_ed25519'), 'key');
      mkdirSync(join(tmpRoot, 'rhachet-test-unit'), { recursive: true });
      mkdirSync(join(tmpRoot, 'other-dir'), { recursive: true });

      // a parked process whose argv names this checkout's stub path
      const stub = spawn(
        process.execPath,
        ['-e', 'setInterval(() => undefined, 1000)', `${repoRoot}/src/.test/assets/stubBrainCli.cjs`],
        { stdio: 'ignore' },
      );
      await new Promise((wake) => setTimeout(wake, 300));
      return { tmpRoot, repoRoot, stub };
    });
    afterAll(() => scene.stub.kill('SIGKILL'));

    when('[t0] the stub floor is zero', () => {
      then('the residue repo and the stub count, and the unit test dir does not', async () => {
        expect(
          await getOneResidueFromBefore({
            repoRoot: scene.repoRoot,
            tmpRoot: scene.tmpRoot,
            stubAgeMinSeconds: 0,
          }),
        ).toEqual({ dirs: 1, stubs: 1 });
      });
    });

    when('[t1] the stub floor is past the stub age', () => {
      then('the young stub does not count', async () => {
        const residue = await getOneResidueFromBefore({
          repoRoot: scene.repoRoot,
          tmpRoot: scene.tmpRoot,
          stubAgeMinSeconds: 30 * 60,
        });
        expect(residue.stubs).toEqual(0);
      });
    });
  });
});
