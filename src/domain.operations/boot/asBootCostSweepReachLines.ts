import { asTreeBranchLines } from '@src/utils/asTreeBranchLines';

/**
 * .what = names the paths the sweep looked at, beneath its roster
 * .why = `--all` is a completeness claim, and the sweep's reach is a POLICY rather than a
 *        derivation — it walks four globs, and a spec outside them is invisible to it. so the
 *        bound is stated (`rule.forbid.failhide`).
 *
 * .note = a manifest may sit at any path inside the repo, so the reach has no enumerable
 *   superset; the sweep discloses where it looked
 *
 * .note = it prints on BOTH arms — the roster and the empty case.
 */
export const asBootCostSweepReachLines = (input: {
  globs: readonly string[];
}): string[] => [
  `   │`,
  `   └─ swept`,
  ...asTreeBranchLines({ rows: [...input.globs], indent: '      ' }),
  ``,
  `   .note = a spec outside these paths is not swept. name it directly to cost it —`,
  `           \`roles cost --what <path>\`.`,
  ``,
];
