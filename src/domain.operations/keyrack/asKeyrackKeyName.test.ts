import { asKeyrackKeyName } from './asKeyrackKeyName';

const TEST_CASES = [
  {
    description: 'extracts key name from standard slug',
    given: { slug: 'ehmpathy.prod.AWS_PROFILE' },
    expect: 'AWS_PROFILE',
  },
  {
    description: 'extracts key name from prep slug',
    given: { slug: 'ehmpathy.prep.XAI_API_KEY' },
    expect: 'XAI_API_KEY',
  },
  {
    description: 'extracts key name from test slug',
    given: { slug: 'ahbode.test.DB_PASSWORD' },
    expect: 'DB_PASSWORD',
  },
  {
    description: 'preserves dots in key names',
    given: { slug: 'ehmpathy.prod.some.dotted.key' },
    expect: 'some.dotted.key',
  },
  {
    description: 'extracts key name from all env slug',
    given: { slug: 'ehmpathy.all.SECRET_TOKEN' },
    expect: 'SECRET_TOKEN',
  },
];

describe('asKeyrackKeyName', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const result = asKeyrackKeyName(thisCase.given);
      expect(result).toEqual(thisCase.expect);
    }),
  );
});
