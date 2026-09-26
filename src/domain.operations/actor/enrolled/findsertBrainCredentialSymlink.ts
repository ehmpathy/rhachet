import {
  existsSync,
  lstatSync,
  readlinkSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { join } from 'node:path';

/**
 * .what = link the brain dir's `.credentials.json` to the human's, absolute
 * .why = a relocated config dir holds no login of its own, so a clone would meet
 *   "Not logged in"; a symlink shares the human's login and follows its refresh
 * .note = a real `.credentials.json` in the brain dir (a `/login` inside a clone) is
 *   kept — per-actor auth is intended. an absent human credential links no file:
 *   the caller names it, since an env key or api helper may still authenticate
 */
export const findsertBrainCredentialSymlink = (input: {
  brainDir: string;
  home: string;
}): { status: 'linked' | 'unchanged' | 'kept' | 'absent'; target: string } => {
  const target = join(input.home, '.claude', '.credentials.json');
  const linkPath = join(input.brainDir, '.credentials.json');

  // a real file in the brain dir is this actor's own login; keep it
  const found = lstatSync(linkPath, { throwIfNoEntry: false });
  if (found && !found.isSymbolicLink()) return { status: 'kept', target };

  // no human credential to share
  if (!existsSync(target)) return { status: 'absent', target };

  // a symlink already aimed at the target needs no write
  if (found && readlinkSync(linkPath) === target)
    return { status: 'unchanged', target };

  // a symlink aimed elsewhere is replaced; an absent one is created
  if (found) rmSync(linkPath);
  symlinkSync(target, linkPath);
  return { status: 'linked', target };
};
