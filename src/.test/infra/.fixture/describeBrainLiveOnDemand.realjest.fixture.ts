import { describeBrainLiveOnDemand } from '@src/.test/infra/describeBrainLiveOnDemand';

/**
 * .what = a suite behind the real tier-3 gate, run by real jest from
 *   describeBrainLiveOnDemand.realjest.integration.test.ts
 * .why = the gate's skip, its todo row, and its typo refusal are proven under jest's own
 *   globals, not only fakes. the body calls no brain: it only reports that it ran
 */
describeBrainLiveOnDemand('realjest fixture suite', () => {
  test('the gated body ran', () => {
    console.log('REALJEST_FIXTURE_BODY_RAN');
    expect(true).toEqual(true);
  });
});
