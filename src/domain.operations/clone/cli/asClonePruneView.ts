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
  mode: 'plan' | 'apply';
}): {
  tree: string;
  data: { mode: 'plan' | 'apply'; count: number; clones: ClonePruneRow[] };
} => {
  const { rows, mode } = input;

  // .note = deliberate mutation — `lines` is a local tree accumulator, built up
  //         then joined; it never escapes this function
  const lines: string[] = [`🧹 clone prune (${mode})`];

  if (rows.length === 0) {
    lines.push('   └─ (no dead clones to prune)');
    return { tree: lines.join('\n'), data: { mode, count: 0, clones: [] } };
  }

  rows.forEach((row, idx) => {
    const last = idx === rows.length - 1;
    const prefix = last ? '   └─' : '   ├─';
    // the `serial=` field is the human short form, like the address and like
    // `clone list`'s own row. the FULL serial stays in `data.clones` below
    lines.push(
      `${prefix} ${asRowAddress(row)}  serial=${asCloneSerialHuman({
        serial: row.serial,
      })}  since=${row.spawnedAt}`,
    );
  });

  // the footer names the outcome: a plan says HOW to commit, an apply confirms
  lines.push(
    mode === 'plan'
      ? `   plan: ${rows.length} dead clone(s) would be pruned — re-run with --mode apply to remove`
      : `   pruned: ${rows.length} dead clone(s)`,
  );

  return {
    tree: lines.join('\n'),
    data: { mode, count: rows.length, clones: rows },
  };
};
