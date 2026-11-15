import { asArgsFlagValuesMasked } from './asArgsFlagValuesMasked';

const FLAGS = ['--source'];
const KEPT = ['@stdin'];

const TEST_CASES: {
  description: string;
  given: { args: string[] };
  expect: { args: string[] };
}[] = [
  {
    description: 'masks a literal value after a bare flag',
    given: { args: ['keyrack', 'set', '--source', 'ghs_fixture', '--json'] },
    expect: { args: ['keyrack', 'set', '--source', '__REDACTED__', '--json'] },
  },
  {
    description: 'masks the --flag=<value> shape',
    given: { args: ['keyrack', 'set', '--source=ghs_fixture'] },
    expect: { args: ['keyrack', 'set', '--source=__REDACTED__'] },
  },
  {
    description: 'keeps a kept value, in both shapes',
    given: { args: ['--source', '@stdin', '--source=@stdin'] },
    expect: { args: ['--source', '@stdin', '--source=@stdin'] },
  },
  {
    description:
      'reads the = shape first, so a --flag=<value> token after a bare flag keeps its prefix',
    given: { args: ['--source', '--source=ghs_fixture'] },
    expect: { args: ['--source', '--source=__REDACTED__'] },
  },
  {
    description:
      'leaves a word that equals the flag name sans dashes untouched',
    given: { args: ['keyrack', 'source', '--key', 'X', '--env', 'test'] },
    expect: { args: ['keyrack', 'source', '--key', 'X', '--env', 'test'] },
  },
  {
    description: 'leaves a flag that only shares a prefix untouched',
    given: { args: ['keyrack', 'get', '--key', 'X', '--source-not', 'y'] },
    expect: { args: ['keyrack', 'get', '--key', 'X', '--source-not', 'y'] },
  },
];

describe('asArgsFlagValuesMasked', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(
        asArgsFlagValuesMasked({
          args: thisCase.given.args,
          flags: FLAGS,
          valuesKept: KEPT,
        }),
      ).toEqual(thisCase.expect.args);
    }),
  );
});
