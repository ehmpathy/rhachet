import { computeBootMode } from '@src/domain.operations/boot/computeBootMode';
import { parseBootYamlRaw } from '@src/domain.operations/boot/parseBootYamlRaw';
import { readOneBootSpecFile } from '@src/domain.operations/boot/readOneBootSpecFile';

import { existsSync, renameSync, writeFileSync } from 'node:fs';

/**
 * .what = the budget a repo's own role=any boot gets when it declares none
 * .why = a repo's own boot grows with every brief its authors add and no one trims, so it
 *        is capped from the start. a declared budget of any size is the author's, and kept
 */
export const BUDGET_TOKENS_DEFAULT = '5_000';

/**
 * .what = the budget block, inserted after the spec's lead comment lines
 * .why = the header comments explain the spec, so the budget sits right under them and
 *        above the payload it caps — the place a reader looks for it
 */
const asBootYmlWithBudget = (input: { content: string }): string => {
  const lines = input.content.split('\n');
  const indexFirstKey = lines.findIndex(
    (line) => line.trim() !== '' && !line.trimStart().startsWith('#'),
  );
  const at = indexFirstKey === -1 ? lines.length : indexFirstKey;
  return [
    ...lines.slice(0, at),
    'budget:',
    `  tokens: ${BUDGET_TOKENS_DEFAULT}`,
    ...lines.slice(at),
  ].join('\n');
};

/**
 * .what = findserts `budget.tokens` into an extant boot.yml that declares a payload
 * .why = a declared budget of any size is kept; only an absent one is created
 *
 * .note = a boot.yml with no payload key has no payload to cap (`computeBootMode` refuses a
 *   budget alone), and an absent boot.yml is left for its author, since a created spec would
 *   change what the role boots
 */
export const findsertBudgetIntoBootYml = (input: {
  pathToBoot: string;
}): 'created' | 'extant' | 'absent' => {
  if (!existsSync(input.pathToBoot)) return 'absent';

  // .note = a spec that vanishes after the check is classified as a caller race
  const content = readOneBootSpecFile({ pathToSpec: input.pathToBoot });
  const raw = parseBootYamlRaw({ content, path: input.pathToBoot });
  if (!raw || typeof raw !== 'object') return 'absent';
  if ('budget' in raw) return 'extant';

  // no payload to cap
  const mode = computeBootMode({
    raw: Object.fromEntries(Object.entries(raw)),
  });
  if (mode === 'none') return 'absent';

  // temp write + rename, so a crash mid-write never leaves a half-written spec
  const pathTemp = `${input.pathToBoot}.${process.pid}.tmp`;
  writeFileSync(pathTemp, asBootYmlWithBudget({ content }));
  renameSync(pathTemp, input.pathToBoot);
  return 'created';
};
