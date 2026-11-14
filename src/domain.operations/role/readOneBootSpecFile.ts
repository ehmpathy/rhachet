import { ConstraintError } from 'helpful-errors';

import { readFileSync } from 'node:fs';

const MESSAGE_VANISHED = 'a boot spec vanished between the check and the read';

/**
 * .what = reads one `boot.yml`, and classifies a vanished spec as a caller fault
 * .why = every caller reaches its spec through a CHECK-then-READ pair — a glob in the
 *        `roles cost --all` sweep, an `existsSync` at the two gates — and the window between
 *        the two is real. a rebase, a `pnpm install` that relinks a role, an editor that
 *        rewrites via unlink+create: any of them removes the file the check just found.
 *
 * 🔴 .note = an unclassified `ENOENT` escapes as a raw `Error`, which `getExitCodeFromError`
 *   defaults to exit **1** — a MALFUNCTION code for a fault the server did not commit
 *   (`rule.require.exit-code-semantics`). the caller's own tree moved, and a re-run on a
 *   settled tree fixes it, so it is exit 2 by the test `rule.require.failloud` sorts by.
 *
 * .note = only `ENOENT` is re-classed. a permission fault, a directory where a file was
 *   expected, or an i/o fault are NOT caller races, so they escape unchanged rather than be
 *   swept into one bucket (`rule.forbid.failhide`).
 *
 * .note = the vanish is classified, not separately discriminable: no caller tells it apart
 *   from another `ConstraintError`. a caller that needs to should key on `MESSAGE_VANISHED`.
 */
export const readOneBootSpecFile = (input: { pathToSpec: string }): string => {
  try {
    return readFileSync(input.pathToSpec, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error;
    throw new ConstraintError(MESSAGE_VANISHED, {
      pathToSpec: input.pathToSpec,
      // .note = `why`, never `cause` — `cause` is reserved on an `Error`, and it must
      //   carry an `Error` rather than a sentence. a string there is a type fault
      why: 'the spec was found on disk, then was removed or relinked',
      hint: 're-run — a settled tree reads cleanly',
    });
  }
};
