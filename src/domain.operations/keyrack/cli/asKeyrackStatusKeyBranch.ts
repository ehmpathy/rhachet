import { asKeyrackKeyName } from '@src/domain.operations/keyrack/asKeyrackKeyName';
import type { DaemonStatusRow } from '@src/domain.operations/keyrack/daemon/sdk';
import { asTreeBranch } from '@src/utils/asTreeBranch';

import { asKeyrackKeyReachLeaves } from './asKeyrackKeyReachLeaves';

/**
 * .what = one leaf of a key branch, with any children beneath it
 * .why = the renew marks render as subtrees, so the last-leaf glyph must be chosen
 *        after every leaf is known, never per line
 */
interface StatusLeaf {
  text: string;
  children: StatusLeaf[];
}

/**
 * .what = render a list of leaves under an indent, at any depth
 * .why = the glyph and the stem beneath it come from `asTreeBranch`, the one owner of
 *        that pair; this only walks the leaves
 */
const asTreeLines = (input: {
  leaves: StatusLeaf[];
  indent: string;
}): string[] =>
  input.leaves.flatMap((leaf, index) => {
    const { branch, stem } = asTreeBranch({
      index,
      count: input.leaves.length,
    });
    return [
      `${input.indent}${branch} ${leaf.text}`,
      ...asTreeLines({
        leaves: leaf.children,
        indent: `${input.indent}${stem}`,
      }),
    ];
  });

/**
 * .what = the fix command for a marked key
 * .why = a lapse or a halt takes one fix, an unlock of the key's own env; the render
 *        hands it over as a copy-paste command
 * .note = `fix` is the word keyrack output already uses for a remedy (`withSsoTimeout`,
 *         `emitKeyrackDaemonAbsentNotice`)
 * .note = a sudo key is the one scope the env sweep refuses (`sudo credentials require
 *         --key`), so its fix names the key; every other scope keeps the sweep, which also
 *         reaches a machine-wide key of another org
 */
const asFixCommand = (input: {
  owner: string | null;
  env: string;
  slug: string;
}): string => {
  const flagOwner = input.owner ? ` --owner ${input.owner}` : '';
  const flagKey =
    input.env === 'sudo'
      ? ` --key ${asKeyrackKeyName({ slug: input.slug })}`
      : '';
  return `rhx keyrack unlock${flagOwner} --env ${input.env}${flagKey}`;
};

/**
 * .what = the headline of a halt's error — its first line
 * .why = a helpful error's message carries its metadata as a json block below the
 *        headline; on a leaf, that block would break the tree. `--json` keeps it whole
 */
const asRenewMarkErrorHeadline = (input: { error: string }): string =>
  input.error.split('\n')[0]!.trim();

/**
 * .what = the head leaf of a key's renew state: the count, or whether the renew will act
 * .why = a key the daemon will renew must read apart from one it will not from the
 *        unlock on, so the absence of this leaf is itself the cue (an older cli files no
 *        renewal, and its key shows none)
 * .note = a marked key with no renew yet shows only its mark: the renew is stopped
 * .note = a grant at its cap renews no more, so the leaf says where the key ends
 */
const asRenewLeavesHead = (input: {
  renew: NonNullable<DaemonStatusRow['renew']>;
  commandUnlock: string;
}): StatusLeaf[] => {
  const { renew } = input;
  // .why = every remedy in the render is a command to paste; the cap's is no exception
  const leavesAtCap: StatusLeaf[] =
    renew.isAtCap && !renew.mark
      ? [
          {
            text: 'at its cap — ends at expiry, unlock to extend',
            children: [{ text: input.commandUnlock, children: [] }],
          },
        ]
      : [];

  // renews landed: the count, and where the key ends once a renew reached the cap
  if (renew.renewedCount > 0)
    return [
      { text: `renewed = ${renew.renewedCount}x`, children: leavesAtCap },
    ];

  // marked before any renew: the mark alone speaks
  if (renew.mark) return [];

  // no renew yet: on, or off at the cap
  if (renew.isAtCap) return [{ text: 'renew = off', children: leavesAtCap }];
  return [{ text: 'renew = on', children: [] }];
};

/**
 * .what = the leaves that describe a key's renew state
 * .why = `renewed = Nx` shows the renew at work; a mark names why renews stopped,
 *        with the fix, so a human never has to guess the next move
 */
const asRenewLeaves = (input: {
  key: DaemonStatusRow;
  owner: string | null;
}): StatusLeaf[] => {
  const renew = input.key.renew;
  if (!renew) return [];

  // the renew at work, or whether it will act
  const commandUnlock = asFixCommand({
    owner: input.owner,
    env: input.key.env,
    slug: input.key.slug,
  });
  const leafRenewed = asRenewLeavesHead({ renew, commandUnlock });
  if (!renew.mark) return leafRenewed;

  // the fix, shared by both marks: each child is a command, with its guards beneath it
  // .why = a reader scans the `fix` branch for lines to paste; a guard sits under the
  //        command it bounds, never beside it as a peer
  const asLeafFix = (fixNote: {
    notes: string[];
    also: StatusLeaf[];
  }): StatusLeaf => ({
    text: 'fix',
    children: [
      {
        text: commandUnlock,
        children: fixNote.notes.map((note) => ({ text: note, children: [] })),
      },
      ...fixNote.also,
    ],
  });

  // a lapse: the portal session ended
  if (renew.mark.kind === 'lapsed')
    return [
      ...leafRenewed,
      {
        text: 'lapsed',
        children: [
          {
            text: 'sso session ended, no renew until the next unlock',
            children: [],
          },
          asLeafFix({
            notes: [
              'a human must finish the browser login for a new sso session',
            ],
            also: [],
          }),
        ],
      },
    ];

  // a halt: a fault held for a full window of ticks
  // .note = the leaf shows the error's headline only; the full error, with its cause,
  //         is one command away, so the render names that command
  const flagOwner = input.owner ? ` --owner ${input.owner}` : '';
  const isDefect = isRenewMarkErrorDefect({ error: renew.mark.error });
  return [
    ...leafRenewed,
    {
      text: 'halted',
      children: [
        {
          text: isDefect
            ? 'renew stopped on a code defect, which no retry clears'
            : 'renew stopped on a fault it could not clear',
          children: [],
        },
        ...(renew.mark.error
          ? [
              {
                text: asRenewMarkErrorHeadline({ error: renew.mark.error }),
                children: [
                  {
                    text: 'full error',
                    children: [
                      {
                        text: `rhx keyrack status${flagOwner} --env ${input.key.env} --json`,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ]
          : []),
        // .why = a defect is ours to fix: an unlock holds the key to its ttl, and a prune
        //        or a retry meets the same defect on the next tick, so neither is offered
        //        as a cure
        // .why = the report is a manual step, not a command to paste, so it sits beside
        //        `fix` rather than inside it
        ...(isDefect
          ? [
              asLeafFix({
                notes: ['holds the key to its ttl; the renew may halt again'],
                also: [],
              }),
              {
                text: 'report the defect, with its full error above',
                children: [],
              },
            ]
          : []),
        // .why = the daemon renews from the env it was spawned with; a fault that lives
        //        there (no `aws` on its PATH, a stale config path) survives an unlock from
        //        a healthy cli, so the render names the prune that respawns it
        // .why = a halt stops every probe, so the portal may lapse while it waits; then the
        //        unlock opens a browser login, and a bot that runs the fix must know it
        ...(isDefect
          ? []
          : [
              asLeafFix({
                notes: [
                  'once the fault above clears',
                  'if the sso session ended meanwhile, a human must finish the browser login',
                ],
                also: [
                  {
                    text: `rhx keyrack daemon prune${flagOwner}`,
                    children: [
                      {
                        text: "if the fault lives in the daemon's own env",
                        children: [],
                      },
                      // .why = the cost sits on the prune itself, ahead of the step after it
                      {
                        text: 'drops every key the daemon holds; a key kept only in the daemon will not come back',
                        children: [],
                      },
                      { text: 'then unlock again', children: [] },
                    ],
                  },
                ],
              }),
            ]),
      ],
    },
  ];
};

/**
 * .what = whether a `halted` mark's error names a code defect
 * .why = a defect never clears on retry, so its fix differs from a fault's
 *
 * .note = the prefix is the one `asRenewMarkDefectError` writes in the daemon
 */
const isRenewMarkErrorDefect = (input: { error: string | null }): boolean =>
  input.error?.startsWith('💥 defect') ?? false;

/**
 * .what = render one unlocked key as a branch of the `🔐 keyrack status` tree
 * .why = the branch is the one part of the status tree that carries a reach, and a
 *        reach is what makes two branches share a slug. as a pure function it can be
 *        snapped, so the rendered rack shows up in a pr diff rather than only in a
 *        terminal (rule.require.contract-snapshot-exhaustiveness)
 *
 * .note = the reach leaf's placement and its absent-case are stated once, at
 *         `asKeyrackKeyReachLeaves` — the same leaf that `unlock` and `list` emit
 * .note = every renew leaf takes the tree form, with no colon (rule.forbid.colons-in-stdout)
 */
export const asKeyrackStatusKeyBranch = (input: {
  key: DaemonStatusRow;
  isLast: boolean;
  owner: string | null;
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

  // a marked key outlives its grant; past expiry it reads `expired`, never `0m`
  // .note = `expires in: Nm` is the same leaf `unlock` prints (`emitKeyrackKeyBranch`)
  const isMarkedExpired = !!input.key.renew?.mark && input.key.ttlLeftMs === 0;
  const leafExpiry: StatusLeaf = isMarkedExpired
    ? { text: 'expired', children: [] }
    : { text: `expires in: ${ttlLeft}`, children: [] };

  return [
    `${prefix} ${input.key.slug}`,
    `${indent}├─ env: ${input.key.env}`,
    `${indent}├─ org: ${input.key.org}`,
    ...asKeyrackKeyReachLeaves({ indent, reach: input.key.reach }),
    ...asTreeLines({
      leaves: [leafExpiry, ...asRenewLeaves(input)],
      indent,
    }),
  ];
};
