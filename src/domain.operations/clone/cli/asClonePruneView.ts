import { asCloneAddressHuman } from '../asCloneAddressHuman';
import { asCloneSerialHuman } from '../asCloneSerialHuman';

/**
 * .what = one clone's row in the `rhx clone prune` view — the facts a human reads
 *   about a clone that was (or would be) reaped
 */
export interface ClonePruneRow {
  serial: string;
  slug: string | null;
  spawnedAt: string;
}

/**
 * .what = the address a human reaches this clone by — `asCloneAddressHuman`, the one
 *   owner, so this view renders the SAME form `clone list` and `clone get` do
 */
const asRowAddress = (row: ClonePruneRow): string => asCloneAddressHuman(row);

/**
 * .what = build the `rhx clone prune` view — the human tree AND the machine data —
 *   from the set of prunable (dead) clones + the run mode
 * .why =
 *   - prune is PLAN-by-default (a safe preview): the plan view names what WOULD be
 *     reaped and how to commit it, so a human never deletes on a bare command
 *     (rule.require.safe-by-default). the apply view names what WAS reaped
 *   - tree + data are built from ONE input here, so `--output tree` and `--output
 *     json` can never disagree about which clones were pruned (usecase.11)
 *   - the empty state is its own line ("no dead clones to prune"), so a human on a
 *     clean repo sees a clear result, never a bare header
 *
 * .note = pure: the invoker probes reach-state + performs the reap (impure), then
 *   hands the settled rows here to render
 */
export const asClonePruneView = (input: {
  rows: ClonePruneRow[];
  revisions: ClonePruneRevisionRow[];
  mode: 'plan' | 'apply';
}): {
  tree: string;
  data: {
    mode: 'plan' | 'apply';
    count: number;
    clones: ClonePruneRow[];
    revisions: ClonePruneRevisionRow[];
  };
} => {
  const { rows, revisions, mode } = input;
  const data = { mode, count: rows.length, clones: rows, revisions };

  // .note = deliberate mutation — `lines` is a local tree accumulator, built up
  //         then joined; it never escapes this function
  const lines: string[] = [`🧹 clone prune (${mode})`];

  if (rows.length === 0 && revisions.length === 0) {
    lines.push('   └─ (no dead clones to prune)');
    return { tree: lines.join('\n'), data };
  }

  // the clone rows, then one branch that holds the revisions no clone refers to
  // .note = the `serial=` field is the human short form, like the address and like
  //   `clone list`'s own row. the FULL serial stays in `data.clones`
  const branches = [
    ...rows.map(
      (row) =>
        `${asRowAddress(row)}  serial=${asCloneSerialHuman({
          serial: row.serial,
        })}  since=${row.spawnedAt}`,
    ),
    ...(revisions.length > 0 ? [asRevisionsBranchLabel({ revisions })] : []),
  ];
  branches.forEach((branch, idx) => {
    const last = idx === branches.length - 1;
    lines.push(`${last ? '   └─' : '   ├─'} ${branch}`);
  });
  revisions.forEach((revision, idx) => {
    const last = idx === revisions.length - 1;
    lines.push(
      `      ${last ? '└─' : '├─'} @${revision.actor}  sha256=${revision.hash}`,
    );
  });

  // the footer names the outcome in one line: a plan says HOW to commit, an apply confirms
  const revisionsPart =
    revisions.length > 0 ? ` and ${revisions.length} boot revision(s)` : '';
  lines.push(
    mode === 'plan'
      ? `   plan = ${rows.length} dead clone(s)${revisionsPart} would be pruned — re-run with --mode apply to remove`
      : `   pruned = ${rows.length} dead clone(s)${revisionsPart}`,
  );

  return { tree: lines.join('\n'), data };
};

/**
 * .what = one boot revision in the prune view: the actor that holds it, and its hash
 */
export interface ClonePruneRevisionRow {
  actor: string;
  hash: string;
}

/**
 * .what = the label of the branch that holds the revisions no clone refers to
 */
const asRevisionsBranchLabel = (input: {
  revisions: ClonePruneRevisionRow[];
}): string => `boot revisions no clone refers to (${input.revisions.length})`;
