import { asTypedAheadRest } from './asTypedAheadRest';

const TEST_CASES = [
  {
    description: 'a lone line leaves no rest',
    given: { chunk: '1\n', index: 1 },
    expect: { rest: '' },
  },
  {
    description: 'a pasted second answer after LF is the rest',
    given: { chunk: '1\nxai-fixture-secret\n', index: 1 },
    expect: { rest: 'xai-fixture-secret\n' },
  },
  {
    description: 'a pasted second answer after CR is the rest',
    given: { chunk: '1\rxai-fixture-secret\r', index: 1 },
    expect: { rest: 'xai-fixture-secret\r' },
  },
  {
    description:
      'a CRLF Enter consumes its LF, so the rest starts at the next answer',
    given: { chunk: '1\r\nxai-fixture-secret\r\n', index: 1 },
    expect: { rest: 'xai-fixture-secret\r\n' },
  },
  {
    description: 'a CR at the chunk end leaves no rest',
    given: { chunk: 'abc\r', index: 3 },
    expect: { rest: '' },
  },
  {
    description: 'a multi-unit char in the rest survives whole',
    given: { chunk: '2\n🌊ok\n', index: 1 },
    expect: { rest: '🌊ok\n' },
  },
];

describe('asTypedAheadRest', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const rest = asTypedAheadRest({
        chars: Array.from(thisCase.given.chunk),
        index: thisCase.given.index,
      });
      expect(rest).toEqual(thisCase.expect.rest);
    }),
  );
});
