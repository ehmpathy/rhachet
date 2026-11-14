import { given, then, when } from 'test-fns';

import { genSampleRoleModPlan } from '@src/.test/assets/genSampleRoleModPlan';

import { asRoleModCostTag } from './asRoleModCostTag';

describe('asRoleModCostTag', () => {
  given('[case1] a modded role', () => {
    when('[t0] the tag is rendered', () => {
      then('it marks the row changed, with each count', () => {
        const plan = genSampleRoleModPlan();
        expect(asRoleModCostTag({ plan })).toEqual(
          '[~] modded · 1 shadow · 1 add · 1 not',
        );
      });
    });
  });
});
