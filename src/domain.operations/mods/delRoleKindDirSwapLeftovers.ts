import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { delRoleKindDir } from './delRoleKindDir';

/**
 * .what = whether a role dir entry is a kind dir a view swap left behind
 * .why = a swap cut short (a crash, a kill) leaves its build or prior dir under a name that
 *        `setRoleKindDirSwapped` mints: `<kind>.next.<pid>.<hex>` or `<kind>.prior.<pid>.<hex>`
 */
const isRoleKindDirSwapLeftover = (input: { name: string }): boolean =>
  /^(briefs|skills)\.(next|prior)\.\d+\.[0-9a-f]{8}$/.test(input.name);

/**
 * .what = remove every kind dir a cut-short view swap left in a role dir
 * .why = no later swap reuses a leftover's name, so naught else would ever clear it
 *
 * .note = call it only under the role view lock: a live swap's build dir has the same shape,
 *   and the lock is what makes every match a leftover
 * .note = each leftover is cleared by `delRoleKindDir`, which never follows a link and
 *   refuses a regular file
 */
export const delRoleKindDirSwapLeftovers = (input: {
  roleDir: string;
}): { removed: string[] } => {
  const names = readdirSync(input.roleDir, { withFileTypes: true })
    .map((entry) => entry.name)
    .filter((name) => isRoleKindDirSwapLeftover({ name }))
    .sort();
  for (const name of names)
    delRoleKindDir({ kindDir: join(input.roleDir, name) });
  return { removed: names };
};
