import { MalfunctionError } from 'helpful-errors';

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * .what = the stdout of one `ps` call
 * .why = a ps that failed must fail loud: an empty table would read as a clean box, so a sweep
 *   would pass a run whose leaks it never saw, and a residue count would read a pile as zero
 *
 * .note = async, never `spawnSync`: callers run beside a live background pty, which drains only
 *   while the event loop turns (`rule.forbid.sync-invoke-while-a-pty-is-live`)
 */
export const getOnePsTable = async (input: { args: string[] }): Promise<string> => {
  const listed = await execFileAsync('ps', input.args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).catch((error: NodeJS.ErrnoException & { stderr?: string }) => {
    throw new MalfunctionError('ps failed, so the process table could not be read', {
      args: input.args,
      code: error.code ?? null,
      error: error.message,
      stderr: error.stderr ?? null,
      hint: 'check that ps is on PATH; the read cannot run without it',
    });
  });
  return listed.stdout;
};
