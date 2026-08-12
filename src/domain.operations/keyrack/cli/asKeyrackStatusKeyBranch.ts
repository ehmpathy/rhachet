import type { DaemonStatusRow } from '@src/domain.operations/keyrack/daemon/sdk/src/domain.operations/daemonAccessStatus';

import { asKeyrackKeyReachLeaves } from './asKeyrackKeyReachLeaves';

/**
 * .what = render one unlocked key as a branch of the `🔐 keyrack status` tree
 * .why = the branch is the one part of the status tree that carries a reach, and a
 *        reach is what makes two branches share a slug. as a pure function it can be
 *        snapped, so the rendered rack shows up in a pr diff rather than only in a
 *        terminal (rule.require.contract-snapshot-exhaustiveness)
 *
 * .note = the reach leaf's placement and its absent-case are stated once, at
 *         `asKeyrackKeyReachLeaves` — the same leaf that `unlock` and `list` emit
 */
export const asKeyrackStatusKeyBranch = (input: {
  key: DaemonStatusRow;
  isLast: boolean;
}): string[] => {
  const prefix = input.isLast ? '   └─' : '   ├─';
  const indent = input.isLast ? '      ' : '   │  ';
  // .why the null branch = a key stored with no expiry is a first-class state
  //      (`daemonKeyStore`: "no expiration — always valid"), and its ttl crosses the socket
  //      as `null`. `Math.round(null / 1000 / 60)` is `0`, so the arithmetic alone rendered
  //      `expires in: 0m` — a key that never dies, reported as ALREADY DEAD
  // .note = `never` is not a new word: the `unlocked` branch of `emitKeyrackKeyBranch`
  //         already renders exactly this case with exactly this word
  const ttlLeft =
    input.key.ttlLeftMs === null
      ? 'never'
      : `${Math.round(input.key.ttlLeftMs / 1000 / 60)}m`;

  return [
    `${prefix} ${input.key.slug}`,
    `${indent}├─ env: ${input.key.env}`,
    `${indent}├─ org: ${input.key.org}`,
    ...asKeyrackKeyReachLeaves({ indent, reach: input.key.reach }),
    `${indent}└─ expires in: ${ttlLeft}`,
  ];
};
