import { asIsoTimeStamp } from 'iso-time';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleCloneOnDisk } from '@src/.test/assets/genSampleCloneOnDisk';

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getAllClonesForActor } from './getAllClonesForActor';

describe('getAllClonesForActor.integration', () => {
  given('[case1] one actor with two clones spawned at different times', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'clonesForActor-two' });
      // spawn the LATER clone first, to prove the sort (not insertion order)
      const late = genSampleCloneOnDisk({
        repoPath,
        serial: 'ser-late',
        slug: null,
        spawnedAt: asIsoTimeStamp('2026-08-10T02:00:00Z'),
      });
      genSampleCloneOnDisk({
        repoPath,
        serial: 'ser-early',
        slug: null,
        spawnedAt: asIsoTimeStamp('2026-08-10T01:00:00Z'),
      });
      return late;
    });

    when('[t0] the actor is enumerated', () => {
      then('both clones appear, ordered by spawnedAt asc', () => {
        const clones = getAllClonesForActor({
          actorDir: scene.actorDir,
          actorsRoot: scene.actorsRoot,
          repoPath: scene.repoPath,
          actorHash: scene.actorHash,
        });
        expect(clones.map((c) => c.serial)).toEqual(['ser-early', 'ser-late']);
      });
    });
  });

  given(
    '[case2] an actor dir with a half-built serial dir (no identity.json)',
    () => {
      const scene = useBeforeAll(async () => {
        const sample = genSampleCloneOnDisk({
          repoPath: genTempDir({ slug: 'clonesForActor-halfbuilt' }),
          serial: 'ser-real',
          slug: null,
        });
        // a half-built serial dir with no identity.json
        mkdirSync(join(sample.actorDir, 'clones', 'serial=ghost'), {
          recursive: true,
        });
        return sample;
      });

      when('[t0] the actor is enumerated', () => {
        then(
          'the half-built dir is skipped, only the real clone appears',
          () => {
            const clones = getAllClonesForActor({
              actorDir: scene.actorDir,
              actorsRoot: scene.actorsRoot,
              repoPath: scene.repoPath,
              actorHash: scene.actorHash,
            });
            expect(clones.map((c) => c.serial)).toEqual(['ser-real']);
          },
        );
      });
    },
  );

  given('[case3] an actor with no clones dir yet', () => {
    when('[t0] the actor is enumerated', () => {
      then('it yields an empty list, never a throw', () => {
        const repoPath = genTempDir({ slug: 'clonesForActor-none' });
        const actorDir = join(
          repoPath,
          '.agent',
          '.actors',
          'actor.via.hash=aaa',
        );
        mkdirSync(actorDir, { recursive: true });
        expect(
          getAllClonesForActor({
            actorDir,
            actorsRoot: join(repoPath, '.agent', '.actors'),
            repoPath,
            actorHash: 'aaa',
          }),
        ).toEqual([]);
      });
    });
  });
});
