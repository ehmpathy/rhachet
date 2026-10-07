import { existsSync, readdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the errnos that mean a PATH entry holds no binary the farm could link
 * .why = each catch in the farm allowlists what it skips and rethrows the rest
 */
const ERRNOS_PATH_DIR_SKIPPABLE = new Set(['ENOENT', 'ENOTDIR', 'EACCES']);

/**
 * .what = fills `into` with a link to every binary on `path` except the ones named
 * .why = a case that grades an absent binary owns the absence, never the host
 *        (`rule.require.hermetic-tests`)
 * .note = `path` is the PATH to mirror, passed by the caller; first-wins preserves its precedence
 */
export const genTestPathWithout = (input: {
  binaries: string[];
  into: string;
  path: string;
}): string => {
  const withheld = new Set(input.binaries);

  for (const dir of input.path.split(':').filter(Boolean)) {
    const entries = (() => {
      try {
        return readdirSync(dir);
      } catch (error) {
        // a PATH entry that vanished, names a file, or refuses a list is host state the
        // shell also walks past. every other errno is a real fault, and it throws
        const code = (error as NodeJS.ErrnoException)?.code;
        if (!code || !ERRNOS_PATH_DIR_SKIPPABLE.has(code)) throw error;
        return [];
      }
    })();
    for (const name of entries) {
      if (withheld.has(name)) continue;
      const at = join(input.into, name);
      if (existsSync(at)) continue; // first-wins preserves PATH precedence
      try {
        symlinkSync(join(dir, name), at);
      } catch (error) {
        // an EEXIST is a duplicate name the first-wins check raced past; all else throws
        if ((error as NodeJS.ErrnoException)?.code !== 'EEXIST') throw error;
      }
    }
  }

  return input.into;
};
