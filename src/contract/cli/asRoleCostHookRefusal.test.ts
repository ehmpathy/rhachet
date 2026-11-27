import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { genSampleRoleContentDefectsOwned } from '@src/.test/assets/genSampleRoleContentDefectsOwned';

import { asRoleCostHookRefusal } from './asRoleCostHookRefusal';

const OVER = [{ pathToSpec: '/repo/.agent/repo=.this/role=any/boot.yml' }];
const DRIFTS = [{ pathToSpec: '.agent/repo=.mods/role=mechanic/boot.yml' }];
const DEFECTS = genSampleRoleContentDefectsOwned().slice(0, 1);

const TEST_CASES = [
  {
    description:
      'a boot past its cap is the gravest, and names the other drifts',
    given: { over: OVER, defects: DEFECTS, drifts: DRIFTS },
    expect: {
      message: 'boot specs exceed their declared budget',
      keys: ['hint', 'specsOver', 'modsDrifted', 'defects'],
    },
  },
  {
    description:
      'an owned content defect has its own refusal, with the drifts beside it',
    given: { over: [], defects: DEFECTS, drifts: DRIFTS },
    expect: {
      message: 'owned roles hold role content defects that a boot set aside',
      keys: ['hint', 'defects', 'modsDrifted'],
    },
  },
  {
    description: 'a mod drift alone has its own refusal',
    given: { over: [], defects: [], drifts: DRIFTS },
    expect: {
      message: 'modded roles moved off the version their mods pin',
      keys: ['hint', 'modsDrifted'],
    },
  },
];

describe('asRoleCostHookRefusal', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the refusal is built', () => {
        then('it is a constraint error with the expected shape', () => {
          const error = asRoleCostHookRefusal({
            ...thisCase.given,
            cwd: '/repo',
          });
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain(thisCase.expect.message);
          expect(Object.keys(error.metadata ?? {})).toEqual(
            thisCase.expect.keys,
          );
        });
      });
    }),
  );
});
