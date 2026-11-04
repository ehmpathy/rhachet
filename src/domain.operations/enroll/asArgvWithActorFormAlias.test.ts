import { asArgvWithActorFormAlias } from './asArgvWithActorFormAlias';

const TEST_CASES = [
  {
    description: 'maps clone @<slug> onto enroll @<slug>',
    given: { args: ['clone', '@builder', '+librarian'] },
    expect: { args: ['enroll', '@builder', '+librarian'] },
  },
  {
    description: 'maps past a lead global -c <path>',
    given: { args: ['-c', 'rhachet.use.ts', 'clone', '@builder'] },
    expect: { args: ['-c', 'rhachet.use.ts', 'enroll', '@builder'] },
  },
  {
    description: 'keeps a clone subcommand on clone',
    given: { args: ['clone', 'say', '@:peer1', '--what', 'hi'] },
    expect: { args: ['clone', 'say', '@:peer1', '--what', 'hi'] },
  },
  {
    description: 'keeps the clone sigil @: on clone',
    given: { args: ['clone', '@:peer1'] },
    expect: { args: ['clone', '@:peer1'] },
  },
  {
    description: 'keeps a bare clone on clone',
    given: { args: ['clone'] },
    expect: { args: ['clone'] },
  },
  {
    description: 'keeps other commands untouched',
    given: { args: ['enroll', 'claude', '--roles', 'mechanic'] },
    expect: { args: ['enroll', 'claude', '--roles', 'mechanic'] },
  },
];

describe('asArgvWithActorFormAlias', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asArgvWithActorFormAlias({ args: thisCase.given.args })).toEqual(
        thisCase.expect.args,
      );
    }),
  );
});
