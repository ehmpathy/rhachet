import { asJsonParsedOrNull } from './asJsonParsedOrNull';

const TEST_CASES = [
  {
    description: 'parses a json object',
    given: { content: '{"a":1}' },
    expect: { output: { a: 1 } },
  },
  {
    description: 'parses a json scalar',
    given: { content: '7' },
    expect: { output: 7 },
  },
  {
    description: 'reads non-json as null',
    given: { content: 'not json {' },
    expect: { output: null },
  },
  {
    description: 'reads an empty string as null',
    given: { content: '' },
    expect: { output: null },
  },
];

describe('asJsonParsedOrNull', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asJsonParsedOrNull(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
