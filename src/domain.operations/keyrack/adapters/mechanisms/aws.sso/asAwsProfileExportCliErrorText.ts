import { HelpfulError } from 'helpful-errors';

/**
 * .what = the cli's own error text from a `genAwsProfileExport` failure, lowercased; '' if the
 *   failure did not come from the cli
 * .why = a caller that sorts "session expired" from "unexpected" must read only what the cli
 *   said, never the serialized metadata — a profile named `acme-invalid` or a hint that says
 *   "does not exist" must not flip the branch
 * .note = a hang, a disk fault, or a short export carries no `cliError`, so it reads as '' and
 *   the caller treats it as unexpected; a non-helpful error (a raw throw) reads by its message
 */
export const asAwsProfileExportCliErrorText = (input: {
  error: unknown;
}): string => {
  // our own error: only its cliError counts
  if (input.error instanceof HelpfulError) {
    const cliError = (
      input.error.metadata as { cliError?: unknown } | undefined
    )?.cliError;
    return typeof cliError === 'string' ? cliError.toLowerCase() : '';
  }

  // a raw error: its message is all there is
  if (input.error instanceof Error) return input.error.message.toLowerCase();
  return '';
};
