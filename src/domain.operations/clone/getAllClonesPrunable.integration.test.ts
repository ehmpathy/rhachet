import { now } from 'iso-time';
import { genTempDir, given, then, useThen, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { genSampleCloneOndisk } from '@src/.test/assets/genSampleCloneOndisk';

import { getAllClonesForActor } from './getAllClonesForActor';
import { getAllClonesPrunable } from './getAllClonesPrunable';

describe('getAllClonesPrunable.integration', () => {
  given(
    '[case1] a DEAD clone, a DEAF clone, and a cross-host clone under one actor',
    () => {
      const scene = useThen('the three are provisioned + enumerated', () => {
        const repoPath = genTempDir({ slug: 'prunable-mix' });

        // DEAD: socket-eligible but NO socket server bound → its socket refuses
        const serialDead = getUuid();
        genSampleCloneOndisk({
          repoPath,
          serial: serialDead,
          slug: null,
          socketEligible: true,
        });

        // DEAF: socketless AND this test process's pid is alive → active-but-deaf
        const serialDeaf = getUuid();
        genSampleCloneOndisk({
          repoPath,
          serial: serialDeaf,
          slug: null,
          socketEligible: false,
        });

        // cross-host: a foreign host digest → excluded regardless of reach
        const serialForeign = getUuid();
        const on = genSampleCloneOndisk({
          repoPath,
          serial: serialForeign,
          slug: null,
          socketEligible: true,
          hostHash: 'a-different-host-digest',
        });

        const clones = getAllClonesForActor({
          actorDir: on.actorDir,
          actorsRoot: on.actorsRoot,
          repoPath: on.repoPath,
          actorHash: on.actorHash,
        });
        return { clones, serialDead, serialDeaf, serialForeign };
      });

      when('[t0] the prunable set is computed with no age gate', () => {
        then('only the DEAD same-host clone is prunable', async () => {
          const prunable = await getAllClonesPrunable({
            clones: scene.clones,
            olderThanMs: null,
          });
          expect(prunable.map((c) => c.serial)).toEqual([scene.serialDead]);
        });

        then('the DEAF clone is NOT prunable (still active)', async () => {
          const prunable = await getAllClonesPrunable({
            clones: scene.clones,
            olderThanMs: null,
          });
          expect(prunable.map((c) => c.serial)).not.toContain(scene.serialDeaf);
        });

        then(
          'the cross-host clone is NOT prunable (may be alive elsewhere)',
          async () => {
            const prunable = await getAllClonesPrunable({
              clones: scene.clones,
              olderThanMs: null,
            });
            expect(prunable.map((c) => c.serial)).not.toContain(
              scene.serialForeign,
            );
          },
        );
      });
    },
  );

  given('[case2] a freshly-spawned DEAD clone with a wide age gate', () => {
    const scene = useThen('it is provisioned just now', () => {
      const repoPath = genTempDir({ slug: 'prunable-agegate' });
      const serial = getUuid();
      const on = genSampleCloneOndisk({
        repoPath,
        serial,
        slug: null,
        socketEligible: true,
        spawnedAt: now(),
      });
      const clones = getAllClonesForActor({
        actorDir: on.actorDir,
        actorsRoot: on.actorsRoot,
        repoPath: on.repoPath,
        actorHash: on.actorHash,
      });
      return { clones, serial };
    });

    when('[t0] the prunable set requires an age older than one hour', () => {
      then('the just-spawned DEAD clone is held back by the gate', async () => {
        const prunable = await getAllClonesPrunable({
          clones: scene.clones,
          olderThanMs: 3_600_000,
        });
        expect(prunable).toEqual([]);
      });
    });
  });
});
