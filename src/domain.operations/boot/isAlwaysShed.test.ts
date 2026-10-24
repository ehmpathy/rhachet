import { genSampleBootSpecSubjected } from '@src/.test/assets/genSampleBootSpecSubjected';
import { RoleBootSpecSimplified } from '@src/domain.objects/RoleBootSpec';

import { isAlwaysShed } from './isAlwaysShed';

const SPEC_SUBJECTED = genSampleBootSpecSubjected({
  subjects: ['101', 'lean', 'flow'],
  shedAlways: ['101', 'lean'],
});

const TEST_CASES = [
  {
    description: 'a boot of every subject keeps always',
    given: { config: SPEC_SUBJECTED, subjects: null },
    expect: { output: false },
  },
  {
    description: 'an empty subject list keeps always',
    given: { config: SPEC_SUBJECTED, subjects: [] },
    expect: { output: false },
  },
  {
    description: 'one subject that opts out sheds always',
    given: { config: SPEC_SUBJECTED, subjects: ['101'] },
    expect: { output: true },
  },
  {
    description: 'several subjects that all opt out shed always',
    given: { config: SPEC_SUBJECTED, subjects: ['101', 'lean'] },
    expect: { output: true },
  },
  {
    description: 'one subject that inherits keeps always for the whole boot',
    given: { config: SPEC_SUBJECTED, subjects: ['101', 'flow'] },
    expect: { output: false },
  },
  {
    description: 'a subject that does not opt out keeps always',
    given: { config: SPEC_SUBJECTED, subjects: ['flow'] },
    expect: { output: false },
  },
  {
    description: 'a simple-mode spec has no always to shed',
    given: {
      config: new RoleBootSpecSimplified({
        mode: 'simple',
        budget: null,
        briefs: null,
        skills: null,
      }),
      subjects: ['101'],
    },
    expect: { output: false },
  },
];

describe('isAlwaysShed', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isAlwaysShed(thisCase.given)).toEqual(thisCase.expect.output);
    }),
  );
});
