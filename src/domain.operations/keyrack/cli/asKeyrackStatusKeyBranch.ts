import { getDuration, toMilliseconds } from 'iso-time';

import type { DaemonStatusKey } from '@src/domain.operations/keyrack/daemon/sdk';

import { asKeyrackKeyReachLeaves } from './asKeyrackKeyReachLeaves';

/**
 * .what = the leaf that says how long a key has left
 * .why = a key whose renewal stopped outlives its grant in status; past expiry it reads
 *        `expired`, which alone tells the human the key is gone, and an unlock restores it
 * .note = `never` is not a new word: the `unlocked` branch of `emitKeyrackKeyBranch`
 *         already renders a key with no expiry with exactly this word
 */
const asKeyrackStatusExpiryLeaf = (input: { key: DaemonStatusKey }): string => {
  // no expiry: the key never dies
  const expiresIn = input.key.expiresIn ?? null;
  if (expiresIn === null) return 'expires in: never';

  // a stopped renewal past its grant: the key is gone
  const isNoneLeft = toMilliseconds(expiresIn) === 0;
  const isRenewalStopped =
    input.key.renewal?.status === 'lapsed' ||
    input.key.renewal?.status === 'halted';
  if (isRenewalStopped && isNoneLeft) return 'expired';

  // otherwise, the whole minutes left
  const { minutes = 0 } = getDuration({
    of: { milliseconds: toMilliseconds(expiresIn) },
    as: 'minutes',
  });
  return `expires in: ${Math.round(minutes)}m`;
};

/**
 * .what = render one unlocked key as a branch of the `🔐 keyrack status` tree
 * .why = the branch is the one part of the status tree that carries a reach, and a
 *        reach is what makes two branches share a slug. as a pure function it can be
 *        snapped, so the rendered rack shows up in a pr diff rather than only in a
 *        terminal (rule.require.contract-snapshot-exhaustiveness)
 *
 * .note = the reach leaf's placement and its absent-case are stated once, at
 *         `asKeyrackKeyReachLeaves` — the same leaf that `unlock` and `list` emit
 * .note = a renewed key adds one leaf, `renewal = on | off | lapsed | halted`. an expired
 *         key adds none: `expired` is the whole story. the count and a halt's cause live
 *         in `--json`
 */
export const asKeyrackStatusKeyBranch = (input: {
  key: DaemonStatusKey;
  isLast: boolean;
}): string[] => {
  const prefix = input.isLast ? '   └─' : '   ├─';
  const indent = input.isLast ? '      ' : '   │  ';

  // the leaves after the reach: the expiry, then the renewal where the daemon renews it
  const leafExpiry = asKeyrackStatusExpiryLeaf({ key: input.key });
  const leaves = [
    leafExpiry,
    ...(input.key.renewal && leafExpiry !== 'expired'
      ? [`renewal = ${input.key.renewal.status}`]
      : []),
  ];

  return [
    `${prefix} ${input.key.slug}`,
    `${indent}├─ env: ${input.key.env}`,
    `${indent}├─ org: ${input.key.org}`,
    ...asKeyrackKeyReachLeaves({ indent, reach: input.key.reach }),
    ...leaves.map(
      (leaf, index) =>
        `${indent}${index === leaves.length - 1 ? '└─' : '├─'} ${leaf}`,
    ),
  ];
};
