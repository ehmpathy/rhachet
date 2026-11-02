import { realpathSync } from 'node:fs';

/**
 * .what = the realpath of a path, or null where it dangles
 * .why = a link check must tell "lands nowhere" from "cannot be read"
 *
 * .note = only a dangle reads as null (ENOENT, ENOTDIR, ELOOP); any other fault (e.g. EACCES)
 *   is thrown, so it never masquerades as "a symlink to another place"
 */
export const getOneRealpathOrNull = (input: {
  path: string;
}): string | null => {
  try {
    return realpathSync(input.path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'ELOOP')
      return null;
    throw error;
  }
};
