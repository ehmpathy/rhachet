import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { CloneOndisk } from '@src/domain.objects/CloneOndisk';
import { getHomeHash } from '@src/infra/host/getHomeHash';

import { isCloneProcessLive } from './isCloneProcessLive';

// a pid beyond linux pid_max never names a live process → a deterministic "dead"
const PID_DEAD = 2_147_483_646;

const genSampleClone = (input: {
  hostHash: string;
  hostPid: number;
}): CloneOndisk =>
  new CloneOndisk({
    serial: getUuid(),
    slug: null,
    actor: { repoPath: '/repo', hash: 'aaa' },
    socketEligible: false,
    spawnedAt: asIsoTimeStamp('2026-08-10T00:00:00Z'),
    hostHash: input.hostHash,
    hostPid: input.hostPid,
    hostPidStartedAt: asIsoTimeStamp('2026-08-10T00:00:00Z'),
    historyDir: '/repo/history',
  });

describe('isCloneProcessLive.integration', () => {
  given('[case1] a same-host clone whose pid is ALIVE', () => {
    when('[t0] liveness is probed', () => {
      then('it is true (this test process`s own pid is alive)', () => {
        const clone = genSampleClone({
          hostHash: getHomeHash(),
          hostPid: process.pid,
        });
        expect(isCloneProcessLive({ clone })).toEqual(true);
      });
    });
  });

  given('[case2] a same-host clone whose pid has EXITED', () => {
    when('[t0] liveness is probed', () => {
      then('it is false (a pid beyond pid_max is dead)', () => {
        const clone = genSampleClone({
          hostHash: getHomeHash(),
          hostPid: PID_DEAD,
        });
        expect(isCloneProcessLive({ clone })).toEqual(false);
      });
    });
  });

  given('[case3] a clone spawned on ANOTHER host', () => {
    when('[t0] liveness is probed', () => {
      then('it is false — a foreign pid is never trusted as ours', () => {
        // a live pid, but a different host digest → cannot probe → not alive
        const clone = genSampleClone({
          hostHash: 'a-different-host-digest',
          hostPid: process.pid,
        });
        expect(isCloneProcessLive({ clone })).toEqual(false);
      });
    });
  });
});
