import { given, then, when } from 'test-fns';

import { isBrainLiveScopeAll } from './describeBrainLiveOnDemand';

describe('isBrainLiveScopeAll', () => {
  given('[case1] an env with no BRAIN_LIVE_SCOPE', () => {
    when('[t0] the gate is read', () => {
      then('it is not targeted, so tier-3 suites skip', () => {
        expect(isBrainLiveScopeAll({ env: {} })).toEqual(false);
      });
    });
  });

  given('[case2] an env with BRAIN_LIVE_SCOPE=core', () => {
    when('[t0] the gate is read', () => {
      then('it is not targeted', () => {
        expect(isBrainLiveScopeAll({ env: { BRAIN_LIVE_SCOPE: 'core' } })).toEqual(
          false,
        );
      });
    });
  });

  given('[case3] an env with BRAIN_LIVE_SCOPE=all', () => {
    when('[t0] the gate is read', () => {
      then('it is targeted, so tier-3 suites run', () => {
        expect(isBrainLiveScopeAll({ env: { BRAIN_LIVE_SCOPE: 'all' } })).toEqual(
          true,
        );
      });
    });
  });
});
