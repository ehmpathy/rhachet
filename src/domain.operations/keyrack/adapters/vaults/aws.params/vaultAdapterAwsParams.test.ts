import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { vaultAdapterAwsParams } from './vaultAdapterAwsParams';

/**
 * .what = unit clamp for vaultAdapterAwsParams.del — the mech gate
 *
 * .why = keyrack destroys only what it wrote. both aws.params mechs (replica copy, github-app
 *   blob) own a value keyrack wrote into SSM, so a del destroys it. this pins the corrupt/
 *   unsupported-mech guards: a del must fail loud before the destroy, never a silent no-op that
 *   would hide a live owned secret.
 *   (the owned-mech destroy hits real SSM and is proven in delKeyrackAwsParam.integration.test.)
 *
 * .scope = internal vault adapter (NOT a user-faced contract)
 */
describe('vaultAdapterAwsParams.del mech gate', () => {
  given('[case2] a corrupt manifest entry with NO mech', () => {
    when('[t0] del is called with an absent mech', () => {
      then(
        'it fails loud (never a silent no-op that hides a live owned secret)',
        async () => {
          // regression clamp: del must NOT treat an absent mech as a reference no-op. if the entry
          // was actually owned (github-app), a silent "removed" would leave a live SSM secret while
          // the operator believes no remote secret was touched — a false-safety hazard. it must fail
          // loud before the mech comparison, mirroring get()'s guard
          const error = await getError(
            vaultAdapterAwsParams.del({
              slug: 'ehmpathy.test.CORRUPT_KEY',
              exid: '/keyrack/infra/vault/aws.params/v1/_test/ehmpathy/test/CORRUPT_KEY',
              owner: '_test',
              mech: null,
              meta: { region: 'us-east-1' },
            }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain('no mech');
        },
      );
    });
  });

  given('[case3] a stored mech aws.params does not support', () => {
    when('[t0] del is called with an unsupported mech', () => {
      then(
        'it fails loud (a corrupt/hand-edited entry never routes silently)',
        async () => {
          const error = await getError(
            vaultAdapterAwsParams.del({
              slug: 'ehmpathy.test.WRONG_MECH_KEY',
              exid: '/keyrack/infra/vault/aws.params/v1/_test/ehmpathy/test/WRONG_MECH_KEY',
              owner: '_test',
              mech: 'EPHEMERAL_VIA_AWS_SSO',
              meta: { region: 'us-east-1' },
            }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain('unsupported mech');
        },
      );
    });

    when(
      '[t1] del is called with a reference mech (no longer supported)',
      () => {
        then(
          'it fails loud — aws.params dropped PERMANENT_VIA_REFERENCE',
          async () => {
            const error = await getError(
              vaultAdapterAwsParams.del({
                slug: 'ehmpathy.test.REF_KEY',
                exid: '/keyrack/infra/vault/aws.params/v1/_test/ehmpathy/test/REF_KEY',
                owner: '_test',
                mech: 'PERMANENT_VIA_REFERENCE',
                meta: { region: 'us-east-1' },
              }),
            );
            expect(error).toBeInstanceOf(MalfunctionError);
            expect(error.message).toContain('unsupported mech');
          },
        );
      },
    );
  });
});
