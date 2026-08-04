import { ConstraintError, MalfunctionError } from 'helpful-errors';

/**
 * .what = map a raw AWS SDK error to the keyrack gate it represents (a classed ConstraintError
 *         that names the fix, or a MalfunctionError for the unknown), for a read OR a write op
 * .why = gate 2/4/7 classification is pure logic; extracted so it is unit-tested against
 *        fixture error shapes, not only via misconfigured IAM/KMS in a shared account
 *
 * .note = the op discriminator picks the grant the hint names: read -> ssm:GetParameter /
 *         kms:Decrypt, write -> ssm:PutParameter / kms:Encrypt
 */
export const asKeyrackAwsParamErrorGate = (
  input: {
    cause: unknown;
    exid: string;
    region: string;
  },
  options?: { op?: 'read' | 'write' },
): ConstraintError | MalfunctionError => {
  const name = input.cause instanceof Error ? input.cause.name : '';
  const message =
    input.cause instanceof Error ? input.cause.message : String(input.cause);
  const region = input.region;
  // metadata.cause expects an Error; a non-Error cause is rare (the SDK throws Errors) but
  // narrow it so the raw value never breaks the type — its String form is kept in message
  const causeError = input.cause instanceof Error ? input.cause : undefined;

  // AWS SDK v3 carries the HTTP status on the structured $metadata field, not as digits in
  // prose — read it via successive in/typeof refinements, no as-cast
  const httpStatus =
    input.cause instanceof Error &&
    '$metadata' in input.cause &&
    typeof input.cause.$metadata === 'object' &&
    input.cause.$metadata !== null &&
    'httpStatusCode' in input.cause.$metadata &&
    typeof input.cause.$metadata.httpStatusCode === 'number'
      ? input.cause.$metadata.httpStatusCode
      : null;

  // op decides which grant a denial names — the only difference between read and write
  const op = options?.op ?? 'read';
  const ssmAction = op === 'write' ? 'ssm:PutParameter' : 'ssm:GetParameter';
  const kmsAction = op === 'write' ? 'kms:Encrypt' : 'kms:Decrypt';

  // gate 2 — no ambient identity
  if (
    name === 'CredentialsProviderError' ||
    /could not load credentials|no identity/i.test(message)
  )
    return new ConstraintError('aws.params found no AWS identity', {
      exid: input.exid,
      region,
      // the identity is a hardcut on the --org scope, never an ambient SSO grab: a grove-wide
      // key (--org @all) needs the grove's own instance role (IMDS); a tree-scoped key needs
      // that org's AWS_PROFILE declared + unlocked in the keyrack — so name the exact unlock
      // command the human runs to fill it (rule.require.errors-name-the-fix)
      hint: "for --org @all run on a box whose instance role can read this param; for a specific org, unlock that org's AWS_PROFILE first — run `rhx keyrack unlock --owner <owner> --env <env>` (declare the AWS_PROFILE key first if unset), never a cached SSO session",
      cause: causeError,
    });

  // gate 7 — kms denied, distinct, matched before the generic denial
  if (
    /kms|encrypt|decrypt/i.test(message) &&
    (name === 'AccessDeniedException' ||
      /AccessDenied|not authorized/i.test(message))
  )
    return new ConstraintError(
      `aws.params identity cannot ${kmsAction} this param`,
      {
        exid: input.exid,
        region,
        hint: `add a ${kmsAction} grant on the KMS key that encrypts this param`,
        cause: causeError,
      },
    );

  // gate 4 — ssm denied
  if (
    name === 'AccessDeniedException' ||
    /AccessDenied|not authorized/i.test(message)
  )
    return new ConstraintError(`aws.params identity cannot ${ssmAction}`, {
      exid: input.exid,
      region,
      hint: `add an ${ssmAction} grant on this param to the identity`,
      cause: causeError,
    });

  // gate e9 — a transient throttle / 5xx; v1 does not auto-retry
  if (
    name === 'ThrottlingException' ||
    name === 'TooManyUpdatesException' ||
    (httpStatus !== null && httpStatus >= 500) ||
    /throttl|rate exceeded|InternalServerError/i.test(message)
  )
    return new MalfunctionError(
      `aws.params SSM ${op} hit a transient throttle or 5xx`,
      {
        exid: input.exid,
        region,
        hint: `transient — retry the ${op === 'write' ? 'set' : 'unlock'}; v1 does not auto-retry`,
        cause: causeError,
      },
    );

  // unknown → a real malfunction, surfaced with context + a hint, never masked
  return new MalfunctionError(`aws.params SSM ${op} failed`, {
    exid: input.exid,
    region,
    hint: 'an unexpected SSM error — inspect the cause; this was never mapped to a known gate',
    cause: causeError,
  });
};
