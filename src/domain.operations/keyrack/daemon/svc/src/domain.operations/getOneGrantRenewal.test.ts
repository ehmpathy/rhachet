import { getError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import { getOneKeyrackMechAdapter } from '@src/domain.operations/keyrack/adapters/mechanisms/getOneKeyrackMechAdapter';

import { getOneGrantRenewal } from './getOneGrantRenewal';

/**
 * .what = a grant held for a mech with no silent renew path
 */
const genGithubAppGrant = (): KeyrackKeyGrant =>
  new KeyrackKeyGrant({
    slug: 'ahbode.camp.GITHUB_TOKEN',
    key: {
      secret: 'source-json',
      grade: { protection: 'encrypted', duration: 'ephemeral' },
    },
    source: { vault: 'os.secure', mech: 'EPHEMERAL_VIA_GITHUB_APP' },
    env: 'camp',
    org: 'ahbode',
  });

describe('getOneGrantRenewal', () => {
  given('[case1] a grant whose mech has no renew path', () => {
    when('[t0] the daemon asks for its renewal', () => {
      then('it fails loud, named with the mech', async () => {
        const error = await getError(
          getOneGrantRenewal({ grant: genGithubAppGrant() }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain('mech has no renew path');
        expect(error.message).toContain('EPHEMERAL_VIA_GITHUB_APP');
      });
    });
  });

  given('[case2] the mech adapter registry', () => {
    when('[t0] each mech is asked whether it can renew', () => {
      then('only the aws sso adapter carries a renew path', () => {
        expect(
          getOneKeyrackMechAdapter('EPHEMERAL_VIA_AWS_SSO').renewForDaemon,
        ).toBeDefined();
        expect(
          getOneKeyrackMechAdapter('EPHEMERAL_VIA_GITHUB_APP').renewForDaemon,
        ).toBeUndefined();
        expect(
          getOneKeyrackMechAdapter('PERMANENT_VIA_REPLICA').renewForDaemon,
        ).toBeUndefined();
      });
    });
  });
});
