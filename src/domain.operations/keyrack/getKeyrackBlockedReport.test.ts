import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { getKeyrackBlockedReport } from './getKeyrackBlockedReport';

describe('getKeyrackBlockedReport', () => {
  given('[case1] a hint with a header-then-grant-list shape', () => {
    // the grant list hands a header part ("... needs these grants ...:") plus its grant items,
    // joined with '; ' — the exact shape asKeyrackAwsParamGrantList emits for a write denial
    const error = new ConstraintError(
      'aws.params identity cannot ssm:DescribeParameters',
      {
        exid: '/keyrack/x',
        region: 'us-east-1',
        hint: [
          'add the absent grant to this identity, then re-run',
          'why (raw AWS): AccessDeniedException — not authorized to perform: ssm:DescribeParameters',
          'aws.params set needs these grants on this identity:',
          'ssm:DescribeParameters on * (MUST be "*", no resource scope)',
          'ssm:PutParameter on parameter/keyrack/infra/vault/aws.params/*',
        ].join('; '),
      },
    );

    when('[t0] rendered as a blocked report', () => {
      const report = getKeyrackBlockedReport({ error, command: 'keyrack set' });

      then('the header renders as the last top-level hint child', () => {
        expect(report).toContain(
          '         └─ aws.params set needs these grants on this identity:',
        );
      });

      then('the grant items nest one level under the header', () => {
        // a 12-space indent proves the grant items are CHILDREN of the header, not flat
        // siblings — the exact blemish r10 flagged. a flat 9-space render fails this assertion
        expect(report).toContain(
          '            ├─ ssm:DescribeParameters on * (MUST be "*", no resource scope)',
        );
        expect(report).toContain(
          '            └─ ssm:PutParameter on parameter/keyrack/infra/vault/aws.params/*',
        );
      });

      then('the head leaves stay flat at the top hint level', () => {
        expect(report).toContain(
          '         ├─ add the absent grant to this identity, then re-run',
        );
        expect(report).toContain(
          '         ├─ why (raw AWS): AccessDeniedException — not authorized to perform: ssm:DescribeParameters',
        );
      });
    });
  });

  given('[case2] a hint with no header (all flat leaves)', () => {
    // a hint whose parts never end with ':' must render flat, unchanged by the header-nest logic
    const error = new ConstraintError('aws.params found no AWS identity', {
      exid: '/keyrack/x',
      region: 'us-east-1',
      hint: [
        'for --org @all run on a box whose instance role can read this param',
        'why (raw AWS): CredentialsProviderError — could not load credentials',
      ].join('; '),
    });

    when('[t0] rendered', () => {
      const report = getKeyrackBlockedReport({ error, command: 'keyrack set' });

      then('every part renders as a flat top-level hint child', () => {
        expect(report).toContain(
          '         ├─ for --org @all run on a box whose instance role can read this param',
        );
        expect(report).toContain(
          '         └─ why (raw AWS): CredentialsProviderError — could not load credentials',
        );
      });

      then('no deeper nest appears absent a header', () => {
        // no 12-space child indent exists when no hint part ends with ':'
        expect(report).not.toContain('            ├─');
        expect(report).not.toContain('            └─');
      });
    });
  });

  given('[case3] a single-part hint', () => {
    const error = new ConstraintError(
      'aws.params needs the declastruct-aws peer',
      {
        exid: '/keyrack/x',
        region: 'us-east-1',
        hint: 'run `pnpm add declastruct-aws`',
      },
    );

    when('[t0] rendered', () => {
      const report = getKeyrackBlockedReport({ error, command: 'keyrack set' });

      then('the sole hint renders inline as the branch closer', () => {
        expect(report).toContain(
          '      └─ hint: run `pnpm add declastruct-aws`',
        );
      });
    });
  });
});
