import { asRoleSlugsAmbientAtFocus } from './asRoleSlugsAmbientAtFocus';

const TEST_CASES: Array<{
  description: string;
  given: { rolesLinked: string[]; foci: Record<string, string[]> };
  expect: { output: string[] };
}> = [
  {
    description: 'with no record, each linked role is ambient whole',
    given: { rolesLinked: ['any', 'mechanic'], foci: {} },
    expect: { output: ['any', 'mechanic'] },
  },
  {
    description: 'a recorded focus rides on its role',
    given: { rolesLinked: ['any', 'mechanic'], foci: { mechanic: ['101'] } },
    expect: { output: ['any', 'mechanic::101'] },
  },
  {
    description: 'a role focused on two subjects yields two tokens (S2)',
    given: {
      rolesLinked: ['mechanic'],
      foci: { mechanic: ['code.prod', 'flow'] },
    },
    expect: { output: ['mechanic::code.prod', 'mechanic::flow'] },
  },
  {
    description: 'a recorded focus of an unlinked role is dropped',
    given: { rolesLinked: ['any'], foci: { mechanic: ['101'] } },
    expect: { output: ['any'] },
  },
  {
    description: 'an empty subject list reads as the whole role',
    given: { rolesLinked: ['mechanic'], foci: { mechanic: [] } },
    expect: { output: ['mechanic'] },
  },
];

describe('asRoleSlugsAmbientAtFocus', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asRoleSlugsAmbientAtFocus(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
