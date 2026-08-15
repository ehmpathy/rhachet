import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { CloneOndisk } from '@src/domain.objects/CloneOndisk';
import { getHomeHash } from '@src/infra/host/getHomeHash';

import type { Server } from 'node:net';
import { getCloneReachState } from './getCloneReachState';
import { getCloneSocketPath } from './getCloneSocketPath';
import { genCloneSocketServer } from './socket/genCloneSocketServer';

// a pid beyond linux pid_max never names a live process → a deterministic "dead"
const PID_DEAD = 2_147_483_646;

const genSampleClone = (input: {
  serial: string;
  socketEligible: boolean;
  hostHash?: string;
  hostPid?: number;
}): CloneOndisk =>
  new CloneOndisk({
    serial: input.serial,
    slug: null,
    actor: { repoPath: '/repo', hash: 'aaa' },
    socketEligible: input.socketEligible,
    spawnedAt: asIsoTimeStamp('2026-08-10T00:00:00Z'),
    hostHash: input.hostHash ?? 'h1',
    hostPid: input.hostPid ?? 1,
    hostPidStartedAt: asIsoTimeStamp('2026-08-10T00:00:00Z'),
    historyDir: '/repo/history',
  });

const awaitServerReady = (server: Server): Promise<void> =>
  new Promise((done) => {
    if (server.listening) return done();
    server.once('listening', () => done());
  });

describe('getCloneReachState.integration', () => {
  given('[case1] a socket-eligible clone with a LIVE server', () => {
    when('[t0] the reach-state is probed', () => {
      then('it is LIVE', async () => {
        const serial = getUuid();
        const socketPath = getCloneSocketPath({ serial })!;
        const { server, close } = genCloneSocketServer({
          socketPath,
          write: () => undefined,
          isBrainCliAlive: () => true,
        });
        await awaitServerReady(server);
        try {
          const clone = genSampleClone({ serial, socketEligible: true });
          expect(await getCloneReachState({ clone })).toEqual('LIVE');
        } finally {
          await close();
        }
      });
    });
  });

  given('[case2] a socket-eligible clone whose socket has no server', () => {
    when('[t0] the reach-state is probed', () => {
      then('it is DEAD (the socket refuses)', async () => {
        const clone = genSampleClone({
          serial: getUuid(),
          socketEligible: true,
        });
        expect(await getCloneReachState({ clone })).toEqual('DEAD');
      });
    });
  });

  given('[case3] a socketless clone whose process is STILL ALIVE', () => {
    when('[t0] the reach-state is probed', () => {
      then('it is DEAF (active-but-deaf, observe-only)', async () => {
        // same host + this test process`s own pid = a definitely-live process
        const clone = genSampleClone({
          serial: getUuid(),
          socketEligible: false,
          hostHash: getHomeHash(),
          hostPid: process.pid,
        });
        expect(await getCloneReachState({ clone })).toEqual('DEAF');
      });
    });
  });

  given('[case4] a socketless clone whose process has EXITED', () => {
    when('[t0] the reach-state is probed', () => {
      then('it is DEAD (the wisher`s DEAF→DEAD transition)', async () => {
        // same host + a pid beyond pid_max = a definitely-dead process
        const clone = genSampleClone({
          serial: getUuid(),
          socketEligible: false,
          hostHash: getHomeHash(),
          hostPid: PID_DEAD,
        });
        expect(await getCloneReachState({ clone })).toEqual('DEAD');
      });
    });
  });

  given('[case5] a socketless clone spawned on ANOTHER host', () => {
    when('[t0] the reach-state is probed', () => {
      then(
        'it is DEAD (a foreign pid cannot be verified from here)',
        async () => {
          // a live pid, but a different host → cannot probe → DEAD
          const clone = genSampleClone({
            serial: getUuid(),
            socketEligible: false,
            hostHash: 'a-different-host-digest',
            hostPid: process.pid,
          });
          expect(await getCloneReachState({ clone })).toEqual('DEAD');
        },
      );
    });
  });
});
