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
 */
const asFixCommand = (input: { owner: string | null; env: string }): string =>
  input.owner
    ? `rhx keyrack unlock --owner ${input.owner} --env ${input.env}`
    : `rhx keyrack unlock --env ${input.env}`;

/**
 * .what = the headline of a halt's error — its first line
 * .why = a helpful error's message carries its metadata as a json block below the
 *        headline; on a leaf, that block would break the tree. `--json` keeps it whole
 */
const asRenewMarkErrorHeadline = (input: { error: string }): string =>
  input.error.split('\n')[0]!.trim();

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

  // the renew at work
  const leafRenewed: StatusLeaf[] =
    renew.renewedCount > 0
      ? [{ text: `renewed = ${renew.renewedCount}x`, children: [] }]
      : [];
  if (!renew.mark) return leafRenewed;

  // the fix, shared by both marks
  const leafFix: StatusLeaf = {
    text: 'fix',
    children: [
      {
        text: asFixCommand({ owner: input.owner, env: input.key.env }),
        children: [],
      },
    ],
  };

  // a lapse: the portal session ended
  if (renew.mark.kind === 'lapsed')
    return [
      ...leafRenewed,
      {
        text: 'lapsed',
        children: [
          { text: 'sso session ended, renew halted', children: [] },
          leafFix,
        ],
      },
    ];

  // a halt: a fault held for a full window of ticks
  return [
    ...leafRenewed,
    {
      text: 'halted',
      children: [
        { text: 'renew failed 10 ticks in a row', children: [] },
        ...(renew.mark.error
          ? [
              {
                text: asRenewMarkErrorHeadline({ error: renew.mark.error }),
                children: [],
              },
            ]
          : []),
        leafFix,
      ],
    },
  ];
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
 * .note = the extant `env:` / `org:` / `expires in:` leaves keep their form; every
 *         renew leaf takes the tree form, with no colon (rule.forbid.colons-in-stdout)
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
  // .note = `expires in: Nm` is the extant leaf, kept byte for byte with its `env:` and
  //         `org:` peers so no status snapshot moves; the colon form is repaired for all
  //         three at once, never for one leaf apart (rule.forbid.colons-in-stdout)
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
