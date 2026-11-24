import { asRenewMarkDefectError } from './asRenewMarkDefectError';

/**
 * .what = an Error subclass that leaves `.name` unset, as helpful-errors classes do
 */
class UnnamedSubclassError extends Error {}

const TEST_CASES = [
  {
    description: 'a builtin error keeps its class',
    given: { defect: new TypeError('grant.key is undefined') },
    expect: { output: '💥 defect TypeError: grant.key is undefined' },
  },
  {
    description: 'a subclass with no `.name` still reads its own class',
    given: { defect: new UnnamedSubclassError('a bad shape') },
    expect: { output: '💥 defect UnnamedSubclassError: a bad shape' },
  },
  {
    description: 'a thrown non-Error keeps its text',
    given: { defect: 'a thrown string' },
    expect: { output: '💥 defect: a thrown string' },
  },
];

describe('asRenewMarkDefectError', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asRenewMarkDefectError({ defect: thisCase.given.defect })).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
