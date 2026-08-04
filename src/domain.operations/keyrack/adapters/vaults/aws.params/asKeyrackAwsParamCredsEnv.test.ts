import { asKeyrackAwsParamCredsEnv } from './asKeyrackAwsParamCredsEnv';

describe('asKeyrackAwsParamCredsEnv', () => {
  describe('[case1] imds identity (--org @all)', () => {
    it('[c66] clears AWS_PROFILE so the default chain derives the grove IMDS role', () => {
      expect(
        asKeyrackAwsParamCredsEnv({ identity: { source: 'imds' } }),
      ).toEqual({ AWS_PROFILE: undefined });
    });
  });

  describe('[case2] profile identity (a specific org)', () => {
    it('[c66] sets AWS_PROFILE to the org keyrack-declared profile', () => {
      expect(
        asKeyrackAwsParamCredsEnv({
          identity: { source: 'profile', profile: 'ehmpathy-prod' },
        }),
      ).toEqual({ AWS_PROFILE: 'ehmpathy-prod' });
    });
  });
});
