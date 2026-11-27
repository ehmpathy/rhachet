import {
  ConstraintError,
  type HelpfulError,
  MalfunctionError,
} from 'helpful-errors';

import { asRepoRelPathOfAgentPath } from './asRepoRelPathOfAgentPath';

/**
 * .what = the errnos of a mod's own path the repo can repair: no read access, a file where a dir
 *         belongs, a dir where a file belongs, or a link loop
 * .why = each is a fault of the repo, so it is a ConstraintError; any other errno is the host's
 */
const ERRNOS_OF_MOD_PATH_REPAIRABLE = new Set([
  'EACCES',
  'EPERM',
  'ENOTDIR',
  'EISDIR',
  'ELOOP',
]);

/**
 * .what = the path an fs error names, or null where it names none
 * .why = a structural read, since an fs error thrown across a vm realm (e.g. under jest) fails
 *        `instanceof Error`
 */
const asErrnoPath = (input: { error: Error }): string | null =>
  'path' in input.error && typeof input.error.path === 'string'
    ? input.error.path
    : null;

/**
 * .what = the errno's message, with the path it names cut to its repo-relative form
 * .why = the fix beside it names the path repo-relative; one readout must name one path one way
 */
const asErrnoMessageRepoRel = (input: {
  message: string;
  path: string | null;
}): string =>
  input.path
    ? input.message
        .split(input.path)
        .join(asRepoRelPathOfAgentPath({ path: input.path }))
    : input.message;

/**
 * .what = the fix for a mod path that cannot be read, by its errno
 */
const asModPathFix = (input: { code: string; path: string | null }): string => {
  const subject = input.path
    ? asRepoRelPathOfAgentPath({ path: input.path })
    : 'the mod file';
  if (input.code === 'EACCES' || input.code === 'EPERM')
    return `grant read access, via chmod u+r ${subject}`;
  return `repair ${subject} so it reads as the mod expects`;
};

/**
 * .what = an fs errno met inside one mod's read, as a classed fault that names its fix
 * .why = the gate, the render, and the stop sweep each name a fault with its fix, and the render
 *        records a refusal as a HelpfulError; a bare errno carries neither, so it is classed here
 *
 * .note = a constraint where the repo can repair the path, else a malfunction of the host
 */
export const asRoleModFaultOfErrno = (input: {
  error: Error;
  code: string;
}): HelpfulError => {
  const path = asErrnoPath({ error: input.error });
  const metadata = {
    // .note = `errno`, never `code`: helpful-errors reads a `code` key as its own option
    errno: input.code,
    path,
    fix: asModPathFix({ code: input.code, path }),
  };
  const message = `a mod path cannot be read (${asErrnoMessageRepoRel({ message: input.error.message, path })})`;
  if (ERRNOS_OF_MOD_PATH_REPAIRABLE.has(input.code))
    return new ConstraintError(message, metadata);
  return new MalfunctionError(message, metadata);
};
