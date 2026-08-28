import { given, then, when } from 'test-fns';

import { getOneKeyrackUnlockTargetDisposition } from './getOneKeyrackUnlockTargetDisposition';

describe('getOneKeyrackUnlockTargetDisposition', () => {
  given(
    '[case1] an ENUMERATED reach target on a vault that cannot address reaches',
    () => {
      when('[t0] the disposition is read', () => {
        const disposition = getOneKeyrackUnlockTargetDisposition({
          reachTarget: { exid: 'casey@ahction.com' },
          reachAsked: undefined,
          vault: 'os.envvar',
        });

        then('it is skipped', () => {
          expect(disposition.skipped).toEqual(true);
        });

        // ⚠️ THE invariant this leaf exists for. a skipped target files no row, so it has no
        //    claim to vouch that its slug was reported on — were it to vouch, the reachless
        //    `absent` row would be pruned on its behalf and the key would land in neither
        //    `unlocked` nor `omitted` (rule.forbid.failhide)
        then('it may NOT vouch that the slug was reported on', () => {
          expect(disposition.marksSlugHeldAtReach).toEqual(false);
        });
      });
    },
  );

  given('[case2] a CALLER-NAMED reach on the same unaddressable vault', () => {
    when('[t0] the disposition is read', () => {
      const disposition = getOneKeyrackUnlockTargetDisposition({
        reachTarget: { exid: 'casey@ahction.com' },
        reachAsked: { exid: 'casey@ahction.com' },
        vault: 'os.envvar',
      });

      // a reach the human NAMED still owes the loud refusal downstream — to skip it here
      // would swallow a caller error the `✋ blocked` tree exists to report
      then('it is NOT skipped', () => {
        expect(disposition.skipped).toEqual(false);
      });

      then('it vouches that the slug was reported on', () => {
        expect(disposition.marksSlugHeldAtReach).toEqual(true);
      });
    });
  });

  given('[case3] a reach target on an ADDRESSED vault', () => {
    when('[t0] the disposition is read', () => {
      const disposition = getOneKeyrackUnlockTargetDisposition({
        reachTarget: { exid: 'casey@ahction.com' },
        reachAsked: undefined,
        vault: 'os.secure',
      });

      then('it is NOT skipped', () => {
        expect(disposition.skipped).toEqual(false);
      });

      then('it vouches that the slug was reported on', () => {
        expect(disposition.marksSlugHeldAtReach).toEqual(true);
      });
    });
  });

  given('[case4] a reach target on a VIA_MECH vault', () => {
    when('[t0] the disposition is read', () => {
      const disposition = getOneKeyrackUnlockTargetDisposition({
        reachTarget: { exid: 'casey@ahction.com' },
        reachAsked: undefined,
        vault: 'aws.config',
      });

      // VIA_MECH is held at a composite address like any other, so its reach-cut key is
      // genuinely stored per reach — the refusal, if any, belongs to the mech
      then('it is NOT skipped', () => {
        expect(disposition.skipped).toEqual(false);
      });
    });
  });

  given('[case5] a REACHLESS target', () => {
    when('[t0] the disposition is read on an unaddressable vault', () => {
      const disposition = getOneKeyrackUnlockTargetDisposition({
        reachTarget: undefined,
        reachAsked: undefined,
        vault: 'os.envvar',
      });

      then('it is NOT skipped', () => {
        expect(disposition.skipped).toEqual(false);
      });

      // a reachless target says no word about reaches, so it must never vouch — else it
      // would prune its own `absent` row
      then('it does NOT vouch that the slug was reported on', () => {
        expect(disposition.marksSlugHeldAtReach).toEqual(false);
      });
    });
  });
});
