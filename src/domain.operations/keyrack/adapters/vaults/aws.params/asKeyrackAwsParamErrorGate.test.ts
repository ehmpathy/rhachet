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
  if (input.httpStatusCode !== undefined)
    (error as unknown as { $metadata: { httpStatusCode: number } }).$metadata =
      {
        httpStatusCode: input.httpStatusCode,
      };
  return error;
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
      then('it names ssm:GetParameter', () => {
        expect(result).toBeInstanceOf(ConstraintError);
        expect((result.metadata as { hint: string }).hint).toContain(
          'ssm:GetParameter',
        );
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
      then('it names ssm:PutParameter', () => {
        expect((result.metadata as { hint: string }).hint).toContain(
          'ssm:PutParameter',
        );
      });
    });
  });

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
        expect((result.metadata as { hint: string }).hint).toContain('retry');
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
    });
  });
});
