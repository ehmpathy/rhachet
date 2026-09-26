import { BadRequestError } from 'helpful-errors';

import { FIDO_UNSUPPORTED_MARKER } from './fidoUnsupportedMarker';

/**
 * .what = whether an error is the "FIDO/hardware-token key is unsupported in v1" hint
 * .why = the single rename-safe predicate every consumer shares — a reword of the
 *        message must go through FIDO_UNSUPPORTED_MARKER, so this predicate and the
 *        producer message cannot drift apart (rule.require.solve-at-cause)
 * .note = narrows to BadRequestError first, so a genuine fault whose text merely
 *         happens to contain the marker is never mis-read as the hint
 *         (rule.forbid.failhide)
 */
export const isFidoUnsupportedError = (error: unknown): boolean =>
  error instanceof BadRequestError &&
  error.message.includes(FIDO_UNSUPPORTED_MARKER);
