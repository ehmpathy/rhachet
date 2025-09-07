import { UnexpectedCodePathError } from 'helpful-errors';
import pathFns from 'path';
import { PickOne } from 'type-fns';

/**
 * .what = get the path of the file of the caller of this procedure
 * .why =
 *   - automatically and reliably lookup the caller path
 */
export const getCallerFilePath = (
  input: {
    /**
     * .what = the distance of the caller to this fn
     * .why = if you compose this fn within another before your target caller, the depth may shift (e.g., for each wrapper, +1, w/ start at 1)
     */
    depth: number;
  } = { depth: 1 },
): string | null => {
  const originalPrepare = Error.prepareStackTrace;
  try {
    Error.prepareStackTrace = (_, stack) => stack;
    const err = new Error();
    const stack = err.stack as unknown as NodeJS.CallSite[];

    // stack[0] is this fn, stack[1] is the caller of this fn
    const caller = stack[input.depth]; // note: if wrapped, might need depth = 2; e.g., [0]=getCallerFile, [1]=wrapper, [2]=caller
    if (!caller) return null;
    const callerFileName = caller.getFileName();
    return callerFileName ? pathFns.resolve(callerFileName) : null;
  } finally {
    Error.prepareStackTrace = originalPrepare;
  }
};

/**
 * .what = get the expected path of the template file for a given caller file
 * .why =
 *   - template files are typically collocated with their caller file, simply replacing the extension with `.template.md`
 *   - this automates that replacement
 */
export const getTemplatePathByCallerPath = (
  input: PickOne<{
    /**
     * .what = choice to self declare the caller path
     */
    path: string;

    /**
     * .what = choice to auto detect the caller path
     */
    auto: true;
  }>,
): string => {
  // grab the path; support "auto" for auto detection
  const path =
    input.auto === true
      ? getCallerFilePath({ depth: 2 }) ??
        UnexpectedCodePathError.throw(
          'should have been able to get caller file path',
        )
      : input.path;

  // parse dir, name, and ext separately
  const { dir, name } = pathFns.parse(path);

  // join with a new extension, universally
  return pathFns.join(dir, `${name}.template.md`);
};
