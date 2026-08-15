import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleCloneOnDisk } from '@src/.test/assets/genSampleCloneOnDisk';

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getOneCloneHydrated } from './getOneCloneHydrated';

describe('getOneCloneHydrated.integration', () => {
  given('[case1] a named clone on disk with a live slug claim', () => {
    const scene = useBeforeAll(async () => {
      const sample = genSampleCloneOnDisk({
        repoPath: genTempDir({ slug: 'hydrate-named' }),
        serial: 'ser-1',
        slug: 'driver',
      });
      return sample;
    });

    when('[t0] the clone dir is hydrated', () => {
      then(
        'the CloneOndisk carries its serial, reconciled slug, and derived actor ref',
        () => {
          const clone = getOneCloneHydrated({
            cloneDir: scene.cloneDir,
            actorsRoot: scene.actorsRoot,
            repoPath: scene.repoPath,
            actorHash: scene.actorHash,
          });
          expect(clone).not.toBeNull();
          expect(clone!.serial).toEqual('ser-1');
          expect(clone!.slug).toEqual('driver');
          expect(clone!.actor).toEqual({
            repoPath: scene.repoPath,
            hash: scene.actorHash,
          });
        },
      );

      then('the historyDir is derived under the clone dir', () => {
        const clone = getOneCloneHydrated({
          cloneDir: scene.cloneDir,
          actorsRoot: scene.actorsRoot,
          repoPath: scene.repoPath,
          actorHash: scene.actorHash,
        });
        expect(clone!.historyDir).toEqual(join(scene.cloneDir, 'history'));
      });
    });
  });

  given('[case2] a clone dir with NO identity.json', () => {
    when('[t0] the dir is hydrated', () => {
      then('it returns null — no clone here', () => {
        const repoPath = genTempDir({ slug: 'hydrate-empty' });
        const cloneDir = join(repoPath, 'clones', 'serial=ghost');
        mkdirSync(cloneDir, { recursive: true });
        expect(
          getOneCloneHydrated({
            cloneDir,
            actorsRoot: join(repoPath, '.agent', '.actors'),
            repoPath,
            actorHash: 'aaa',
          }),
        ).toBeNull();
      });
    });
  });
});
