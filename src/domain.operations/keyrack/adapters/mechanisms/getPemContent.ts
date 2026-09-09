import { ConstraintError } from 'helpful-errors';

import { readFileSync } from 'node:fs';

/**
 * .what = read a pem file's content from disk
 * .why = the github-app source credential embeds the pem; this isolates the fs read
 *        behind a named communicator so the pem-read path is testable
 *
 * .note = a caller-typed path that cannot be read is caller-fixable, so this throws a
 *         ConstraintError (exit 2) with a hint — the set action renders it as a blocked
 *         treestruct, not a raw exception dump
 */
export const getPemContent = (input: { path: string }): string => {
  try {
    return readFileSync(input.path, 'utf-8');
  } catch (error) {
    // ⚠️ the OS error is reduced to its CODE, never carried whole. the raw node message —
    //    `ENOENT: no such file or directory, open './x.pem'` — restates the path a THIRD time
    //    (after `pemPath:` and `hint:`) and dressed an otherwise-branded refusal tree in an
    //    unpolished dump (`rule.forbid.snapshot-visual-blemishes`).
    // .why.kept = the code is NOT dropped with it, because it is the one fact the other leaves
    //    do not carry: `ENOENT` (the path is absent) and `EACCES` (it exists, you may not read
    //    it) are different faults with different fixes, and a human who reads only "could not
    //    read" cannot tell them apart (`rule.require.refusals-carry-context`)
    const errorCode = (error as NodeJS.ErrnoException).code ?? null;
    throw new ConstraintError('could not read pem file', {
      pemPath: input.path,
      ...(errorCode ? { errorCode } : {}),
      hint: `check the path exists and is readable: ${input.path}`,
    });
  }
};
