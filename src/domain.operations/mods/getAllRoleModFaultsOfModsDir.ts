import { asRoleModStrayEntryError } from './asRoleModStrayEntryError';

/**
 * .what = the faults of the mods dir itself: a mods path that cannot be read (C13), and one fault
 *         per stray entry (C0), named by the entry
 * .why = no role carries these; the render's readout and the boot's tail block name the same set,
 *        built in one place
 */
export const getAllRoleModFaultsOfModsDir = (input: {
  modsDir: string;
  fault: Error | null;
  strays: string[];
}): Array<{ role: string; error: Error }> => [
  ...(input.fault ? [{ role: '.mods', error: input.fault }] : []),
  ...input.strays.map((entry) => ({
    role: entry,
    error: asRoleModStrayEntryError({ modsDir: input.modsDir, entry }),
  })),
];
