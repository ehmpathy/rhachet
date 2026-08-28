import { given, then, when } from 'test-fns';

import { isKeyrackVaultReachUnaddressable } from './isKeyrackVaultReachUnaddressable';

/**
 * .what = clamps that the predicate names exactly ONE of the three reach postures
 * .why = it gates two remote branches with opposite consequences — a silent skip of an
 *        enumerated reach, and a loud refusal of a named one — so a posture folded in by
 *        mistake would either swallow a real credential or refuse a servable one
 */
describe('isKeyrackVaultReachUnaddressable', () => {
  given('[case1] a vault whose address carries no reach axis', () => {
    when('[t0] the posture is read', () => {
      then('os.envvar is unaddressable', () => {
        expect(
          isKeyrackVaultReachUnaddressable({ vault: 'os.envvar' }),
        ).toEqual(true);
      });

      then('github.secrets is unaddressable', () => {
        expect(
          isKeyrackVaultReachUnaddressable({ vault: 'github.secrets' }),
        ).toEqual(true);
      });

      // ⚠️ aws.params refuses for the VAULT's own cause, never the mech's — its v1 param path
      //    carries no reach segment, so two reaches of one slug would land on ONE param
      then('aws.params is unaddressable', () => {
        expect(
          isKeyrackVaultReachUnaddressable({ vault: 'aws.params' }),
        ).toEqual(true);
      });
    });
  });

  given('[case2] a vault that bakes the reach into its address', () => {
    when('[t0] the posture is read', () => {
      then('os.secure, os.direct, and 1password are all addressed', () => {
        for (const vault of ['os.secure', 'os.direct', '1password'] as const)
          expect(isKeyrackVaultReachUnaddressable({ vault })).toEqual(false);
      });
    });
  });

  given('[case3] a vault that defers its refusal to the mech', () => {
    // ⛔ THE CLAMP that keeps the two refusals apart. aws.config also refuses a reach — but via
    //    `assertKeyrackReachAbsent`, with a different sentence for the human. to fold VIA_MECH
    //    in here would hand a correct refusal with a FALSE cause
    //    (`rule.require.errors-name-the-fix`)
    when('[t0] the posture is read', () => {
      then('aws.config is NOT unaddressable', () => {
        expect(
          isKeyrackVaultReachUnaddressable({ vault: 'aws.config' }),
        ).toEqual(false);
      });
    });
  });
});
