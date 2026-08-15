import { given, then, when } from 'test-fns';

import { asSocketPeerPidFromSs } from './asSocketPeerPidFromSs';

/**
 * .what = clamp the peer-pid parse against the wrong-attribution hazard the i008
 *   arch review flagged: a partial grep + a single `pid=` match could attribute a
 *   connection to the WRONG peer, and this is the sole socket auth gate
 * .why = the parse is pure, so the exact collision (inode `451` vs a line that holds
 *   `4512` or `pid=45100`) is testable with real ss-shaped fixtures — no live socket
 */
describe('asSocketPeerPidFromSs', () => {
  given('[case1] one connection line that holds our inode as a field', () => {
    // a realistic `ss -xp` unix-socket line: the inode is a whitespace-delimited
    // column, the process tuple holds pid=
    const ssOutput = [
      'u_str ESTAB 0 0 /run/clone.sock 45123 * 45124 users:(("node",pid=8080,fd=20))',
    ].join('\n');

    when('[t0] the inode matches exactly', () => {
      then('it returns the pid from that line', () => {
        expect(
          asSocketPeerPidFromSs({
            ssOutput,
            inode: '45123',
            signedInode: '45123',
          }),
        ).toEqual(8080);
      });
    });
  });

  given('[case2] THE BUG — a shorter inode that partial-collides', () => {
    // inode `451` is a sub-slice of the `4512` inode column AND of `pid=45100`.
    // the old `grep "451" | match(/pid=\d+/)` would have grabbed 45100 (wrong peer).
    // our target inode `451` appears as an EXACT field only on the SECOND line.
    const ssOutput = [
      'u_str ESTAB 0 0 /run/other.sock 4512 * 4513 users:(("evil",pid=45100,fd=9))',
      'u_str ESTAB 0 0 /run/clone.sock 451 * 452 users:(("node",pid=8080,fd=20))',
    ].join('\n');

    when('[t0] the target inode is `451`', () => {
      then(
        'it attributes to the RIGHT peer (8080), never the collider (45100)',
        () => {
          expect(
            asSocketPeerPidFromSs({
              ssOutput,
              inode: '451',
              signedInode: '451',
            }),
          ).toEqual(8080);
        },
      );
    });
  });

  given('[case3] a signed inode form (inode > 2^31)', () => {
    // ss shows the signed 32-bit form; /proc gives the unsigned — either is ours
    const ssOutput = [
      'u_str ESTAB 0 0 /run/clone.sock -1927732442 * -1927732441 users:(("node",pid=7070,fd=6))',
    ].join('\n');

    when('[t0] the unsigned inode is matched via its signed form', () => {
      then('it returns the pid from the signed-form line', () => {
        expect(
          asSocketPeerPidFromSs({
            ssOutput,
            inode: '2367234854',
            signedInode: '-1927732442',
          }),
        ).toEqual(7070);
      });
    });
  });

  given('[case4] no line holds our inode as a field', () => {
    // a line that only partial-holds the inode digits, never as a token
    const ssOutput = [
      'u_str ESTAB 0 0 /run/other.sock 4519 * 4520 users:(("node",pid=9090,fd=6))',
    ].join('\n');

    when(
      '[t0] the target inode `451` appears nowhere as an exact field',
      () => {
        then('it returns null (no false attribution)', () => {
          expect(
            asSocketPeerPidFromSs({
              ssOutput,
              inode: '451',
              signedInode: '451',
            }),
          ).toBeNull();
        });
      },
    );
  });

  given('[case5] empty ss output', () => {
    when('[t0] there is no connection to read', () => {
      then('it returns null', () => {
        expect(
          asSocketPeerPidFromSs({
            ssOutput: '',
            inode: '451',
            signedInode: '451',
          }),
        ).toBeNull();
      });
    });
  });
});
