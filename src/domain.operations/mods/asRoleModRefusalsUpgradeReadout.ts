import { HelpfulError } from 'helpful-errors';

import { getOneTreeElbow } from '@src/utils/getOneTreeElbow';
import { getOneTreeSpine } from '@src/utils/getOneTreeSpine';

import { asErrorHeadline } from './asErrorHeadline';

/**
 * .what = the readout `rhx upgrade` prints for each mod that no longer applies, or naught
 * .why = an upgrade is the moment a release can drop a path a mod shadows or nots; the human
 *        must hear it there, not first at the next boot of a clone that carries the role
 *
 * .note = each refusal is one `✋` branch — the role, or the mods dir for an entry that names
 *   none — with its headline, and its `fix` as a leaf where it carries one
 * .note = no refusals → no lines
 */
export const asRoleModRefusalsUpgradeReadout = (input: {
  refusals: Array<{ role: string | null; error: Error }>;
}): string[] => {
  if (input.refusals.length === 0) return [];
  return [
    '🧢 a mod no longer applies',
    ...input.refusals.flatMap((one, index) => {
      const position = { index, length: input.refusals.length };
      const subject = one.role ? `role=${one.role}` : '.agent/repo=.mods';
      const fix = asRefusalFixOrNull({ error: one.error });
      return [
        `   ${getOneTreeElbow(position)} ${subject} — ${asErrorHeadline({ error: one.error })}`,
        ...(fix ? [`   ${getOneTreeSpine(position)}└─ fix = ${fix}`] : []),
      ];
    }),
  ];
};

/**
 * .what = the `fix` a helpful error carries in its metadata, or null
 */
const asRefusalFixOrNull = (input: { error: Error }): string | null => {
  const metadata =
    input.error instanceof HelpfulError ? (input.error.metadata ?? {}) : {};
  return typeof metadata.fix === 'string' ? metadata.fix : null;
};
