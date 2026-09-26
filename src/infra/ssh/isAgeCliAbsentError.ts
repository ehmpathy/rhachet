import { BadRequestError } from 'helpful-errors';

import { AGE_CLI_ABSENT_MARKER } from './ageCliAbsentMarker';

/**
 * .what = whether an error is the "passphrase-protected key needs the age cli" hint
 * .why = the single rename-safe predicate every consumer shares — a reword of the
 *        message must go through AGE_CLI_ABSENT_MARKER, so this predicate and the
 *        producer message cannot drift apart (rule.require.solve-at-cause)
 * .note = narrows to BadRequestError first, so a genuine fault whose text merely
 *         happens to contain the marker is never mis-read as the hint
 *         (rule.forbid.failhide)
 */
export const isAgeCliAbsentError = (error: unknown): boolean =>
  error instanceof BadRequestError &&
  error.message.includes(AGE_CLI_ABSENT_MARKER);
