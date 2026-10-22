import { isRoleFociRecordWriteNeeded } from './isRoleFociRecordWriteNeeded';

const TEST_CASES: {
  description: string;
  given: Parameters<typeof isRoleFociRecordWriteNeeded>[0];
  expect: boolean;
}[] = [
  {
    description: 'an unchanged record needs no write',
    given: {
      fociPrior: { mechanic: ['flow'] },
      foci: { mechanic: ['flow'] },
      isFileExtant: true,
    },
    expect: false,
  },
  {
    description: 'the same foci in another key order is no change',
    given: {
      fociPrior: { mechanic: ['flow'], driver: ['lean'] },
      foci: { driver: ['lean'], mechanic: ['flow'] },
      isFileExtant: true,
    },
    expect: false,
  },
  {
    description: 'a new focus with no file yet is written',
    given: { fociPrior: {}, foci: { mechanic: ['flow'] }, isFileExtant: false },
    expect: true,
  },
  {
    description: 'a record emptied where the file exists is written',
    given: { fociPrior: { mechanic: ['flow'] }, foci: {}, isFileExtant: true },
    expect: true,
  },
  {
    description: 'an empty record is never written to an absent file',
    given: { fociPrior: { mechanic: ['flow'] }, foci: {}, isFileExtant: false },
    expect: false,
  },
];

describe('isRoleFociRecordWriteNeeded', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isRoleFociRecordWriteNeeded(thisCase.given)).toEqual(
        thisCase.expect,
      );
    }),
  );
});
