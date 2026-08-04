import { given, then, when } from 'test-fns';

import { asContextAwsApi } from './asContextAwsApi';

describe('asContextAwsApi', () => {
  given('[case1] a region', () => {
    when('[t0] the context is built', () => {
      const context = asContextAwsApi({ region: 'us-east-1' });

      then('the region lands on the credentials', () => {
        expect(context.aws.credentials.region).toEqual('us-east-1');
      });
      then('the account filler is present', () => {
        expect(context.aws.credentials.account).toEqual(
          'unused-by-aws-params-read',
        );
      });
      then('the tunnel cache dir filler is present', () => {
        expect(
          context.aws.cache.DeclaredAwsSsmVpcTunnel.processes.dir,
        ).toContain('keyrack-aws-params-unused');
      });
    });
  });
});
