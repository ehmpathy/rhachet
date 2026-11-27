import { getError, given, then, when } from 'test-fns';

import { Socket } from 'node:net';
import { isCallerSameUser } from './isCallerSameUser';

/**
 * .what = the uid compare, proven with an injected peer read — no `ss`, no second unix user
 * .why = the integration proof ([case21]) needs a pid 1 that is not the test user, which a root
 *   container lacks; this unit proof runs on every host
 */
describe('isCallerSameUser', () => {
  // an unconnected socket; the injected peer read never touches it
  const socket = new Socket();
  const genPeer = (uid: number) => async () => ({ pid: 4242, uid, gid: uid });

  given('[case1] a peer with our uid', () => {
    when('[t0] the same-user check runs', () => {
      then('it is the same user', async () => {
        const same = await isCallerSameUser(
          { socket },
          { getPeerCred: genPeer(1000), getOwnUid: () => 1000 },
        );
        expect(same).toEqual(true);
      });
    });
  });

  given('[case2] a peer with another uid', () => {
    when('[t0] the same-user check runs', () => {
      then('it is not the same user', async () => {
        const same = await isCallerSameUser(
          { socket },
          { getPeerCred: genPeer(0), getOwnUid: () => 1000 },
        );
        expect(same).toEqual(false);
      });
    });
  });

  given('[case3] a host with no uid', () => {
    when('[t0] the same-user check runs', () => {
      then('it fails closed, and never reads the peer', async () => {
        const peerReads: number[] = [];
        const same = await isCallerSameUser(
          { socket },
          {
            getPeerCred: async () => {
              peerReads.push(1);
              return { pid: 4242, uid: 1000, gid: 1000 };
            },
            getOwnUid: () => undefined,
          },
        );
        expect(same).toEqual(false);
        expect(peerReads).toHaveLength(0);
      });
    });
  });

  given('[case4] a peer read that faults', () => {
    when('[t0] the same-user check runs', () => {
      then('the fault propagates, so the gate denies on it', async () => {
        const error = await getError(
          isCallerSameUser(
            { socket },
            {
              getPeerCred: async () => {
                throw new Error('`ss` scan killed at the lookup bound');
              },
              getOwnUid: () => 1000,
            },
          ),
        );
        expect(error.message).toContain('`ss` scan killed at the lookup bound');
      });
    });
  });
});
