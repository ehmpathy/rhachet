import { setFileAtomic } from '@src/infra/setFileAtomic';

import { realpathSync } from 'node:fs';

/**
 * .what = write a package.json whole, in the repo's two-space json form
 * .why = the one writer `getOnePackageJsonOrNull`'s callers compose: a crash or a
 *        concurrent `npm install` never reads a half-written manifest, and every
 *        writer emits the same shape
 *
 * .note = writes through a symlinked package.json to its target, so the link stays
 */
export const setOnePackageJson = (input: {
  pkgPath: string;
  pkg: Record<string, unknown>;
}): void => {
  setFileAtomic({
    path: getRealpathOrSelf({ path: input.pkgPath }),
    content: JSON.stringify(input.pkg, null, 2) + '\n',
  });
};

/**
 * .what = a path's realpath, or the path itself when it is absent
 * .why = one resolve call, so no peer can remove the file between a probe and the resolve
 * .note = only ENOENT means absent; every other errno surfaces (failhide)
 */
const getRealpathOrSelf = (input: { path: string }): string => {
  try {
    return realpathSync(input.path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return input.path;
    throw error;
  }
};
