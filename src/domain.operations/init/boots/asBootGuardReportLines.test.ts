import { asBootGuardReportLines } from './asBootGuardReportLines';

const TEST_CASES = [
  {
    description: 'the budget created → one budget row',
    given: { guard: { budget: 'created' } as const },
    expect: { files: ['boot.yml'] },
  },
  {
    description: 'the budget extant → no rows',
    given: { guard: { budget: 'extant' } as const },
    expect: { files: [] },
  },
  {
    description: 'the budget absent → no rows',
    given: { guard: { budget: 'absent' } as const },
    expect: { files: [] },
  },
];

describe('asBootGuardReportLines', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const rows = asBootGuardReportLines({ guard: thisCase.given.guard });
      expect(rows.map((row) => row.split(/\s+/)[1])).toEqual(
        thisCase.expect.files,
      );
    }),
  );
});
