import { isValidKeyrackEnv, KEYRACK_VALID_ENVS } from './constants';

/**
 * .what = unit coverage for the keyrack env allowlist + its predicate
 * .why = the allowlist is the single source of truth for every `--env` gate
 *        (del, unlock, status, firewall, set); a unit test here proves the
 *        domain-level contract independently of the CLI
 */
const TEST_CASES = [
  {
    description: 'accepts sudo',
    given: { env: 'sudo' },
    expect: { valid: true },
  },
  {
    description: 'accepts prod',
    given: { env: 'prod' },
    expect: { valid: true },
  },
  {
    description: 'accepts prep',
    given: { env: 'prep' },
    expect: { valid: true },
  },
  {
    description: 'accepts test',
    given: { env: 'test' },
    expect: { valid: true },
  },
  {
    description: 'accepts all',
    given: { env: 'all' },
    expect: { valid: true },
  },
  {
    description: 'accepts camp (the env added by the wish)',
    given: { env: 'camp' },
    expect: { valid: true },
  },
  {
    description: 'rejects an unknown env',
    given: { env: 'kamp' },
    expect: { valid: false },
  },
  {
    description: 'rejects an empty string',
    given: { env: '' },
    expect: { valid: false },
  },
];

describe('isValidKeyrackEnv', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isValidKeyrackEnv(thisCase.given.env)).toEqual(
        thisCase.expect.valid,
      );
    }),
  );

  test('camp is present in the allowlist', () => {
    expect(KEYRACK_VALID_ENVS).toContain('camp');
  });
});
