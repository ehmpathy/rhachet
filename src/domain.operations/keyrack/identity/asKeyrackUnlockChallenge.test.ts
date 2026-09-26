import { asKeyrackUnlockChallenge } from './asKeyrackUnlockChallenge';

/**
 * .what = prove the challenge is stable per owner-manifest and distinct across owners
 * .why  = domain separation is the safety property (vision q8): one owner's
 *         signature must not derive another owner's wrap key
 */
describe('asKeyrackUnlockChallenge', () => {
  const TEST_CASES = [
    {
      description: 'has the versioned keyrack-unlock prefix + owner',
      given: { owner: 'ehmpath' },
      expect: 'keyrack-unlock-v1:ehmpath',
    },
    {
      description: 'is stable for the same owner',
      given: { owner: 'foreman' },
      expect: 'keyrack-unlock-v1:foreman',
    },
  ];

  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asKeyrackUnlockChallenge(thisCase.given)).toEqual(thisCase.expect);
    }),
  );

  test('differs across owners (domain separation)', () => {
    const one = asKeyrackUnlockChallenge({ owner: 'ehmpath' });
    const two = asKeyrackUnlockChallenge({ owner: 'foreman' });
    expect(one).not.toEqual(two);
  });
});
