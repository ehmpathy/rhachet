import { asIsoTimeStamp, type IsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';
import { createDaemonKeyStore } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore';
import { createDaemonRenewalRecord } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonRenewalRecord';

import { handleStatusCommand } from './handleStatusCommand';
import { handleUnlockCommand } from './handleUnlockCommand';

/**
 * .what = the status key says `off` when a renewed grant already expires at its max
 * .why = a grant at its max is never due, so a status that read only the entry's
 *        presence would claim `renewal = on` for a key that will end at its max
 */
describe('handleStatusCommand', () => {
  const expiresAt = asIsoTimeStamp(new Date(Date.now() + 5 * 60_000));

  const genStatusKey = (input: { expiresAtMax: IsoTimeStamp }) => {
    const keyStore = createDaemonKeyStore();
    const renewalRecord = createDaemonRenewalRecord();
    const grant = genSampleKeyrackSsoGrant({ expiresAt });
    handleUnlockCommand(
      {
        keys: [grant],
        renewals: [{ slug: grant.slug, expiresAtMax: input.expiresAtMax }],
      },
      { keyStore, renewalRecord },
    );
    const status = handleStatusCommand(
      {},
      { keyStore, renewalRecord, homeHash: 'test' },
    );
    return status.keys.find((key) => key.slug === grant.slug);
  };

  given('[case1] an sso key the daemon renews', () => {
    when('[t0] its max lies past the grant expiry', () => {
      then('the renewal reads `on`', () => {
        const key = genStatusKey({
          expiresAtMax: asIsoTimeStamp(new Date(Date.now() + 9 * 60 * 60_000)),
        });
        expect(key?.renewal).toEqual({
          status: 'on',
          count: { renewed: 0 },
          error: null,
        });
      });
    });

    when('[t1] the grant already expires at its max', () => {
      then('the renewal reads `off`', () => {
        const key = genStatusKey({ expiresAtMax: expiresAt });
        expect(key?.renewal).toEqual({
          status: 'off',
          count: { renewed: 0 },
          error: null,
        });
      });
    });
  });
});
