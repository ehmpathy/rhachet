import { relative, sep } from 'node:path';

/**
 * .what = the path from one dir to a target, joined with `/` on any host
 * .why = a key built from a relative path (a plan key, a boot row) must read the same on a host
 *        whose separator is a backslash, so the join is owned once
 */
export const asPathRelPosix = (input: { from: string; to: string }): string =>
  relative(input.from, input.to).split(sep).join('/');
