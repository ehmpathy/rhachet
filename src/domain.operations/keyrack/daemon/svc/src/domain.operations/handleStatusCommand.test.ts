import { asIsoTimeStamp, type IsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';
import { createDaemonKeyStore } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore';
import { createDaemonRenewRecord } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonRenewRecord';

import { handleStatusCommand } from './handleStatusCommand';
import { handleUnlockCommand } from './handleUnlockCommand';

/**
 * .what = the status row says when a renewed grant is already at its cap
 * .why = a grant at its cap is never due, so a status that read only the entry's
 *        presence would claim `renew = on` for a key that will end at its cap
 */
describe('handleStatusCommand', () => {
  const expiresAt = asIsoTimeStamp(new Date(Date.now() + 5 * 60_000));

  const genStatusRow = (input: { capAt: IsoTimeStamp }) => {
    const keyStore = createDaemonKeyStore();
    const renewRecord = createDaemonRenewRecord();
    const grant = genSampleKeyrackSsoGrant({ expiresAt });
    handleUnlockCommand(
      {
        keys: [grant],
        renewals: [{ slug: grant.slug, capAt: input.capAt }],
      },
      { keyStore, renewRecord },
    );
    const status = handleStatusCommand(
      {},
      { keyStore, renewRecord, homeHash: 'test' },
    );
    return status.keys.find((row) => row.slug === grant.slug);
  };

  given('[case1] an sso key the daemon renews', () => {
    when('[t0] its cap lies past the grant expiry', () => {
      then('the row carries no isAtCap', () => {
        const row = genStatusRow({
          capAt: asIsoTimeStamp(new Date(Date.now() + 9 * 60 * 60_000)),
        });
        expect(row?.renew).toEqual({ renewedCount: 0, mark: null });
      });
    });

    when('[t1] the grant already expires at its cap', () => {
      then('the row says isAtCap', () => {
        const row = genStatusRow({ capAt: expiresAt });
        expect(row?.renew).toEqual({
          renewedCount: 0,
          mark: null,
          isAtCap: true,
        });
      });
    });
  });
});
