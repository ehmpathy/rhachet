import { HelpfulError } from 'helpful-errors';

/**
 * .what = the label that names where a mod fault lives: a role, a stray entry, or the mods path
 * .why = a fault no role carries is named by its path, so each surface that lists faults (the
 *        render readout, the boot's tail block, the stop) labels it the same way
 *
 * .note = a stray carries `entry`; an unreadable mods path carries `modsDir` and its `errno`
 */
export const asRoleModFaultLabel = (input: {
  role: string;
  error: Error;
}): string => {
  const metadata =
    input.error instanceof HelpfulError ? (input.error.metadata ?? {}) : {};
  if (typeof metadata.entry === 'string')
    return `.agent/repo=.mods/${metadata.entry}`;
  if (
    typeof metadata.modsDir === 'string' &&
    typeof metadata.errno === 'string'
  )
    return '.agent/repo=.mods';
  return `role=${input.role}`;
};
