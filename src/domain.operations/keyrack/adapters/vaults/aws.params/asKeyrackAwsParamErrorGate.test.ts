import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asKeyrackAwsParamErrorGate } from './asKeyrackAwsParamErrorGate';

/** .what = build a fixture AWS SDK error with a name + optional http status */
const genAwsError = (input: {
  name: string;
  message?: string;
  httpStatusCode?: number;
}): Error => {
  const error = new Error(input.message ?? input.name);
  error.name = input.name;
  // attach the AWS SDK v3 $metadata shape via Object.assign (no as-cast) when a status is present —
  // mirrors the peer-defect test's Object.assign convention for fabricated error shapes
  if (input.httpStatusCode !== undefined)
    Object.assign(error, {
      $metadata: { httpStatusCode: input.httpStatusCode },
    });
  return error;
};

/** .what = read the rendered hint off a classed gate result
 *  .why = narrow the metadata via in + typeof refinements (no as-cast, per rule.forbid.as-cast) —
 *         the same refinement style the prod gate uses to read $metadata */
const getHint = (result: ConstraintError | MalfunctionError): string => {
  const { metadata } = result;
  if (
    typeof metadata === 'object' &&
    metadata !== null &&
    'hint' in metadata &&
    typeof metadata.hint === 'string'
  )
    return metadata.hint;
  throw new Error('expected a string hint in the error metadata');
};

describe('asKeyrackAwsParamErrorGate', () => {
  given('[case1] no ambient identity (c13)', () => {
    when('[t0] classified', () => {
      const result = asKeyrackAwsParamErrorGate({
        cause: genAwsError({ name: 'CredentialsProviderError' }),
        exid: '/x',
        region: 'us-east-1',
      });
      then('a ConstraintError names the SSO/role fix', () => {
        expect(result).toBeInstanceOf(ConstraintError);
        expect(result.message).toContain('no AWS identity');
      });
      then('the raw AWS line is forwarded into the hint (req1)', () => {
        expect(getHint(result)).toContain('why (raw AWS)');
        expect(getHint(result)).toContain('CredentialsProviderError');
      });
      then(
        'the no-identity hint matches snapshot (user-faced contract)',
        () => {
          expect(getHint(result)).toMatchSnapshot();
        },
      );
    });
  });

  given('[case2] ssm denied (c14)', () => {
    when('[t0] read op', () => {
      const result = asKeyrackAwsParamErrorGate(
        {
          cause: genAwsError({
            name: 'AccessDeniedException',
            message: 'AccessDenied',
          }),
          exid: '/x',
          region: 'us-east-1',
        },
        { op: 'read' },
      );
      then(
        'it names ssm:GetParameter (op fallback, no action in prose)',
        () => {
          expect(result).toBeInstanceOf(ConstraintError);
          expect(result.message).toContain('ssm:GetParameter');
        },
      );
      then('the read grant-list hint matches snapshot (user-faced)', () => {
        expect(getHint(result)).toMatchSnapshot();
      });
    });
    when('[t1] write op', () => {
      const result = asKeyrackAwsParamErrorGate(
        {
          cause: genAwsError({
            name: 'AccessDeniedException',
            message: 'AccessDenied',
          }),
          exid: '/x',
          region: 'us-east-1',
        },
        { op: 'write' },
      );
      then('it names ssm:PutParameter (op fallback)', () => {
        expect(result.message).toContain('ssm:PutParameter');
      });
      then('the write grant list is rendered into the hint (req3)', () => {
        const hint = getHint(result);
        expect(hint).toContain('ssm:DescribeParameters on *');
        expect(hint).toContain('ssm:ListTagsForResource');
        expect(hint).toContain('ssm:PutParameter');
        expect(hint).toContain('ssm:GetParameter');
        expect(hint).toContain('kms:Encrypt, kms:Decrypt');
      });
      then('the write grant-list hint matches snapshot (user-faced)', () => {
        expect(getHint(result)).toMatchSnapshot();
      });
    });
  });

  given(
    '[case8] ssm denied on a delete op (the del path — c14 for del)',
    () => {
      // the vision names del in scope: "destroy (`keyrack del`) with the same denied-action
      // clarity". a DeleteParameter denial must classify to the ssm gate (NOT a bare
      // MalfunctionError), name the TRUE denied action, and render the del-specific grant list
      when('[t0] the denied action is ssm:DeleteParameter', () => {
        const result = asKeyrackAwsParamErrorGate(
          {
            cause: genAwsError({
              name: 'AccessDeniedException',
              message:
                'User: arn:aws:sts::261599400667:assumed-role/some-role/i-0abc is not authorized to perform: ssm:DeleteParameter on resource: parameter/keyrack/... because no identity-based policy allows the action',
            }),
            exid: '/x',
            region: 'us-east-1',
          },
          { op: 'delete' },
        );
        then(
          'it is a ConstraintError (caller-fixable, NOT a MalfunctionError)',
          () => {
            expect(result).toBeInstanceOf(ConstraintError);
          },
        );
        then('it names the TRUE denied action ssm:DeleteParameter', () => {
          expect(result.message).toContain('ssm:DeleteParameter');
          expect(result.message).not.toContain('no AWS identity');
        });
        then('the del grant list is rendered into the hint (req3)', () => {
          const hint = getHint(result);
          expect(hint).toContain('aws.params del needs these grants');
          // del's true call sequence (verified against declastruct-aws@1.10.1):
          // DescribeParameters(*) -> ListTagsForResource -> DeleteParameter
          expect(hint).toContain('ssm:DescribeParameters on *');
          expect(hint).toContain('ssm:ListTagsForResource');
          expect(hint).toContain('ssm:DeleteParameter');
          // del's type-guard is METADATA-only — it never issues Get, Put, or kms
          expect(hint).not.toContain('ssm:GetParameter');
          expect(hint).not.toContain('ssm:PutParameter');
          expect(hint).not.toContain('kms:');
        });
        then('the raw AWS line survives in the hint (req1 failtrim)', () => {
          expect(getHint(result)).toContain('why (raw AWS)');
          expect(getHint(result)).toContain('ssm:DeleteParameter on resource');
        });
        then('the del denied-action hint matches snapshot (user-faced)', () => {
          expect(getHint(result)).toMatchSnapshot();
        });
      });
      when('[t1] op fallback when the action is absent from prose', () => {
        const result = asKeyrackAwsParamErrorGate(
          {
            cause: genAwsError({
              name: 'AccessDeniedException',
              message: 'AccessDenied',
            }),
            exid: '/x',
            region: 'us-east-1',
          },
          { op: 'delete' },
        );
        then('it names ssm:DeleteParameter (op fallback)', () => {
          expect(result.message).toContain('ssm:DeleteParameter');
        });
      });
    },
  );

  given(
    '[case6] the INCIDENT: AccessDenied whose prose contains "no identity-based policy" (2026-08-05)',
    () => {
      // the real AWS message that laundered a permission denial into "no AWS identity". the
      // denied action is DescribeParameters — NEITHER Put NOR Get — and the prose ends with the
      // "no identity-based policy" phrase the old gate-2 regex falsely matched
      const incidentMessage =
        'User: arn:aws:sts::261599400667:assumed-role/ahbode-camp-grove-role/i-0abc is not authorized to perform: ssm:DescribeParameters on resource: * because no identity-based policy allows the action';

      when('[t0] classified for the write (set) op', () => {
        const result = asKeyrackAwsParamErrorGate(
          {
            cause: genAwsError({
              name: 'AccessDeniedException',
              message: incidentMessage,
            }),
            exid: '/x',
            region: 'us-east-1',
          },
          { op: 'write' },
        );

        then(
          'it classifies to the ssm gate, NOT the no-identity gate (req2)',
          () => {
            expect(result).toBeInstanceOf(ConstraintError);
            expect(result.message).not.toContain('no AWS identity');
          },
        );

        then(
          'it names the TRUE denied action ssm:DescribeParameters (req3)',
          () => {
            // the action AWS actually rejected, extracted from the raw message — not the op guess
            expect(result.message).toContain('ssm:DescribeParameters');
          },
        );

        then('the verbatim raw AWS message survives in the hint (req1)', () => {
          const hint = getHint(result);
          expect(hint).toContain('why (raw AWS)');
          expect(hint).toContain('AccessDeniedException');
          expect(hint).toContain('ssm:DescribeParameters on resource: *');
        });

        then(
          'the hint calls out the Describe-needs-* trap + full grant list (req3)',
          () => {
            const hint = getHint(result);
            expect(hint).toContain(
              'ssm:DescribeParameters on * (MUST be "*", no resource scope)',
            );
            expect(hint).toContain('ssm:ListTagsForResource');
          },
        );

        then(
          'the full rendered hint matches snapshot (user-faced contract)',
          () => {
            // a snapshot of the richest hint (the incident write denial) so a PR reviewer sees the
            // whole user-faced raw-line + grant-list shape at a glance — the error path is never
            // exercised by acceptance (a real IAM denial cannot be triggered in a test), so this unit
            // snapshot is the one visual guard on the hint format. paired with the toContain
            // assertions above (rule.require.snapshots = snapshot + explicit assertions)
            expect(getHint(result)).toMatchSnapshot();
          },
        );
      });
    },
  );

  given(
    '[case7] secret-safety: the gate never receives the secret value',
    () => {
      // req1 safety boundary: an AWS AccessDenied names principal + action + resource, never the
      // param VALUE — and the gate's input is {cause, exid, region}, so a secret cannot appear in the
      // rendered output by construction. this clamps that the forward cannot leak a 40-char secret
      const secretValue = 'ghp_SUPERSECRETtokenVALUE1234567890abcd';
      when(
        '[t0] an AccessDenied is classified while a secret is live elsewhere',
        () => {
          const result = asKeyrackAwsParamErrorGate(
            {
              cause: genAwsError({
                name: 'AccessDeniedException',
                message:
                  'User: arn:... is not authorized to perform: ssm:PutParameter on resource: parameter/keyrack/...',
              }),
              exid: '/x',
              region: 'us-east-1',
            },
            { op: 'write' },
          );
          then('the rendered message + hint carry no secret value', () => {
            expect(result.message).not.toContain(secretValue);
            expect(getHint(result)).not.toContain(secretValue);
          });
        },
      );
    },
  );

  given('[case3] kms denied (c15)', () => {
    when('[t0] read op', () => {
      const result = asKeyrackAwsParamErrorGate(
        {
          cause: genAwsError({
            name: 'AccessDeniedException',
            message: 'not authorized to perform kms:Decrypt',
          }),
          exid: '/x',
          region: 'us-east-1',
        },
        { op: 'read' },
      );
      then('it is a distinct error that names kms:Decrypt', () => {
        expect(result).toBeInstanceOf(ConstraintError);
        expect(result.message).toContain('kms:Decrypt');
      });
      then('the kms-denied read hint matches snapshot (user-faced)', () => {
        expect(getHint(result)).toMatchSnapshot();
      });
    });
    when('[t1] write op', () => {
      const result = asKeyrackAwsParamErrorGate(
        {
          cause: genAwsError({
            name: 'AccessDeniedException',
            message: 'not authorized to perform kms:Encrypt',
          }),
          exid: '/x',
          region: 'us-east-1',
        },
        { op: 'write' },
      );
      then('it names kms:Encrypt', () => {
        expect(result.message).toContain('kms:Encrypt');
      });
      then('the kms-denied write hint matches snapshot (user-faced)', () => {
        expect(getHint(result)).toMatchSnapshot();
      });
    });
  });

  given('[case4] a transient 5xx (c29)', () => {
    when('[t0] classified via the structured http status', () => {
      const result = asKeyrackAwsParamErrorGate({
        cause: genAwsError({ name: 'InternalFailure', httpStatusCode: 500 }),
        exid: '/x',
        region: 'us-east-1',
      });
      then('a MalfunctionError names the retry', () => {
        expect(result).toBeInstanceOf(MalfunctionError);
        expect(getHint(result)).toContain('retry');
      });
      then('the raw AWS line is forwarded (req1, every branch)', () => {
        expect(getHint(result)).toContain('why (raw AWS)');
      });
      then('the transient hint matches snapshot (user-faced)', () => {
        expect(getHint(result)).toMatchSnapshot();
      });
    });
  });

  given('[case5] an unknown error (c25)', () => {
    when('[t0] classified', () => {
      const result = asKeyrackAwsParamErrorGate({
        cause: genAwsError({ name: 'SomeUnmappedError', message: 'weird' }),
        exid: '/x',
        region: 'us-east-1',
      });
      then('a MalfunctionError surfaces it with context', () => {
        expect(result).toBeInstanceOf(MalfunctionError);
        expect(result.message).toContain('failed');
      });
      then('the raw AWS line is forwarded even for the unknown (req1)', () => {
        expect(getHint(result)).toContain('why (raw AWS)');
        expect(getHint(result)).toContain('SomeUnmappedError');
      });
      then('the unknown-error hint matches snapshot (user-faced)', () => {
        expect(getHint(result)).toMatchSnapshot();
      });
    });
  });
});
