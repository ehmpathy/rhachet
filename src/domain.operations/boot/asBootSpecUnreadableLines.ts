import { relative } from 'node:path';

/**
 * .what = the readout for a spec a repo-wide cost report could not read or parse
 * .why = a skipped spec must say so, or the roster reads as though it cost zero
 *        (`rule.forbid.failhide`). a report may warn here where `roles boot` still halts.
 *
 * .note = it renders to STDERR at its call site, beside the rows a caller piped for
 *   (`rule.require.skill-terminator-for-verdicts`).
 *
 * 🔴 .note = the header glyph is `🟡`, never `✋`: naught is thrown and the report exits 0, and
 *   `✋` binds to `ConstraintError` and exit 2 (`rule.require.unabridged-error-prefix`). the
 *   `fault =` row quotes the error's own first line, glyph and class included.
 */
export const asBootSpecUnreadableLines = (input: {
  pathToSpec: string;
  cwd: string;
  error: unknown;
}): string[] => {
  const fault =
    input.error instanceof Error
      ? (input.error.message.split('\n')[0] ?? '')
      : String(input.error);

  return [
    '',
    '🟡 a boot spec could not be read — it is absent from the roster below',
    `   ├─ spec  = ${relative(input.cwd, input.pathToSpec)}`,
    `   ├─ fault = ${fault}`,
    '   └─ hint: repair the spec, or report it upstream where it is a linked role',
    '',
  ];
};
