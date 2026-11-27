import { asErrorHeadline } from './asErrorHeadline';
import { asRoleModFaultFix } from './asRoleModFaultFix';
import { asRoleModFaultLabel } from './asRoleModFaultLabel';

/**
 * .what = the `<mods.skipped>` block that names each mod fault no role carries, or naught
 * .why = a stray entry, an unreadable mods path, or a mod of no linked role has no role section
 *        to hold its notice; the boot names it once, so the clone is told, with the fix
 *
 * .note = it sits at the tail of boot.md, after the last role, so a fault that appears or is
 *   cured rewrites only the tail and leaves the cached prefix intact
 */
export const asRoleModsSkippedBlockLines = (input: {
  faults: Array<{ role: string; error: Error }>;
}): string[] => {
  if (input.faults.length === 0) return [];
  const isOne = input.faults.length === 1;
  const noun = isOne ? 'mod fault' : 'mod faults';
  const pronoun = isOne ? 'it' : 'them';
  const verbCure = isOne ? 'it is cured' : 'each is cured';
  return [
    '<mods.skipped>',
    `${input.faults.length} ${noun} no role carries; no role section can name ${pronoun}, so this block does, and the stop does until ${verbCure}`,
    ...input.faults.flatMap((one) => {
      const fix = asRoleModFaultFix({ error: one.error });
      return [
        `- ${asRoleModFaultLabel(one)} — ${asErrorHeadline({ error: one.error })}`,
        ...(fix ? [`  fix = ${fix}`] : []),
      ];
    }),
    '</mods.skipped>',
    '',
  ];
};
