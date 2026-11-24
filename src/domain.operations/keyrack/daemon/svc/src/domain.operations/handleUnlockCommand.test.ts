import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';
import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import { createDaemonKeyStore } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore';
import { createDaemonRenewRecord } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonRenewRecord';

import { handleUnlockCommand } from './handleUnlockCommand';

/**
 * .what = an unlock files, keeps, or drops the renew of each grant it stores
 * .why = one daemon serves every repo on a host; an unlock from an older cli (no
 *        `renewals` field) must never end a renew a current cli filed, while a current
 *        cli that files none must drop it
 */
describe('handleUnlockCommand', () => {
  const capAt = asIsoTimeStamp(new Date(Date.now() + 9 * 60 * 60_000));

  const genDaemonWithRenew = () => {
    const keyStore = createDaemonKeyStore();
    const renewRecord = createDaemonRenewRecord();
    const grant = genSampleKeyrackSsoGrant({
      expiresAt: asIsoTimeStamp(new Date(Date.now() + 60_000)),
    });
    handleUnlockCommand(
      { keys: [grant], renewals: [{ slug: grant.slug, capAt }] },
      { keyStore, renewRecord },
    );
    return { keyStore, renewRecord, grant };
  };

  given('[case1] an sso key whose renew a current cli filed', () => {
    when('[t0] an older cli unlocks it again, with no renewals field', () => {
      then('the renew is kept, on the fresh grant, under its prior cap', () => {
        const daemon = genDaemonWithRenew();
        const grantFresh = genSampleKeyrackSsoGrant({
          expiresAt: asIsoTimeStamp(new Date(Date.now() + 120_000)),
        });
        const reply = handleUnlockCommand({ keys: [grantFresh] }, daemon);
        const entry = daemon.renewRecord.get({ slug: grantFresh.slug });
        expect(entry?.capAt).toEqual(capAt);
        expect(entry?.grant.expiresAt).toEqual(grantFresh.expiresAt);
        expect(reply.renewable).toEqual([grantFresh.slug]);
      });
    });

    when('[t0.1] an older cli unlocks it again as another mech', () => {
      then('the renew is dropped — its path was the prior mech', () => {
        const daemon = genDaemonWithRenew();
        const grantOther = new KeyrackKeyGrant({
          ...daemon.grant,
          source: { vault: 'os.secure', mech: 'PERMANENT_VIA_REPLICA' },
        });
        handleUnlockCommand({ keys: [grantOther] }, daemon);
        expect(daemon.renewRecord.size()).toEqual(0);
      });
    });

    when('[t1] a current cli unlocks it again and files no renewal', () => {
      then('the renew is dropped', () => {
        const daemon = genDaemonWithRenew();
        const reply = handleUnlockCommand(
          { keys: [daemon.grant], renewals: [] },
          daemon,
        );
        expect(daemon.renewRecord.size()).toEqual(0);
        expect(reply.renewable).toEqual([]);
      });
    });
  });

  given('[case2] an sso key with no renew filed', () => {
    when('[t0] an older cli unlocks it, with no renewals field', () => {
      then('no renew is filed', () => {
        const keyStore = createDaemonKeyStore();
        const renewRecord = createDaemonRenewRecord();
        const grant = genSampleKeyrackSsoGrant({
          expiresAt: asIsoTimeStamp(new Date(Date.now() + 60_000)),
        });
        const reply = handleUnlockCommand(
          { keys: [grant] },
          { keyStore, renewRecord },
        );
        expect(renewRecord.size()).toEqual(0);
        expect(reply.renewable).toEqual([]);
      });
    });
  });
});
