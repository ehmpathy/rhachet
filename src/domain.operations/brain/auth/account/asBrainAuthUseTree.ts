import type { IsoTimeStamp } from 'iso-time';

import type { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';
import type { BrainAuthUsageWindow } from '@src/domain.objects/BrainAuthUsageWindow';
import { asBrainAuthSetHint } from '@src/domain.operations/brain/auth/account/asBrainAuthSetHint';
import { asTimeUntilHuman } from '@src/domain.operations/brain/auth/account/asTimeUntilHuman';

/**
 * .what = the human tree for `rhx brains auth use --scope grove`
 * .why = case=3 — the proof is the before and after compare, so the tree shows both as
 *   `email (org …)`, then what was stowed and what to watch: a capped target, live clones (case=7)
 * .note = an `unchanged` use shows only `after`: naught was minted, written, or stowed (case=10 [t2])
 */
export const asBrainAuthUseTree = (input: {
  outcome: 'swapped' | 'unchanged';
  before: BrainAuthAccount | null;
  after: BrainAuthAccount;
  stowed: string | null;
  windowsCapped: BrainAuthUsageWindow[] | null;
  owner: string;
  clonesLive: string[];
  now: IsoTimeStamp;
}): string => {
  // already on the target: say so, and naught else
  if (input.outcome === 'unchanged')
    return [
      '🧠 brains auth use --scope grove',
      `   ├─ owner = ${input.owner}`,
      `   ├─ after = ${asAccountLabel({ account: input.after })}`,
      '   └─ unchanged, the grove already uses this account',
    ].join('\n');

  // the compare, then the stow, then the warns, then the verdict
  return [
    '🧠 brains auth use --scope grove',
    `   ├─ owner = ${input.owner}`,
    `   ├─ before = ${input.before ? asAccountLabel({ account: input.before }) : 'none'}`,
    `   ├─ after = ${asAccountLabel({ account: input.after })}`,
    ...(input.stowed ? [`   ├─ stowed in keyrack = ${input.stowed}`] : []),
    ...asWindowsCappedBranch({
      windowsCapped: input.windowsCapped,
      email: input.after.email,
      now: input.now,
    }),
    ...asClonesLiveBranch({
      clonesLive: input.clonesLive,
      before: input.before,
    }),
    '   └─ landed, read back from the grove',
  ].join('\n');
};

/**
 * .what = an account as `email (org …)`
 * .why = case=3 shows the before and after compare on the pair, never the email alone
 */
const asAccountLabel = (input: { account: BrainAuthAccount }): string =>
  `${input.account.email} (org ${input.account.orgId ?? 'unknown'})`;

/**
 * .what = a warn branch when the target's windows are full until their reset
 * .why = a capped target is allowed, but a caller must see it is spent until then
 * .note = each reset reads as a span from now, the same as `get` shows it
 * .note = null means the usage was unread, so a full window cannot be ruled out; that is said
 */
const asWindowsCappedBranch = (input: {
  windowsCapped: BrainAuthUsageWindow[] | null;
  email: string;
  now: IsoTimeStamp;
}): string[] => {
  if (input.windowsCapped === null)
    return [
      `   ├─ 🟡 ${input.email} usage unread, so a full window cannot be named`,
      '   │  └─ see `rhx brains auth get` once the use lands',
    ];
  if (input.windowsCapped.length === 0) return [];
  const last = input.windowsCapped.length - 1;
  return [
    `   ├─ 🟡 ${input.email} is capped until its reset`,
    ...input.windowsCapped.map(
      (window, index) =>
        `   │  ${index === last ? '└─' : '├─'} ${window.slug} ${asResetHuman({ resetsAt: window.resetsAt, now: input.now })}`,
    ),
  ];
};

/**
 * .what = a window's reset as `resets in 4d`, or `reset unknown`
 * .why = a capped window the provider gave no reset for still renders, and says so
 */
const asResetHuman = (input: {
  resetsAt: IsoTimeStamp | null;
  now: IsoTimeStamp;
}): string =>
  input.resetsAt
    ? `resets in ${asTimeUntilHuman({ at: input.resetsAt, now: input.now })}`
    : 'reset unknown';

/**
 * .what = the live clones that still hold the prior account, and the risk to it
 * .why = case=7 — `use` cannot reach a live session's memory, so it names who may strand the
 *   prior account, and the fix if one does
 * .note = the scan covers this repo's clones alone, while grove scope is the whole box; a scan that
 *   found none says so and names its bound, so silence never reads as "safe"
 */
const asClonesLiveBranch = (input: {
  clonesLive: string[];
  before: BrainAuthAccount | null;
}): string[] => {
  if (!input.before) return [];
  if (input.clonesLive.length === 0)
    return [
      '   ├─ live clones in this repo = none seen; claude terminals started outside rhx, and clones of other repos, are not scanned',
    ];
  const email = input.before.email;
  const last = input.clonesLive.length - 1;
  return [
    `   ├─ live clones in this repo, on ${email} until their next login read`,
    ...input.clonesLive.map(
      (address, index) => `   │  ${index === last ? '└─' : '├─'} ${address}`,
    ),
    `   ├─ 🟡 ${email} is at risk while they live; a refresh from memory rotates its parked copy`,
    `   │  └─ if \`rhx brains auth get\` reads it dead, run \`${asBrainAuthSetHint({ email })}\``,
  ];
};
