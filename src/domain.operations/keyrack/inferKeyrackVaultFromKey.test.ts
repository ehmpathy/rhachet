import { given, then, when } from 'test-fns';

import { inferKeyrackVaultFromKey } from './inferKeyrackVaultFromKey';

describe('inferKeyrackVaultFromKey', () => {
  given('[case1] key name is AWS_PROFILE', () => {
    when('[t0] inferred', () => {
      then('returns aws.config', () => {
        expect(inferKeyrackVaultFromKey({ keyName: 'AWS_PROFILE' })).toEqual(
          'aws.config',
        );
      });
    });
  });

  given('[case2] key name is a generic secret', () => {
    when('[t0] inferred', () => {
      then('returns null', () => {
        expect(inferKeyrackVaultFromKey({ keyName: 'MY_API_KEY' })).toBeNull();
      });
    });
  });
});
