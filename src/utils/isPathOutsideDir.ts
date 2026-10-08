import { isAbsolute, relative, sep } from 'node:path';

/**
 * .what = whether a path escapes a directory
 * .why = the manifest boundary and the registry budget gate both refuse a path outside a bound,
 *        and the escape test has already drifted once between call sites. one owner holds it
 *
 * 🔴 .note = the test needs BOTH arms, and the second is reachable only on win32. `relative`
 *   yields `..`-prefixed segments where the two operands share a root — the only outcome on
 *   posix. on win32 a target on another drive shares no root, so `relative` returns that
 *   target's own ABSOLUTE path (`D:\evil\boot.yml`), which starts with no `..`. `isAbsolute`
 *   covers the drive-letter and UNC forms alike, and on posix it costs naught
 * .note = the escape is a `..` SEGMENT — the whole of `within`, or its head before a `sep`.
 *   a child named `..hidden` also starts with `..`, and is inside
 */
export const isPathOutsideDir = (input: {
  path: string;
  dir: string;
}): boolean => {
  const within = relative(input.dir, input.path);
  const isParentSegment = within === '..' || within.startsWith(`..${sep}`);
  return isParentSegment || isAbsolute(within);
};
