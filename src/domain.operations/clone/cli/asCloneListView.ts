import { abbreviate } from '@src/utils/abbreviate';

import { asCloneSerialHuman } from '../asCloneSerialHuman';
import type { CloneReachState } from '../computeCloneReachState';

/**
 * .what = one clone's row in the `rhx clone list` view — the reach-enriched facts
 *   a human and a machine both read
 * .why = the reach-state is probed impurely by the invoker; this view is a PURE
 *   render of the already-gathered facts, so tree + json never disagree
 */
export interface CloneListRow {
  serial: string;
  slug: string | null;
  reachState: CloneReachState;
  spawnedAt: string;
}

/**
 * .what = one actor and its clones, grouped for the list view
 */
export interface CloneListGroup {
  // .note = plain `hash`, not `actorHash` — this group renders under the `actors[]`
  //   array (json) / an `actor <hash>` header (tree), so the element IS an actor and
  //   `actorHash` would stutter (`actors[].actorHash`). whoami/enroll json keep the
  //   `actorHash` name deliberately — there it disambiguates the actor's hash from the
  //   clone's serial in a clone-centric object (rule.forbid.ambiguous-labels).
  hash: string;
  brain: string;
  roles: string[];
  clones: CloneListRow[];
}

/**
 * .what = the address a human reaches this clone by — its `@:<slug>` when named,
 *   else its `@:<short-serial>` (the first uuid segment, asCloneSerialHuman)
 * .why = the SHORT address round-trips through the reach path: a `@:<slug>` hits the
 *   slug index, a short serial `@:49b41f88` hits the git-style serial-prefix match in
 *   getOneCloneByRef. so the abbreviated form a human copies off the list is reachable —
 *   the full 36-char uuid is kept internally (the json view + the `.serials/` index) but
 *   never forced on a human keyboard. a first-8-hex collision is vanishingly unlikely,
 *   and reach fails LOUD on the rare ambiguity (never a silent wrong-clone)
 */
const asRowAddress = (row: CloneListRow): string =>
  row.slug !== null
    ? `@:${row.slug}`
    : `@:${asCloneSerialHuman({ serial: row.serial })}`;

/**
 * .what = the `  serial=<short-serial>` field, shown ONLY for a NAMED clone (whose
 *   address is `@:<slug>`, distinct from its serial)
 * .why = an UNNAMED clone's address already IS its short serial, so a separate `serial=`
 *   field just repeats it (redundant noise). a named clone's serial is distinct info
 *   shown nowhere else in the tree, so it is kept — abbreviated to the human form
 *   (asCloneSerialHuman), like the address. the FULL serial stays in `--output json`
 */
const asRowSerialField = (row: CloneListRow): string =>
  row.slug !== null
    ? `  serial=${asCloneSerialHuman({ serial: row.serial })}`
    : '';

/**
 * .what = build the `rhx clone list` view — both the human tree and the machine
 *   data — from the reach-enriched groups
 * .why =
 *   - `list` is a per-actor render: each actor a header, its clones the rows, so
 *     a human sees WHICH identity each clone belongs to (the vision's grouped
 *     shape), not a flat serial soup
 *   - tree + data are built from ONE input here, so `--output tree` and `--output
 *     json` can never disagree about what exists (usecase.11)
 *   - each clone shows a tri-state reach word (LIVE | DEAD | DEAF) inline
 *   - the empty state differs by cause: a LINKED repo with no clones says "enroll
 *     one"; a NEVER-linked repo (linked=false) says "link roles first" — the same
 *     distinct-label discipline as `actor list`, so a human on an unlinked repo is
 *     never pointed at `rhx enroll` (which would itself fail there)
 *     (rule.forbid.snapshot-visual-blemishes)
 *   - in the UNSCOPED list, a clone-less actor is hidden: `clone list` lists CLONES,
 *     so an actor whose clones were all pruned/gone is noise here — it stays visible
 *     via `rhx actor list`. a SCOPED `clone list @<actor>` keeps its one actor even
 *     when clone-less, because the caller named THAT actor and its empty state is the
 *     answer they asked for
 *
 * .note = pure: the invoker probes reach-state per clone AND whether the repo is
 *   linked (impure), then hands the gathered facts here plus whether a `@<actor>`
 *   scope was given
 */
export const asCloneListView = (input: {
  groups: CloneListGroup[];
  linked: boolean;
  scoped: boolean;
}): {
  tree: string;
  data: { actors: CloneListGroup[] };
} => {
  const { groups, scoped } = input;

  // the unscoped list hides clone-less actors (they belong to `rhx actor list`); a
  // scoped `clone list @<actor>` keeps its one actor even when clone-less. `shown` is
  // the set actually rendered — tree AND json both read it, so the two never disagree
  const shown = scoped
    ? groups
    : groups.filter((group) => group.clones.length > 0);

  // .note = deliberate mutation — `lines` is a local tree-render accumulator,
  //         built up then joined; it never escapes this function
  const lines: string[] = ['😶 clones'];

  // a never-linked repo cannot enroll — name the link fix, not the enroll one
  if (groups.length === 0 && !input.linked) {
    lines.push('   └─ (repo not linked)');
    lines.push('      └─ link roles first with `rhx init --roles <role>`');
    return { tree: lines.join('\n'), data: { actors: shown } };
  }

  if (groups.length === 0) {
    lines.push('   └─ (no actors enrolled yet)');
    lines.push('      └─ enroll one with `rhx enroll <brain>`');
    return { tree: lines.join('\n'), data: { actors: shown } };
  }

  // enrolled actors exist, but the unscoped filter left none with a clone to list —
  // the identities are real (see `rhx actor list`), they just have no live/dead clone
  if (shown.length === 0) {
    lines.push('   └─ (no clones)');
    lines.push(
      '      └─ enroll one with `rhx enroll <brain>`, or see identities with `rhx actor list`',
    );
    return { tree: lines.join('\n'), data: { actors: shown } };
  }

  shown.forEach((group, groupIdx) => {
    const groupLast = groupIdx === shown.length - 1;
    const groupPrefix = groupLast ? '   └─' : '   ├─';
    const rowIndent = groupLast ? '      ' : '   │  ';
    lines.push(
      // roles sorted so the display is deterministic (matches the sorted roleset
      // the identity hash derives from) — never incidental store order
      `${groupPrefix} actor ${abbreviate({ value: group.hash, keep: 7 })} (brain=${group.brain} roles=${[...group.roles].sort().join(',')})`,
    );

    if (group.clones.length === 0) {
      // the SCOPED per-actor empty leaf (`clone list @<actor>` on a clone-less actor)
      // names its fix too — every empty state this view produces names the next move
      // (rule.require.errors-name-the-fix / status-feedback). the hint is the single
      // enroll move, NOT the unscoped two-part form: the caller already named this
      // identity by hash, so the `rhx actor list` discoverability clause is redundant here
      lines.push(`${rowIndent}└─ (no clones)`);
      lines.push(`${rowIndent}   └─ enroll one with \`rhx enroll <brain>\``);
      return;
    }

    group.clones.forEach((row, rowIdx) => {
      const rowLast = rowIdx === group.clones.length - 1;
      const rowPrefix = rowLast ? `${rowIndent}└─` : `${rowIndent}├─`;
      lines.push(
        // the address is the copy-pasteable reachable handle; `serial=` follows ONLY
        // for a named clone (where it is distinct), never for an unnamed one (where the
        // address already IS the serial) — see asRowSerialField
        `${rowPrefix} ${asRowAddress(row)}${asRowSerialField(row)}  state=${row.reachState}  since=${row.spawnedAt}`,
      );
    });
  });

  // name the next action for a pile of DEAD rows (rule.require.errors-name-the-fix /
  // status-feedback: the output names the fix, a human need not already know `prune`).
  // the `💡 tip` emoji-header treestruct is the repo's FORWARD standard for an actionable
  // advisory (rule.prefer.emoji-language, `.the tip emoji-header idiom`).
  if (
    shown.some((group) => group.clones.some((row) => row.reachState === 'DEAD'))
  ) {
    // a blank line sets the actionable tip apart from the clone rows above; the tip
    // sits at the root column (not nested under an actor), so it reads as advice about
    // the whole list, not one actor's clones
    lines.push('');
    lines.push('💡 tip');
    lines.push(
      '   └─ reap dead clones with `rhx clone prune [--older-than <dur>]`',
    );
  }

  return { tree: lines.join('\n'), data: { actors: shown } };
};
