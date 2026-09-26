import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { genSampleCloneOndisk } from '@src/.test/assets/genSampleCloneOndisk';
import { findsertActorOndisk } from '@src/domain.operations/actor/enrolled/findsertActorOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getAllActorsOndisk } from '@src/domain.operations/actor/enrolled/getAllActorsOndisk';
import { getCloneSocketPath } from '@src/domain.operations/clone/getCloneSocketPath';
import { genCloneSocketServer } from '@src/domain.operations/clone/socket/genCloneSocketServer';

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { isActorActive } from './isActorActive';

/**
 * .what = the one actor enrolled in a temp repo, read back from disk
 */
const getOnlyActor = (input: { repoPath: string }) => {
  const actors = getAllActorsOndisk({ repoPath: input.repoPath });
  expect(actors).toHaveLength(1);
  return actors[0]!;
};

describe('isActorActive', () => {
  given('[case1] an actor with one LIVE clone', () => {
    when('[t0] the actor is probed', () => {
      then('it is active', async () => {
        const repoPath = genTempDir({ slug: 'actor-active-live' });
        const serial = getUuid();
        genSampleCloneOndisk({ repoPath, serial, slug: null });
        const { ready, close } = genCloneSocketServer({
          socketPath: getCloneSocketPath({ serial })!,
          write: () => undefined,
          isBrainCliAlive: () => true,
          read: () => ({ live: false, reason: 'feed-not-live' }),
          settle: async () => {},
        });
        await ready;
        try {
          const actor = getOnlyActor({ repoPath });
          expect(await isActorActive({ actor })).toBe(true);
        } finally {
          await close();
        }
      });
    });
  });

  given('[case2] an actor with one DEAF clone beside two DEAD ones', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'actor-active-deaf' });
      // DEAD: a socket clone with no server behind its socket
      genSampleCloneOndisk({ repoPath, serial: getUuid(), slug: null });
      genSampleCloneOndisk({ repoPath, serial: getUuid(), slug: null });
      // DEAF: a socketless clone whose recorded pid is this live test process
      genSampleCloneOndisk({
        repoPath,
        serial: getUuid(),
        slug: null,
        socketEligible: false,
      });
      return { actor: getOnlyActor({ repoPath }) };
    });

    when('[t0] the actor is probed', () => {
      then('it is active', async () => {
        expect(await isActorActive({ actor: scene.actor })).toBe(true);
      });
    });
  });

  given('[case3] an actor whose every clone is DEAD', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'actor-active-dead' });
      genSampleCloneOndisk({ repoPath, serial: getUuid(), slug: null });
      genSampleCloneOndisk({ repoPath, serial: getUuid(), slug: null });
      return { actor: getOnlyActor({ repoPath }) };
    });

    when('[t0] the actor is probed', () => {
      then('it is not active', async () => {
        expect(await isActorActive({ actor: scene.actor })).toBe(false);
      });
    });
  });

  given('[case4] an actor with no clones dir', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'actor-active-noclones' });
      findsertActorOndisk({
        repoPath,
        brain: 'claude',
        roles: ['mechanic'],
        delta: null,
        reason: null,
        logEnrollment: true,
      });
      return { actor: getOnlyActor({ repoPath }) };
    });

    when('[t0] the actor is probed', () => {
      then('it is not active, and no error is thrown', async () => {
        expect(await isActorActive({ actor: scene.actor })).toBe(false);
      });
    });
  });

  given('[case5] an actor with an empty clones dir', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'actor-active-zeroclones' });
      findsertActorOndisk({
        repoPath,
        brain: 'claude',
        roles: ['mechanic'],
        delta: null,
        reason: null,
        logEnrollment: true,
      });
      const actor = getOnlyActor({ repoPath });
      mkdirSync(
        join(
          getActorOndiskDir({ repoPath: actor.repoPath, hash: actor.hash }),
          'clones',
        ),
        { recursive: true },
      );
      return { actor };
    });

    when('[t0] the actor is probed', () => {
      then('it is not active', async () => {
        expect(await isActorActive({ actor: scene.actor })).toBe(false);
      });
    });
  });
});
