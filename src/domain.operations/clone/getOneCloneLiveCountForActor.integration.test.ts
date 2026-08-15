import { genTempDir, given, then, when } from 'test-fns';

import { genSampleCloneOndisk } from '@src/.test/assets/genSampleCloneOndisk';
import { CLONE_ACCRUAL_THRESHOLD } from '@src/utils/cloneAccrualThreshold';

import type { Server } from 'node:net';
import { computeCloneAccrualWarn } from './computeCloneAccrualWarn';
import { getCloneSocketPath } from './getCloneSocketPath';
import { getOneCloneLiveCountForActor } from './getOneCloneLiveCountForActor';
import { genCloneSocketServer } from './socket/genCloneSocketServer';

const awaitServerReady = (server: Server): Promise<void> =>
  new Promise((done) => {
    if (server.listening) return done();
    server.once('listening', () => done());
  });

describe('getOneCloneLiveCountForActor.integration', () => {
  given('[case1] one actor with two clones, only ONE has a live socket', () => {
    when('[t0] the live count is gathered', () => {
      then('exactly the live clone is counted', async () => {
        const repoPath = genTempDir({ slug: 'liveCount' });
        const live = genSampleCloneOndisk({
          repoPath,
          serial: 'ser-live',
          slug: null,
        });
        // a second clone of the SAME actor, no server → DEAD
        genSampleCloneOndisk({
          repoPath,
          serial: 'ser-dead',
          slug: null,
        });

        // stand up a server only for ser-live
        const { server, close } = genCloneSocketServer({
          socketPath: getCloneSocketPath({ serial: 'ser-live' })!,
          write: () => undefined,
          isBrainCliAlive: () => true,
        });
        await awaitServerReady(server);

        try {
          const count = await getOneCloneLiveCountForActor({
            actorDir: live.actorDir,
            actorsRoot: live.actorsRoot,
            repoPath: live.repoPath,
            actorHash: live.actorHash,
          });
          expect(count).toEqual(1);
        } finally {
          await close();
        }
      });
    });
  });

  given(
    '[case2] one actor with CLONE_ACCRUAL_THRESHOLD live clones (the accrual boundary)',
    () => {
      when('[t0] the live count is gathered', () => {
        then(
          'the count reaches the threshold — the accrual WARN condition (with computeCloneAccrualWarn) is met',
          async () => {
            const repoPath = genTempDir({ slug: 'liveCountAccrual' });

            // provision THRESHOLD clones of one actor, each with a live socket —
            // via cheap socket servers (no brain spawn), the same mechanism the
            // count reader probes. this proves the count reaches the accrual
            // boundary; computeCloneAccrualWarn.test proves >= threshold → warn
            const serials = Array.from(
              { length: CLONE_ACCRUAL_THRESHOLD },
              (_, i) => `ser-accrual-${i}`,
            );
            const seeded = serials.map((serial) =>
              genSampleCloneOndisk({ repoPath, serial, slug: null }),
            );
            const servers = serials.map((serial) =>
              genCloneSocketServer({
                socketPath: getCloneSocketPath({ serial })!,
                write: () => undefined,
                isBrainCliAlive: () => true,
              }),
            );
            await Promise.all(servers.map((s) => awaitServerReady(s.server)));

            try {
              const anchor = seeded[0]!;
              const count = await getOneCloneLiveCountForActor({
                actorDir: anchor.actorDir,
                actorsRoot: anchor.actorsRoot,
                repoPath: anchor.repoPath,
                actorHash: anchor.actorHash,
              });
              expect(count).toEqual(CLONE_ACCRUAL_THRESHOLD);

              // the count that reaches the threshold IS the accrual WARN condition
              const accrual = computeCloneAccrualWarn({
                liveCount: count,
                threshold: CLONE_ACCRUAL_THRESHOLD,
              });
              expect(accrual.warn).toEqual(true);
              expect(accrual.liveCount).toEqual(CLONE_ACCRUAL_THRESHOLD);
            } finally {
              await Promise.all(servers.map((s) => s.close()));
            }
          },
        );
      });
    },
  );
});
