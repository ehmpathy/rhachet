import { asTextWithFinalNewlineDropped } from './asTextWithFinalNewlineDropped';

const TEST_CASES: {
  description: string;
  given: { text: string };
  expect: { output: string };
}[] = [
  {
    description: 'drops one final newline',
    given: { text: 'value\n' },
    expect: { output: 'value' },
  },
  {
    description: 'drops only one of two final newlines',
    given: { text: 'value\n\n' },
    expect: { output: 'value\n' },
  },
  {
    description: 'keeps edge spaces and inner newlines',
    given: { text: '  line-one\nline-two  \n' },
    expect: { output: '  line-one\nline-two  ' },
  },
  {
    description: 'leaves text with no final newline as-is',
    given: { text: 'value' },
    expect: { output: 'value' },
  },
  {
    description: 'turns a lone newline into empty text',
    given: { text: '\n' },
    expect: { output: '' },
  },
];

describe('asTextWithFinalNewlineDropped', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asTextWithFinalNewlineDropped(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
