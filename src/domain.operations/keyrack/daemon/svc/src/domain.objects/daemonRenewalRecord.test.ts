import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';
import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

import { createDaemonRenewalRecord } from './daemonRenewalRecord';

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

const EXPIRES_AT_MAX = asIsoTimeStamp('2026-11-14T09:00:00Z');

describe('daemonRenewalRecord', () => {
  given('[case1] a fresh entry', () => {
    when('[t0] a grant is set', () => {
      then('the entry starts `on`, with no renews and no faults', () => {
        const record = createDaemonRenewalRecord();
        const grant = genSsoGrant({ slug: 'ahbode.camp.AWS_PROFILE' });
        record.set({ grant, expiresAtMax: EXPIRES_AT_MAX });

        expect(record.get({ slug: grant.slug })).toEqual({
          grant,
          expiresAtMax: EXPIRES_AT_MAX,
          status: 'on',
          count: { renewed: 0, faulted: 0 },
          error: null,
        });
        expect(record.size()).toEqual(1);
      });
    });

    when('[t1] the same grant is set again over a lapsed entry', () => {
      then('the status returns to `on` and the counts clear', () => {
        const record = createDaemonRenewalRecord();
        const grant = genSsoGrant({ slug: 'ahbode.camp.AWS_PROFILE' });
        record.set({ grant, expiresAtMax: EXPIRES_AT_MAX });
        const [held] = record.entries();
        record.setIfHeld({
          address: held!.address,
          before: held!.entry,
          after: {
            ...held!.entry,
            count: { renewed: 3, faulted: 0 },
            status: 'lapsed',
          },
        });

        record.set({ grant, expiresAtMax: EXPIRES_AT_MAX });

        expect(record.get({ slug: grant.slug })).toMatchObject({
          status: 'on',
          count: { renewed: 0, faulted: 0 },
        });
      });
    });
  });

  given('[case2] a conditional swap', () => {
    when('[t0] the entry read is still held', () => {
      then('the swap writes and answers true', () => {
        const record = createDaemonRenewalRecord();
        record.set({
          grant: genSsoGrant({ slug: 'ahbode.camp.AWS_PROFILE' }),
          expiresAtMax: EXPIRES_AT_MAX,
        });
        const [held] = record.entries();

        const isWritten = record.setIfHeld({
          address: held!.address,
          before: held!.entry,
          after: { ...held!.entry, count: { renewed: 1, faulted: 0 } },
        });

        expect(isWritten).toEqual(true);
        expect(record.entries()[0]!.entry.count.renewed).toEqual(1);
      });
    });

    when('[t1] an unlock replaced the entry after it was read', () => {
      then('the swap writes naught and answers false', () => {
        const record = createDaemonRenewalRecord();
        const grant = genSsoGrant({ slug: 'ahbode.camp.AWS_PROFILE' });
        record.set({ grant, expiresAtMax: EXPIRES_AT_MAX });
        const [stale] = record.entries();
        record.set({ grant, expiresAtMax: EXPIRES_AT_MAX }); // the unlock

        const isWritten = record.setIfHeld({
          address: stale!.address,
          before: stale!.entry,
          after: { ...stale!.entry, count: { renewed: 9, faulted: 0 } },
        });

        expect(isWritten).toEqual(false);
        expect(record.get({ slug: grant.slug })?.count.renewed).toEqual(0);
      });
    });

    when('[t2] a relock removed the entry after it was read', () => {
      then('the swap writes naught and the entry stays gone', () => {
        const record = createDaemonRenewalRecord();
        const grant = genSsoGrant({ slug: 'ahbode.camp.AWS_PROFILE' });
        record.set({ grant, expiresAtMax: EXPIRES_AT_MAX });
        const [stale] = record.entries();
        record.del({ slug: grant.slug }); // the relock

        const isWritten = record.setIfHeld({
          address: stale!.address,
          before: stale!.entry,
          after: { ...stale!.entry, count: { renewed: 9, faulted: 0 } },
        });

        expect(isWritten).toEqual(false);
        expect(record.size()).toEqual(0);
      });
    });
  });

  given('[case3] a slug held at two reaches, beside another slug', () => {
    const genRecord = () => {
      const record = createDaemonRenewalRecord();
      record.set({
        grant: genSsoGrant({ slug: 'ahbode.camp.AWS_PROFILE' }),
        expiresAtMax: EXPIRES_AT_MAX,
      });
      record.set({
        grant: genSsoGrant({
          slug: 'ahbode.camp.AWS_PROFILE',
          reach: { exid: 'acct-a' },
        }),
        expiresAtMax: EXPIRES_AT_MAX,
      });
      record.set({
        grant: genSsoGrant({ slug: 'ahbode.prep.AWS_PROFILE' }),
        expiresAtMax: EXPIRES_AT_MAX,
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
