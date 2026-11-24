import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';
import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

import { createDaemonRenewRecord } from './daemonRenewRecord';

/**
 * .what = an sso grant for one slug, at an optional reach
 */
const genSsoGrant = (input: {
  slug: string;
  reach?: KeyrackKeyGrant['reach'];
}): KeyrackKeyGrant =>
  genSampleKeyrackSsoGrant({
    slug: input.slug,
    ...(input.reach ? { reach: input.reach } : {}),
    expiresAt: asIsoTimeStamp('2026-11-14T01:00:00Z'),
  });

const CAP_AT = asIsoTimeStamp('2026-11-14T09:00:00Z');

describe('daemonRenewRecord', () => {
  given('[case1] a fresh entry', () => {
    when('[t0] a grant is set', () => {
      then('the entry starts with no renews, no faults, no mark', () => {
        const record = createDaemonRenewRecord();
        const grant = genSsoGrant({ slug: 'ahbode.camp.AWS_PROFILE' });
        record.set({ grant, capAt: CAP_AT });

        expect(record.get({ slug: grant.slug })).toEqual({
          grant,
          capAt: CAP_AT,
          renewedCount: 0,
          faultCount: 0,
          mark: null,
        });
        expect(record.size()).toEqual(1);
      });
    });

    when('[t1] the same grant is set again over a marked entry', () => {
      then('the mark and counts are cleared', () => {
        const record = createDaemonRenewRecord();
        const grant = genSsoGrant({ slug: 'ahbode.camp.AWS_PROFILE' });
        record.set({ grant, capAt: CAP_AT });
        const [held] = record.entries();
        record.setIfHeld({
          address: held!.address,
          before: held!.entry,
          after: {
            ...held!.entry,
            renewedCount: 3,
            mark: { kind: 'lapsed', error: null },
          },
        });

        record.set({ grant, capAt: CAP_AT });

        expect(record.get({ slug: grant.slug })).toMatchObject({
          renewedCount: 0,
          mark: null,
        });
      });
    });
  });

  given('[case2] a conditional swap', () => {
    when('[t0] the entry read is still held', () => {
      then('the swap writes and answers true', () => {
        const record = createDaemonRenewRecord();
        record.set({
          grant: genSsoGrant({ slug: 'ahbode.camp.AWS_PROFILE' }),
          capAt: CAP_AT,
        });
        const [held] = record.entries();

        const isWritten = record.setIfHeld({
          address: held!.address,
          before: held!.entry,
          after: { ...held!.entry, renewedCount: 1 },
        });

        expect(isWritten).toEqual(true);
        expect(record.entries()[0]!.entry.renewedCount).toEqual(1);
      });
    });

    when('[t1] an unlock replaced the entry after it was read', () => {
      then('the swap writes naught and answers false', () => {
        const record = createDaemonRenewRecord();
        const grant = genSsoGrant({ slug: 'ahbode.camp.AWS_PROFILE' });
        record.set({ grant, capAt: CAP_AT });
        const [stale] = record.entries();
        record.set({ grant, capAt: CAP_AT }); // the unlock

        const isWritten = record.setIfHeld({
          address: stale!.address,
          before: stale!.entry,
          after: { ...stale!.entry, renewedCount: 9 },
        });

        expect(isWritten).toEqual(false);
        expect(record.get({ slug: grant.slug })?.renewedCount).toEqual(0);
      });
    });

    when('[t2] a relock removed the entry after it was read', () => {
      then('the swap writes naught and the entry stays gone', () => {
        const record = createDaemonRenewRecord();
        const grant = genSsoGrant({ slug: 'ahbode.camp.AWS_PROFILE' });
        record.set({ grant, capAt: CAP_AT });
        const [stale] = record.entries();
        record.del({ slug: grant.slug }); // the relock

        const isWritten = record.setIfHeld({
          address: stale!.address,
          before: stale!.entry,
          after: { ...stale!.entry, renewedCount: 9 },
        });

        expect(isWritten).toEqual(false);
        expect(record.size()).toEqual(0);
      });
    });
  });

  given('[case3] a slug held at two reaches, beside another slug', () => {
    const genRecord = () => {
      const record = createDaemonRenewRecord();
      record.set({
        grant: genSsoGrant({ slug: 'ahbode.camp.AWS_PROFILE' }),
        capAt: CAP_AT,
      });
      record.set({
        grant: genSsoGrant({
          slug: 'ahbode.camp.AWS_PROFILE',
          reach: { exid: 'acct-a' },
        }),
        capAt: CAP_AT,
      });
      record.set({
        grant: genSsoGrant({ slug: 'ahbode.prep.AWS_PROFILE' }),
        capAt: CAP_AT,
      });
      return record;
    };

    when('[t0] the slug is dropped with no reach', () => {
      then('every reach of that slug goes, the other slug stays', () => {
        const record = genRecord();
        expect(record.del({ slug: 'ahbode.camp.AWS_PROFILE' })).toEqual(true);
        expect(record.size()).toEqual(1);
        expect(record.get({ slug: 'ahbode.prep.AWS_PROFILE' })).not.toBeNull();
      });
    });

    when('[t1] an absent slug is dropped', () => {
      then('naught goes and it answers false', () => {
        const record = genRecord();
        expect(record.del({ slug: 'ahbode.test.AWS_PROFILE' })).toEqual(false);
        expect(record.size()).toEqual(3);
      });
    });

    when('[t2] every entry is cleared', () => {
      then('the record is empty', () => {
        const record = genRecord();
        record.clear();
        expect(record.size()).toEqual(0);
      });
    });
  });
});
