import { MalfunctionError } from 'helpful-errors';

/**
 * .what = the integer a named `<stats>` tree row reports, e.g. `├─ tokens  = 366 (…)` → 366
 * .why = boot and cost suites compare counts across renders, so the read is shared
 * .note = it takes the first digit group, commas dropped, and throws where the row or its
 *   count is absent or malformed — a silent 0 would satisfy an equality against a render with
 *   no stats. a count must open with a digit and group by threes (`1,234`); `,`, `1,,2`, and
 *   `12,34` all throw
 */
export const getOneStatsCount = (input: {
  stdout: string;
  label: string;
}): number => {
  // escape the label, so a label with a regex metachar (`.`, `(`) matches only itself
  const labelLiteral = input.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `^[\\s│├└─]*${labelLiteral}\\s*=\\s*(\\d+(?:,\\d{3})*)(?![\\d,])`,
    'm',
  );
  const found = input.stdout.match(pattern);
  if (!found?.[1])
    throw new MalfunctionError('no <stats> count for the label', {
      label: input.label,
      stdout: input.stdout,
      hint: 'the stats block shape changed; read the snapshot diff for this case',
    });
  return Number(found[1].replace(/,/g, ''));
};
