import { asBootSubjectFlagSuffix } from '@src/domain.operations/boot/asBootSubjectFlagSuffix';

const TEST_CASES = [
  {
    description: 'an absent subject list yields no suffix',
    given: { subjects: undefined },
    expect: { output: '' },
  },
  {
    description: 'one subject yields the flag with that subject',
    given: { subjects: ['wish'] },
    expect: { output: ' --subject wish' },
  },
  {
    description: 'several subjects join by comma, in the order given',
    given: { subjects: ['wish', 'vision'] },
    expect: { output: ' --subject wish,vision' },
  },
];

describe('asBootSubjectFlagSuffix', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asBootSubjectFlagSuffix(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
