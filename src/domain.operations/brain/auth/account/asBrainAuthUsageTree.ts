import type { IsoTimeStamp } from 'iso-time';

import type { BrainAuthUsage } from '@src/domain.objects/BrainAuthUsage';
import type { BrainAuthUsageWindow } from '@src/domain.objects/BrainAuthUsageWindow';
import { asBrainAuthSetHint } from '@src/domain.operations/brain/auth/account/asBrainAuthSetHint';
import { asTimeUntilHuman } from '@src/domain.operations/brain/auth/account/asTimeUntilHuman';
import { asBrainAuthSlotUnlockHint } from '@src/domain.operations/brain/auth/account/slot/asBrainAuthSlotUnlockHint';
import { asTreeBranch } from '@src/utils/asTreeBranch';

/**
 * .what = the human tree for `rhx brains auth get`: one branch per account, its windows and saved resets
 * .why = case=2 — a human sees at a glance which account has headroom and when each window resets
 * .note = a capped window reads `capped`, never a high percent, so "unusable until reset" is plain
 * .note = no token ever reaches this render; it reads only the usage domain object
 * .note = each stored login this read rotated is marked `(renewed)`, with one note below: a `get`
 *   writes, and a silent write would surprise (case=9). a login the provider refused was not
 *   rotated, and is not marked
 */
export const asBrainAuthUsageTree = (input: {
  usages: BrainAuthUsage[];
  owner: string;
  now: IsoTimeStamp;
}): string => {
  // the owner leads, so a read of the wrong keyrack is plain at a glance
  const ownerLine = `   ├─ owner = ${input.owner}`;

  // no account at all: name the next move
  if (input.usages.length === 0)
    return [
      '🧠 brains auth get',
      ownerLine,
      '   └─ no accounts held',
      `      └─ add one via \`rhx brains auth set\` (it files into the keyrack; \`rhx keyrack init --owner ${input.owner}\` first, if none)`,
    ].join('\n');

  // a read that rotated a stored login says so, on that row and once below (case=9)
  const isRenewalNoted = input.usages.some((usage) => usage.renewed);
  const count = input.usages.length + (isRenewalNoted ? 1 : 0);
  const renewal = isRenewalNoted
    ? [
        '   └─ note = each (renewed) login was rotated by this read; its new token is parked back in the keyrack',
      ]
    : [];

  // one branch per account
  const lines = input.usages.flatMap((usage, index) => {
    const { branch, stem } = asTreeBranch({ index, count });
    const label = asUsageLabel({ usage });
    const rows = asUsageRows({ usage, owner: input.owner, now: input.now });
    return [
      `   ${branch} ${label}`,
      ...rows.map((row, rowIndex) => {
        const { branch: rowBranch } = asTreeBranch({
          index: rowIndex,
          count: rows.length,
        });
        return `   ${stem}${rowBranch} ${row}`;
      }),
    ];
  });
  return ['🧠 brains auth get', ownerLine, ...lines, ...renewal].join('\n');
};

/**
 * .what = an account's branch label, e.g. `b@example.com (renewed)`
 * .why = the signed-in account and each login this read rotated are named as such, so a write is
 *   never silent
 */
const asUsageLabel = (input: { usage: BrainAuthUsage }): string => {
  if (input.usage.signedIn) return `${input.usage.email} (signed in)`;
  if (input.usage.renewed) return `${input.usage.email} (renewed)`;
  return input.usage.email;
};

/**
 * .what = the rows under one account: its windows and saved resets, or why they were not read
 * .why = an unread row still names its cause and its fix, so no row is a dead end
 */
const asUsageRows = (input: {
  usage: BrainAuthUsage;
  owner: string;
  now: IsoTimeStamp;
}): string[] => {
  if (input.usage.status === 'dead' && input.usage.signedIn)
    return [
      'dead — the provider refused the signed-in login; run `/login` in any claude session',
    ];
  if (input.usage.status === 'dead')
    return [
      `dead — the stored login no longer opens it; run \`${asBrainAuthSetHint({ email: input.usage.email })}\``,
    ];
  if (input.usage.status === 'locked')
    return [
      `locked — the keyrack holds this login but will not open it; run \`${asBrainAuthSlotUnlockHint({ owner: input.owner })}\``,
    ];
  if (input.usage.status === 'rate-limited')
    return ['rate-limited — the provider asked to wait; not dead, retry later'];
  // a stored row that never renewed failed at its mint: the endpoint may have spent the login
  if (
    input.usage.status === 'unreadable' &&
    !input.usage.renewed &&
    !input.usage.signedIn
  )
    return [
      'unreadable — server, network, or a reply shape rhachet cannot read; a retry may help, or may find the stored login spent',
    ];
  if (input.usage.status === 'unreadable')
    return [
      'unreadable — server, network, or a reply shape rhachet cannot read; a retry may help',
    ];
  if (input.usage.status === 'unverified')
    return [
      'unverified — the signed-in token lapsed, and a read never refreshes it; any claude session renews it',
    ];

  const windows = input.usage.windows.map((window) =>
    asWindowRow({ window, now: input.now }),
  );
  const savedResets =
    input.usage.savedResets === null
      ? 'saved resets = unknown'
      : `saved resets = ${input.usage.savedResets}`;
  return [...windows, savedResets];
};

/**
 * .what = one window as a row, e.g. `week = ████░░░░░░ 42% used, resets in 4d`
 * .why = a used share and its reset side by side are the pick the pool loop makes (case=10); the
 *   bar lets a human compare accounts down the column at a glance (the vision's table)
 */
const asWindowRow = (input: {
  window: BrainAuthUsageWindow;
  now: IsoTimeStamp;
}): string => {
  const share = input.window.capped
    ? 'capped'
    : `${Math.round(input.window.usedShare * 100)}% used`;
  const bar = asUsageBar({ window: input.window });
  const reset = asWindowResetLabel({ window: input.window, now: input.now });
  return `${input.window.slug} = ${bar} ${share}, ${reset}`;
};

/**
 * .what = a window's used share as a bar of ten cells, e.g. `████░░░░░░`
 * .why = cells fill by the nearest tenth; a capped window is full, whatever share the provider sent
 */
const USAGE_BAR_CELLS = 10;
const asUsageBar = (input: { window: BrainAuthUsageWindow }): string => {
  const share = input.window.capped ? 1 : input.window.usedShare;
  const filled = Math.min(
    USAGE_BAR_CELLS,
    Math.max(0, Math.round(share * USAGE_BAR_CELLS)),
  );
  return '█'.repeat(filled) + '░'.repeat(USAGE_BAR_CELLS - filled);
};

/**
 * .what = a window's reset, e.g. `resets in 4d`
 * .why = a window with no reset time and no use has not opened yet; one with use but no reset
 *   time has opened, and its reset is simply not reported. two facts, two labels
 */
const asWindowResetLabel = (input: {
  window: BrainAuthUsageWindow;
  now: IsoTimeStamp;
}): string => {
  if (input.window.resetsAt)
    return `resets in ${asTimeUntilHuman({ at: input.window.resetsAt, now: input.now })}`;
  if (input.window.usedShare > 0 || input.window.capped) return 'reset unknown';
  return 'not yet opened';
};
