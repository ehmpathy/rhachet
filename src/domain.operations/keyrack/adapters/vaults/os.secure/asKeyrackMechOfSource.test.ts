import { given, then, when } from 'test-fns';

import { asKeyrackMechOfSource } from './asKeyrackMechOfSource';

const TEST_CASES = [
  {
    description: 'a blob that declares the github-app mech reads as github-app',
    given: {
      source: JSON.stringify({
        appId: '1',
        installationId: '2',
        privateKey: 'fake-pem-body',
        mech: 'EPHEMERAL_VIA_GITHUB_APP',
      }),
    },
    expect: { mech: 'EPHEMERAL_VIA_GITHUB_APP' },
  },
  {
    description: 'a github-app blob that declares no mech reads as github-app',
    given: {
      source: JSON.stringify({
        appId: '1',
        installationId: '2',
        privateKey: 'fake-pem-body',
      }),
    },
    expect: { mech: 'EPHEMERAL_VIA_GITHUB_APP' },
  },
  {
    description: 'a plain value reads as replica',
    given: { source: 'ghp_plainvalue' },
    expect: { mech: 'PERMANENT_VIA_REPLICA' },
  },
  {
    description: 'json of another shape reads as replica',
    given: { source: JSON.stringify({ token: 'x' }) },
    expect: { mech: 'PERMANENT_VIA_REPLICA' },
  },
];

describe('asKeyrackMechOfSource', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the mech is read off the source', () => {
        then(`it reads ${thisCase.expect.mech}`, () => {
          expect(asKeyrackMechOfSource(thisCase.given)).toEqual(
            thisCase.expect.mech,
          );
        });
      });
    }),
  );
});
