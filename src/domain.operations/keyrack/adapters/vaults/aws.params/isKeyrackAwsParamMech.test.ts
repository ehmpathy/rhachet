import { given, then, when } from 'test-fns';

import {
  isKeyrackAwsParamMech,
  KEYRACK_AWS_PARAM_MECHS,
} from './isKeyrackAwsParamMech';

describe('isKeyrackAwsParamMech', () => {
  given('[case1] the source array', () => {
    when('[t0] read', () => {
      then('it holds the two supported mechs', () => {
        expect(KEYRACK_AWS_PARAM_MECHS).toEqual([
          'PERMANENT_VIA_REPLICA',
          'EPHEMERAL_VIA_GITHUB_APP',
        ]);
      });
    });
  });

  given('[case2] a supported mech', () => {
    when('[t0] assessed', () => {
      then('PERMANENT_VIA_REPLICA passes', () => {
        expect(isKeyrackAwsParamMech.assess('PERMANENT_VIA_REPLICA')).toEqual(
          true,
        );
      });
      then('EPHEMERAL_VIA_GITHUB_APP passes', () => {
        expect(
          isKeyrackAwsParamMech.assess('EPHEMERAL_VIA_GITHUB_APP'),
        ).toEqual(true);
      });
    });
  });

  given('[case3] an unsupported mech', () => {
    when('[t0] assessed', () => {
      then('PERMANENT_VIA_REFERENCE fails (not an aws.params mech)', () => {
        expect(isKeyrackAwsParamMech.assess('PERMANENT_VIA_REFERENCE')).toEqual(
          false,
        );
      });
      then('EPHEMERAL_VIA_AWS_SSO fails', () => {
        expect(isKeyrackAwsParamMech.assess('EPHEMERAL_VIA_AWS_SSO')).toEqual(
          false,
        );
      });
    });
  });
});
