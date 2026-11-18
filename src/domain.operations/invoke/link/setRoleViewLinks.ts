import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { symlinkFile } from './symlinkFile';

/**
 * .what = lay one kind dir of a role view as per-file links, one per path
 * .why = the link context owns how a role dir's links are made; a caller that builds a view
 *        of single files (a modded role) states the links, and this lays them
 *
 * .note = each path is relative to the kind dir; its parent dirs are made as needed
 */
export const setRoleViewLinks = (input: {
  dir: string;
  links: Array<{ path: string; target: string }>;
}): void => {
  mkdirSync(input.dir, { recursive: true });
  for (const link of input.links) {
    const linkPath = join(input.dir, link.path);
    mkdirSync(dirname(linkPath), { recursive: true });
    symlinkFile({ sourcePath: link.target, targetPath: linkPath });
  }
};
