import { genSampleBootSpecSubjected } from '@src/.test/assets/genSampleBootSpecSubjected';
import { RoleBootSpecSimplified } from '@src/domain.objects/RoleBootSpec';

import { asRoleFocusSummary } from './asRoleFocusSummary';

const SPEC_SUBJECTED = genSampleBootSpecSubjected({
  subjects: ['flow', 'lean', 'reef'],
  shedAlways: ['lean'],
});

const SPEC_SIMPLE = new RoleBootSpecSimplified({
  mode: 'simple',
  budget: null,
  briefs: null,
  skills: null,
});

const TEST_CASES = [
  {
    description: 'a whole render names no focus',
    given: { config: SPEC_SUBJECTED, subjects: [] },
    expect: { output: null },
  },
  {
    description: 'a role with no subjects names no focus',
    given: { config: SPEC_SIMPLE, subjects: ['flow'] },
    expect: { output: null },
  },
  {
    description: 'a role with no spec names no focus',
    given: { config: null, subjects: ['flow'] },
    expect: { output: null },
  },
  {
    description: 'a focus that inherits always names the rest as elsewhere',
    given: { config: SPEC_SUBJECTED, subjects: ['flow'] },
    expect: {
      output: {
        given: ['flow'],
        elsewhere: ['lean', 'reef'],
        alwaysShed: false,
      },
    },
  },
  {
    description: 'a focus whose every subject sheds always reports the shed',
    given: { config: SPEC_SUBJECTED, subjects: ['lean'] },
    expect: {
      output: {
        given: ['lean'],
        elsewhere: ['flow', 'reef'],
        alwaysShed: true,
      },
    },
  },
  {
    description:
      'a focus on every declared subject names none elsewhere, and keeps always',
    given: { config: SPEC_SUBJECTED, subjects: ['reef', 'lean', 'flow'] },
    expect: {
      output: {
        given: ['flow', 'lean', 'reef'],
        elsewhere: [],
        alwaysShed: false,
      },
    },
  },
  {
    description:
      'a focus typed out of order names its subjects in declaration order (O1)',
    given: { config: SPEC_SUBJECTED, subjects: ['reef', 'flow'] },
    expect: {
      output: {
        given: ['flow', 'reef'],
        elsewhere: ['lean'],
        alwaysShed: false,
      },
    },
  },
];

describe('asRoleFocusSummary', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asRoleFocusSummary(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
