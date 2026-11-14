import { lstatSync, statSync } from 'node:fs';

/**
 * .what = whether a path is a symlink that reaches a dir
 * .why = a role's kind dir is built of dir links; a link that dangles, or reaches a file, is no
 *        source of a view
 *
 * .note = a path gone between the readdir that named it and this probe is no link; a render
 *   that swaps the kind dir may move it mid-walk, and the caller falls back to the record
 */
export const isDirLink = (input: { path: string }): boolean =>
  !!lstatSync(input.path, { throwIfNoEntry: false })?.isSymbolicLink() &&
  !!statSync(input.path, { throwIfNoEntry: false })?.isDirectory();
