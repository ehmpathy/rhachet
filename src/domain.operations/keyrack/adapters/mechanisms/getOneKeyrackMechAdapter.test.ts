import { given, then, when } from 'test-fns';

import { mechAdapterAwsSso } from './aws.sso/mechAdapterAwsSso';
import {
  getOneKeyrackMechAdapter,
  KEYRACK_MECH_ADAPTERS,
} from './getOneKeyrackMechAdapter';
import { mechAdapterGithubApp } from './mechAdapterGithubApp';
import { mechAdapterReplica } from './mechAdapterReplica';

describe('getOneKeyrackMechAdapter', () => {
  given('[case1] the canonical map', () => {
    when('[t0] every supported mechanism resolves', () => {
      then('each mechanism maps to its expected adapter', () => {
        expect(getOneKeyrackMechAdapter('PERMANENT_VIA_REPLICA')).toBe(
          mechAdapterReplica,
        );
        expect(getOneKeyrackMechAdapter('PERMANENT_VIA_REFERENCE')).toBe(
          mechAdapterReplica,
        );
        expect(getOneKeyrackMechAdapter('EPHEMERAL_VIA_SESSION')).toBe(
          mechAdapterReplica,
        );
        expect(getOneKeyrackMechAdapter('EPHEMERAL_VIA_GITHUB_APP')).toBe(
          mechAdapterGithubApp,
        );
        expect(getOneKeyrackMechAdapter('EPHEMERAL_VIA_AWS_SSO')).toBe(
          mechAdapterAwsSso,
        );
        expect(getOneKeyrackMechAdapter('EPHEMERAL_VIA_GITHUB_OIDC')).toBe(
          mechAdapterAwsSso,
        );
      });
    });

    when('[t1] the map is exhaustive', () => {
      then('it carries all six mechanisms', () => {
        expect(Object.keys(KEYRACK_MECH_ADAPTERS).sort()).toEqual(
          [
            'EPHEMERAL_VIA_AWS_SSO',
            'EPHEMERAL_VIA_GITHUB_APP',
            'EPHEMERAL_VIA_GITHUB_OIDC',
            'EPHEMERAL_VIA_SESSION',
            'PERMANENT_VIA_REFERENCE',
            'PERMANENT_VIA_REPLICA',
          ].sort(),
        );
      });
    });
  });
});
