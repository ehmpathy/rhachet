/**
 * .what = the fs error codes a write of the trace log may meet on a sound host
 * .why = the sink passes over exactly these — a full disk, a lost permission, a path that is
 *   not a dir — and throws every other error up. an allowlist, never a denylist, so a fault
 *   the sink was never meant to hide cannot read as a lost trace (`rule.forbid.failhide`)
 */
const TRACE_LOG_WRITE_FAULT_CODES = new Set([
  'EACCES',
  'EPERM',
  'EROFS',
  'ENOSPC',
  'EDQUOT',
  'EIO',
  'ENOTDIR',
  'EISDIR',
  'ENOENT',
  'EMFILE',
  'ENFILE',
  'EBUSY',
]);

/**
 * .what = whether an error is an fs write fault the trace sink may pass over
 * .why = an fs fault carries a string errno `code`; it is read off any error-shaped value,
 *   since a fault minted in another realm fails `instanceof Error`
 */
export const isTraceLogWriteFault = (input: { error: unknown }): boolean =>
  typeof input.error === 'object' &&
  input.error !== null &&
  'code' in input.error &&
  typeof input.error.code === 'string' &&
  TRACE_LOG_WRITE_FAULT_CODES.has(input.error.code);
