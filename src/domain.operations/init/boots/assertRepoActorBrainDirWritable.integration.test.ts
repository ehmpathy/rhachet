import { ConstraintError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { chmodSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { assertRepoActorBrainDirWritable } from './assertRepoActorBrainDirWritable';

describe('assertRepoActorBrainDirWritable', () => {
  given('[case1] a brain dir this process can write', () => {
    const scene = useBeforeAll(async () => {
      const repoActorBrainDir = join(
        genTempDir({ slug: 'brain-dir-writable' }),
        'brain',
      );
      mkdirSync(repoActorBrainDir);
      return { repoActorBrainDir };
    });

    when('[t0] the dir is probed', () => {
      then('it passes, and leaves no probe file', () => {
        expect(() => assertRepoActorBrainDirWritable(scene)).not.toThrow();
        expect(readdirSync(scene.repoActorBrainDir)).toEqual([]);
      });
    });
  });

  given('[case2] a brain dir this process cannot write (vision case 2)', () => {
    when('[t0] the dir is probed', () => {
      then('it refuses, with the path, the errno and the mode', async () => {
        // a root process writes past a 0o555 mode, so this case cannot hold under root
        if (process.getuid?.() === 0)
          throw new ConstraintError('this test cannot run as root', {
            hint: 'run the suite as a non-root user',
          });
        const repoActorBrainDir = join(
          genTempDir({ slug: 'brain-dir-readonly' }),
          'brain',
        );
        mkdirSync(repoActorBrainDir);
        chmodSync(repoActorBrainDir, 0o555);
        const error = await getError(async () =>
          assertRepoActorBrainDirWritable({ repoActorBrainDir }),
        ).finally(() => chmodSync(repoActorBrainDir, 0o755));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('not writable');
        expect(error.message).toContain(repoActorBrainDir);
        expect(error.message).toContain('EACCES');
        expect(error.message).toContain('555');
      });
    });
  });
});
