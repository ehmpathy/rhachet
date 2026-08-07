import { ConstraintError, MalfunctionError } from 'helpful-errors';

/**
 * .what = the SSM resource path IAM statements scope to — mirrors asKeyrackAwsParamName's prefix
 * .why = the grant list points a policy author at the exact resource arn suffix keyrack's params
 *        live under, so a pasted statement matches the real param names
 * .note = DescribeParameters is the exception — it does NOT support a resource-level scope, so it
 *         MUST be granted on `*` (the exact trap that bit the incident policy)
 */
const AWS_PARAMS_PATH = 'parameter/keyrack/infra/vault/aws.params/*';

/**
 * .what = the paste-ready IAM grant list an aws.params op needs, as `;`-joinable hint parts
 * .why = req3 — a denial must hand the human the COMPLETE fix, not just the one denied action. the
 *        set findsert reads metadata (Describe → ListTags) BEFORE it writes (Put) then reads back
 *        (Get + kms), so a Put/Get-only policy fails at Describe (the incident). v1 prints the full
 *        static list (no probe); the human diffs it against their policy
 * .note = this list DUPLICATES declastruct-aws's findsert call sequence — if declastruct adds an
 *         action, the list goes stale. the raw-AWS-error forward (asKeyrackAwsRawLine) is the safety
 *         net: a NEW denied action still shows verbatim even when it is absent from this list
 * .note = kms is structurally-required (a SecureString must encrypt to write, decrypt to read back)
 *         but was NOT denial-observed — a box on the default alias/aws/ssm key may already hold it
 *         implicitly — so it is LISTED, never asserted as the denial
 */
const asKeyrackAwsParamGrantList = (input: {
  op: 'read' | 'write' | 'delete';
}): string[] => {
  if (input.op === 'write')
    return [
      'aws.params set needs these grants on this identity:',
      'ssm:DescribeParameters on * (MUST be "*", no resource scope)',
      `ssm:ListTagsForResource on ${AWS_PARAMS_PATH}`,
      `ssm:PutParameter on ${AWS_PARAMS_PATH}`,
      `ssm:GetParameter on ${AWS_PARAMS_PATH}`,
      'kms:Encrypt, kms:Decrypt on the key that encrypts these params (implicit on the default alias/aws/ssm key)',
    ];
  // del type-guards before it destroys, but the guard is METADATA-ONLY: declastruct-aws's
  // delSsmParameterSecure calls getOneSsmParameterSecure (DescribeParameters + ListTagsForResource,
  // verified verbatim against declastruct-aws@1.10.1 getOneSsmParameterSecure.js docblock: "NO
  // GetParameter and NO kms:Decrypt is ever issued") THEN delParameter (DeleteParameter). so a del
  // denial needs Describe(*) + ListTags + Delete — NOT Get, NOT kms (a del never decrypts)
  if (input.op === 'delete')
    return [
      'aws.params del needs these grants on this identity:',
      'ssm:DescribeParameters on * (MUST be "*", no resource scope)',
      `ssm:ListTagsForResource on ${AWS_PARAMS_PATH}`,
      `ssm:DeleteParameter on ${AWS_PARAMS_PATH}`,
    ];
  return [
    'aws.params unlock needs these grants on this identity:',
    `ssm:GetParameter on ${AWS_PARAMS_PATH}`,
    'kms:Decrypt on the key that encrypts these params (implicit on the default alias/aws/ssm key)',
  ];
};

/**
 * .what = the verbatim AWS error name + message, as a single rendered hint part
 * .why = req1 (failtrim) — the raw AWS line names the TRUE denied action + resource, and it must
 *        reach the human-visible output on EVERY branch as an ADDITIVE layer, never only the
 *        redacted metadata cause. a wrong classification must degrade to "unhelpful hint beside the
 *        truth", never "a lie that hides the truth"
 * .note = SSM errors name the principal + action + resource, never the secret VALUE — and this gate
 *         never even receives the value (its input is {cause, exid, region}), so the forward cannot
 *         leak a secret by construction
 */
const asKeyrackAwsRawLine = (input: {
  name: string;
  message: string;
}): string =>
  input.name
    ? `why (raw AWS): ${input.name} — ${input.message}`
    : `why (raw AWS): ${input.message}`;

/**
 * .what = map a raw AWS SDK error to the keyrack gate it represents (a classed ConstraintError
 *         that names the fix, or a MalfunctionError for the unknown), for a read OR a write op
 * .why = gate classification is pure logic; extracted so it is unit-tested against fixture error
 *        shapes, not only via misconfigured IAM/KMS in a shared account
 *
 * .note = the op discriminator picks the grant the hint names: read -> ssm:GetParameter /
 *         kms:Decrypt, write -> ssm:PutParameter / kms:Encrypt, delete -> ssm:DeleteParameter
 *         (del's type-guard is metadata-only — Describe + ListTags — so it never decrypts, no kms)
 * .note = gate ORDER matters — the AccessDenied gates (kms, ssm) are checked BEFORE the
 *         no-identity gate. AWS's own AccessDenied message ends "...no identity-based policy
 *         allows the action", so a no-identity gate that matched message prose would launder a
 *         permission denial into "no credentials" (the incident). the no-identity gate now
 *         classifies on the stable error NAME only (CredentialsProviderError)
 */
export const asKeyrackAwsParamErrorGate = (
  input: {
    cause: unknown;
    exid: string;
    region: string;
  },
  options?: { op?: 'read' | 'write' | 'delete' },
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

  // op decides which grant the fallback names + which grant list to render
  const op = options?.op ?? 'read';
  const ssmActionFallback =
    op === 'write'
      ? 'ssm:PutParameter'
      : op === 'delete'
        ? 'ssm:DeleteParameter'
        : 'ssm:GetParameter';
  // write encrypts, read decrypts; del never touches kms (its type-guard is metadata-only), so
  // this fallback is inert for del — a del denial never reaches the kms gate
  const kmsActionFallback = op === 'write' ? 'kms:Encrypt' : 'kms:Decrypt';
  // the CLI verb the human re-runs, per op — names the retry precisely (del, not "unlock")
  const opCommand = op === 'write' ? 'set' : op === 'delete' ? 'del' : 'unlock';

  // the TRUE denied action, extracted from AWS's own message ("...is not authorized to perform:
  // <action> on resource: ..."), so the gate names the action AWS ACTUALLY rejected — which may be
  // neither Put nor Get (the incident's denial was ssm:DescribeParameters, a metadata read the
  // findsert makes before the write). fall back to the op-guessed action when the shape is absent
  const deniedActionMatch = /not authorized to perform:?\s*(\S+)/i.exec(
    message,
  );
  const deniedAction = deniedActionMatch?.[1] ?? null;

  // the raw AWS line + the paste-ready grant list — the two additive layers every denial forwards
  const rawLine = asKeyrackAwsRawLine({ name, message });
  const grantList = asKeyrackAwsParamGrantList({ op });

  // gate 7 — kms denied, distinct, matched before the generic ssm denial
  if (
    /kms|encrypt|decrypt/i.test(message) &&
    (name === 'AccessDeniedException' ||
      /AccessDenied|not authorized/i.test(message))
  )
    return new ConstraintError(
      `aws.params identity cannot ${deniedAction ?? kmsActionFallback}`,
      {
        exid: input.exid,
        region,
        // the raw AWS line first (names the true action), then the full grant list to paste
        hint: [
          `add the absent kms grant to this identity, then re-run`,
          rawLine,
          ...grantList,
        ].join('; '),
        cause: causeError,
      },
    );

  // gate 4 — ssm denied
  if (
    name === 'AccessDeniedException' ||
    /AccessDenied|not authorized/i.test(message)
  )
    return new ConstraintError(
      `aws.params identity cannot ${deniedAction ?? ssmActionFallback}`,
      {
        exid: input.exid,
        region,
        hint: [
          `add the absent grant to this identity, then re-run`,
          rawLine,
          ...grantList,
        ].join('; '),
        cause: causeError,
      },
    );

  // gate 2 — no ambient identity. classify on the STABLE error NAME only (CredentialsProviderError),
  // checked AFTER the AccessDenied gates: a permission denial is NOT a missing identity, and AWS's
  // AccessDenied prose ("no identity-based policy") must never be mistaken for one
  if (name === 'CredentialsProviderError')
    return new ConstraintError('aws.params found no AWS identity', {
      exid: input.exid,
      region,
      // the identity is a hardcut on the --org scope, never an ambient SSO grab: a grove-wide
      // key (--org @all) needs the grove's own instance role (IMDS); a tree-scoped key needs
      // that org's AWS_PROFILE declared + unlocked in the keyrack — so name the exact unlock
      // command the human runs to fill it (rule.require.errors-name-the-fix), plus the raw line
      hint: [
        'for --org @all run on a box whose instance role can read this param',
        "for a specific org, unlock that org's AWS_PROFILE first — run `rhx keyrack unlock --owner <owner> --env <env>` (declare the AWS_PROFILE key first if unset), never a cached SSO session",
        rawLine,
      ].join('; '),
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
        hint: [
          `transient — retry the ${opCommand}; v1 does not auto-retry`,
          rawLine,
        ].join('; '),
        cause: causeError,
      },
    );

  // unknown → a real malfunction, surfaced with context + the raw line, never masked
  return new MalfunctionError(`aws.params SSM ${op} failed`, {
    exid: input.exid,
    region,
    hint: [
      'an unexpected SSM error — inspect the cause; this was never mapped to a known gate',
      rawLine,
    ].join('; '),
    cause: causeError,
  });
};
