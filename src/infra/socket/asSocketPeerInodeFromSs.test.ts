import { given, then, when } from 'test-fns';

import { asSocketPeerInodeFromSs } from './asSocketPeerInodeFromSs';

/**
 * .what = clamp the peer-inode parse on real `ss -x` line shapes
 * .why = a connected pair shows two lines, each with both inodes; only the line whose LOCAL
 *   inode is ours names the peer, and that is the line the parse must read
 */
const CASES = [
  {
    description:
      'reads the peer inode off our line, whichever order the pair prints in',
    given: {
      ssOutput: [
        'u_str ESTAB 0 0 * 57129150 * 57129151',
        'u_str ESTAB 0 0 /tmp/probe.sock 57129151 * 57129150',
      ].join('\n'),
      inode: '57129151',
      signedInode: '57129151',
    },
    expect: { output: '57129150' },
  },
  {
    description: 'the same pair, the other end asks',
    given: {
      ssOutput: [
        'u_str ESTAB 0 0 /tmp/probe.sock 57129151 * 57129150',
        'u_str ESTAB 0 0 * 57129150 * 57129151',
      ].join('\n'),
      inode: '57129150',
      signedInode: '57129150',
    },
    expect: { output: '57129151' },
  },
  {
    description: 'a local path with a space never shifts the columns',
    given: {
      ssOutput: 'u_str ESTAB 0 0 /tmp/my dir/clone.sock 451 * 452',
      inode: '451',
      signedInode: '451',
    },
    expect: { output: '452' },
  },
  {
    description: 'a shorter inode that partial-collides is never a match',
    given: {
      ssOutput: 'u_str ESTAB 0 0 /run/other.sock 4512 * 4513',
      inode: '451',
      signedInode: '451',
    },
    expect: { output: null },
  },
  {
    description:
      'a signed peer inode is cast to the unsigned form the fd links carry',
    given: {
      ssOutput: 'u_str ESTAB 0 0 /run/clone.sock -1927732442 * -1927732441',
      inode: '2367234854',
      signedInode: '-1927732442',
    },
    expect: { output: '2367234855' },
  },
  {
    description: 'a peer column of 0 means the peer end closed',
    given: {
      ssOutput: 'u_str ESTAB 0 0 /run/clone.sock 451 * 0',
      inode: '451',
      signedInode: '451',
    },
    expect: { output: null },
  },
  {
    description: 'our inode only in the peer column is not our line',
    given: {
      ssOutput: 'u_str ESTAB 0 0 * 452 * 451',
      inode: '451',
      signedInode: '451',
    },
    expect: { output: null },
  },
  {
    description: 'empty output',
    given: { ssOutput: '', inode: '451', signedInode: '451' },
    expect: { output: null },
  },
];

describe('asSocketPeerInodeFromSs', () => {
  given('[case1] ss -x lines', () => {
    CASES.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then('the peer inode is as expected', () => {
          expect(asSocketPeerInodeFromSs(thisCase.given)).toEqual(
            thisCase.expect.output,
          );
        });
      }),
    );
  });
});
