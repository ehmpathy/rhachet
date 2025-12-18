import { isPresent } from 'type-fns';

import path from 'node:path';

/**
 * .what = adds an attempt qualifier to an output file path
 * .why =
 *   - ensures deterministic, per-attempt output paths
 *   - supports explicit token replacement via `{{attempt}}` or automatic suffix
 * .how =
 *   - if `path` contains `{{attempt}}` → replace with `i${attempt}`
 *   - else → insert `.i{attempt}` before the final extension
 */
export const addAttemptQualifierToOutputPath = (input: {
  path: string;
  attempt: number;
}): string => {
  // if replacement variable is present, replace it
  if (input.path.includes('{{attempt}}'))
    return input.path.replace(/\{\{attempt\}\}/g, `i${input.attempt}`);

  // parse the path parts
  const parts = path.parse(input.path);

  // build the path
  return path.join(
    parts.dir,
    [parts.name, `i${input.attempt}`, parts.ext.replace(/^\./, '') || null]
      .filter(isPresent)
      .join('.'),
  );
};
