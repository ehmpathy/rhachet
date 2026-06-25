import { ConstraintError } from 'helpful-errors';

/**
 * .what = regex to detect AWS SSO timeout messages
 * .why = AWS CLI emits various messages when SSO auth times out:
 *        - "timed out"
 *        - "authorization...expired" (queued authorization has expired)
 *        - "authorization request" (authorization request expired)
 */
const SSO_TIMEOUT_REGEX = /timed out|authorization.*expired|authorization request/i;

/**
 * .what = check if output indicates SSO timeout
 * .why = detect timeout vs other failures to emit correct error type
 */
export const isSsoTimeout = (output: string): boolean =>
  SSO_TIMEOUT_REGEX.test(output);

/**
 * .what = treestruct error lines for SSO timeout
 * .why = loud, clear output for robot visibility
 */
const SSO_TIMEOUT_TREESTRUCT = [
  '',
  '✋ keyrack unlock',
  '   └─ aws sso login timed out',
  '      ├─ status: blocked 🚫',
  '      │  └─ human did not respond to browser sso prompt',
  '      ├─ robot: halt and escalate',
  '      │  ├─ do not proceed',
  '      │  ├─ do not find workarounds',
  '      │  └─ do not skip credentials',
  '      └─ fix: rhx keyrack unlock',
  '',
];

/**
 * .what = emit treestruct error and create ConstraintError for SSO timeout
 * .why = ensures consistent, loud error behavior across all SSO timeout paths
 *
 * @param meta - additional context for the error
 * @returns ConstraintError (caller can throw or reject with it)
 */
export const createSsoTimeoutError = (meta?: Record<string, unknown>) => {
  // emit to stderr for robot visibility
  console.error(SSO_TIMEOUT_TREESTRUCT.join('\n'));

  return new ConstraintError(
    'aws sso login timed out: human did not respond to browser sso prompt',
    { ...meta, hint: 'run: rhx keyrack unlock' },
  );
};
