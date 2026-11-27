import * as path from 'node:path';

/**
 * .what = the path of a file in the repo actor's brain dir
 * .why = a mods suite reads the boot.md, settings, and hook manifest the repo actor holds; one
 *        builder keeps each suite's path to that dir the same
 */
export const asAmbientBrainPath = (input: {
  repo: string;
  file: string;
}): string =>
  path.join(
    input.repo,
    '.agent',
    '.actors',
    'actor.via.repo=ambient',
    'brain',
    '.claude',
    input.file,
  );
