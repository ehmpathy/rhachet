import { given, then, when } from 'test-fns';

import { asBrainAuthSlotUnlockHint } from './asBrainAuthSlotUnlockHint';

describe('asBrainAuthSlotUnlockHint', () => {
  given('[case1] an owner', () => {
    when('[t0] the hint is rendered', () => {
      then('the hint names that owner and the slot env', () => {
        expect(asBrainAuthSlotUnlockHint({ owner: 'ehmpath' })).toEqual(
          'rhx keyrack unlock --owner ehmpath --env prep',
        );
      });
    });
  });

  given('[case2] no owner', () => {
    when('[t0] the hint is rendered', () => {
      then('the hint names the default owner', () => {
        expect(asBrainAuthSlotUnlockHint({ owner: null })).toEqual(
          'rhx keyrack unlock --owner default --env prep',
        );
      });
    });
  });
});
