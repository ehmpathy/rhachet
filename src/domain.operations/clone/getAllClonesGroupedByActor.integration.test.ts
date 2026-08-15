import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleCloneOnDisk } from '@src/.test/assets/genSampleCloneOnDisk';

import { findsertActorOndisk } from '../actor/enrolled/findsertActorOndisk';
import { getAllClonesGroupedByActor } from './getAllClonesGroupedByActor';

describe('getAllClonesGroupedByActor.integration', () => {
  given('[case1] one actor with a clone, and one actor with no clones', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'grouped' });
      const withClone = genSampleCloneOnDisk({
        repoPath,
        roles: ['mechanic'],
        serial: 'ser-1',
        slug: 'driver',
      });
      // a second actor (distinct roleset) with NO clones
      const empty = findsertActorOndisk({
        repoPath,
        brain: 'claude',
        roles: ['architect'],
        delta: null,
        reason: null,
        logEnrollment: true,
      });
      return { repoPath, withClone, emptyHash: empty.hash };
    });

    when('[t0] the clones are grouped by actor', () => {
      then('both actors appear as groups', () => {
        const groups = getAllClonesGroupedByActor({ repoPath: scene.repoPath });
        expect(groups).toHaveLength(2);
      });

      then('the actor with a clone carries it under its group', () => {
        const groups = getAllClonesGroupedByActor({ repoPath: scene.repoPath });
        const group = groups.find(
          (g) => g.actor.hash === scene.withClone.actorHash,
        );
        expect(group?.clones.map((c) => c.serial)).toEqual(['ser-1']);
      });

      then('the actor with no clones appears with an empty clones list', () => {
        const groups = getAllClonesGroupedByActor({ repoPath: scene.repoPath });
        const group = groups.find((g) => g.actor.hash === scene.emptyHash);
        expect(group?.clones).toEqual([]);
      });
    });
  });
});
