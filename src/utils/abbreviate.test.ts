import { abbreviate } from './abbreviate';

describe('abbreviate', () => {
  const cases = [
    {
      description: 'shortens a value longer than keep to prefix + ellipsis',
      given: { value: '9c1e0a7bf3d2e1', keep: 7 },
      expect: '9c1e0a7…',
    },
    {
      description: 'abbreviates a 36-char uuid serial to an 8-hex handle',
      given: { value: 'b3cdecdf-df27-47c4-b64b-7b101894502c', keep: 8 },
      expect: 'b3cdecdf…',
    },
    {
      description: 'returns the value unchanged when its length equals keep',
      given: { value: '9c1e0a7', keep: 7 },
      expect: '9c1e0a7',
    },
    {
      description: 'returns the value unchanged when it is shorter than keep',
      given: { value: 'ab', keep: 7 },
      expect: 'ab',
    },
  ];

  cases.map((thisCase) =>
    test(thisCase.description, () => {
      // the full value is never mutated — only a prefix view is returned
      expect(abbreviate(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
