import { MalfunctionError } from 'helpful-errors';
import { asIsoTimeStamp } from 'iso-time';
import { getError, given, then, when } from 'test-fns';

import { genSampleKeyrackSsoGrant } from '@src/.test/assets/genSampleKeyrackSsoGrant';
import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { createDaemonKeyStore } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore';
import { createDaemonRenewalRecord } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonRenewalRecord';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';

import { handleRelockCommand } from './handleRelockCommand';
import { handleUnlockCommand } from './handleUnlockCommand';

/**
 * .what = clamps e12 — relock reports per KEY, never per reach
 * .why = `entries()` yields one row per (slug, reach), which is correct for `status`: the
 *        rack shows one branch per reach. relock reports per key, so the SAME call
 *        needs those rows collapsed — else one slug held at three reaches renders three
 *        `🔒 pruned` lines for one key a human locked once. the dedupe is implemented; this
 *        is what makes it impossible to remove without a failure
 */
describe('handleRelockCommand', () => {
  const expiresAt = asIsoTimeStamp(new Date(Date.now() + 60_000));

  const genGrant = (input: {
    slug: string;
    reach?: KeyrackKeyReach;
    env?: string;
  }): KeyrackKeyGrant =>
    new KeyrackKeyGrant({
      slug: input.slug,
      key: {
        secret: `secret-for-${input.slug}`,
        grade: { protection: 'encrypted', duration: 'ephemeral' },
      },
      source: { vault: 'os.secure', mech: 'PERMANENT_VIA_REPLICA' },
      env: input.env ?? 'prep',
      org: 'ahbode',
      ...asKeyrackKeyReachField({ reach: input.reach }),
      expiresAt,
    });

  /**
   * the vision's own demo: one key name, three reaches, one rack
   */
  const genStoreWithThreeReachesOfOneSlug = (): ReturnType<
    typeof createDaemonKeyStore
  > => {
    const store = createDaemonKeyStore();
    store.set({ grant: genGrant({ slug: 'ahbode.prep.TOKEN' }) });
    store.set({
      grant: genGrant({
        slug: 'ahbode.prep.TOKEN',
        reach: new KeyrackKeyReach({ exid: 'github://org=ehmpathy' }),
      }),
    });
    store.set({
      grant: genGrant({
        slug: 'ahbode.prep.TOKEN',
        reach: new KeyrackKeyReach({ exid: 'beav@ehmpathy.com' }),
      }),
    });
    return store;
  };

  given('[case1] one slug held at three reaches', () => {
    when('[t0] the store is loaded', () => {
      then('it holds three entries — one per reach', () => {
        expect(genStoreWithThreeReachesOfOneSlug().size()).toEqual(3);
      });
    });

    when('[t1] relocked by env (a sweep path)', () => {
      then('it reports ONE key, not three (e12)', () => {
        const keyStore = genStoreWithThreeReachesOfOneSlug();
        const result = handleRelockCommand(
          { env: 'prep' },
          { keyStore, renewalRecord: createDaemonRenewalRecord() },
        );

        expect(result.relocked).toEqual(['ahbode.prep.TOKEN']);
        expect(result.relocked).toHaveLength(1);
      });

      then('every reach is purged — to lock a key locks all of it (q1)', () => {
        const keyStore = genStoreWithThreeReachesOfOneSlug();
        handleRelockCommand(
          { env: 'prep' },
          { keyStore, renewalRecord: createDaemonRenewalRecord() },
        );

        expect(keyStore.size()).toEqual(0);
      });
    });

    when(
      '[t2] relocked with no filter at all (the clear-all sweep path)',
      () => {
        then('it reports ONE key, not three (e12)', () => {
          const keyStore = genStoreWithThreeReachesOfOneSlug();
          const result = handleRelockCommand(
            {},
            { keyStore, renewalRecord: createDaemonRenewalRecord() },
          );

          expect(result.relocked).toEqual(['ahbode.prep.TOKEN']);
          expect(result.relocked).toHaveLength(1);
        });
      },
    );

    when('[t3] relocked by the slug a human named', () => {
      then('it reports ONE key and sweeps every reach (q1)', () => {
        const keyStore = genStoreWithThreeReachesOfOneSlug();
        const result = handleRelockCommand(
          { slugs: ['ahbode.prep.TOKEN'] },
          { keyStore, renewalRecord: createDaemonRenewalRecord() },
        );

        expect(result.relocked).toEqual(['ahbode.prep.TOKEN']);
        expect(keyStore.size()).toEqual(0);
      });
    });
  });

  /**
   * .note = the narrow purge exists for the `set` path, which re-cuts ONE reach and
   *         must leave every other reach's grant untouched. a human who relocks passes
   *         no reach, and so sweeps them all — "to grant is narrow, to revoke is wide" (q1)
   */
  given('[case2] a reach given alongside the slug', () => {
    when('[t0] relocked at one reach', () => {
      then('only that reach is purged; its peers survive', () => {
        const keyStore = genStoreWithThreeReachesOfOneSlug();
        const result = handleRelockCommand(
          {
            slugs: ['ahbode.prep.TOKEN'],
            reach: new KeyrackKeyReach({ exid: 'github://org=ehmpathy' }),
          },
          { keyStore, renewalRecord: createDaemonRenewalRecord() },
        );

        expect(result.relocked).toEqual(['ahbode.prep.TOKEN']);
        expect(keyStore.size()).toEqual(2);
      });

      then('the reachless key is one of the survivors', () => {
        const keyStore = genStoreWithThreeReachesOfOneSlug();
        handleRelockCommand(
          {
            slugs: ['ahbode.prep.TOKEN'],
            reach: new KeyrackKeyReach({ exid: 'github://org=ehmpathy' }),
          },
          { keyStore, renewalRecord: createDaemonRenewalRecord() },
        );

        expect(keyStore.get({ slug: 'ahbode.prep.TOKEN' })).not.toBeNull();
      });
    });
  });

  given('[case3] two DIFFERENT slugs, each held at two reaches', () => {
    const genStore = (): ReturnType<typeof createDaemonKeyStore> => {
      const store = createDaemonKeyStore();
      for (const slug of ['ahbode.prep.ALPHA', 'ahbode.prep.BETA']) {
        store.set({ grant: genGrant({ slug }) });
        store.set({
          grant: genGrant({
            slug,
            reach: new KeyrackKeyReach({ exid: 'github://org=ehmpathy' }),
          }),
        });
      }
      return store;
    };

    when('[t0] relocked by env', () => {
      // .note = the dedupe must collapse WITHIN a slug and not ACROSS slugs — a naive
      //         `new Set()` over the wrong field, or a collapse to one line total, would
      //         both pass a single-slug test and fail here
      then('it reports both keys, once each', () => {
        const keyStore = genStore();
        const result = handleRelockCommand(
          { env: 'prep' },
          { keyStore, renewalRecord: createDaemonRenewalRecord() },
        );

        expect(result.relocked).toEqual([
          'ahbode.prep.ALPHA',
          'ahbode.prep.BETA',
        ]);
      });
    });
  });

  /**
   * .what = a relock purges the renewal record on every path, so a renew never revives a key
   *         a human locked
   * .why = the record is seeded through the unlock handler, as the daemon fills it; each
   *        path's purge goes red here if removed
   */
  given('[case4] an sso key the daemon renews', () => {
    const expiresAtMax = asIsoTimeStamp(new Date(Date.now() + 9 * 60 * 60_000));
    const reach = new KeyrackKeyReach({ exid: 'github://org=ehmpathy' });
    const genDaemonWithRenew = (input: { reach?: KeyrackKeyReach }) => {
      const keyStore = createDaemonKeyStore();
      const renewalRecord = createDaemonRenewalRecord();
      const grant = genSampleKeyrackSsoGrant({ expiresAt, reach: input.reach });
      handleUnlockCommand(
        {
          keys: [grant],
          renewals: [
            {
              slug: grant.slug,
              expiresAtMax,
              ...asKeyrackKeyReachField({ reach: input.reach }),
            },
          ],
        },
        { keyStore, renewalRecord },
      );
      return { keyStore, renewalRecord, grant };
    };

    when('[t0] the unlock is in', () => {
      then('the record holds a renew entry', () => {
        const daemon = genDaemonWithRenew({});
        expect(daemon.renewalRecord.size()).toEqual(1);
      });
    });

    when('[t1] relocked by the slug', () => {
      then('the renew entry is purged', () => {
        const daemon = genDaemonWithRenew({});
        handleRelockCommand({ slugs: [daemon.grant.slug] }, daemon);
        expect(daemon.renewalRecord.size()).toEqual(0);
      });
    });

    when('[t2] relocked by its env', () => {
      then('the renew entry is purged', () => {
        const daemon = genDaemonWithRenew({});
        handleRelockCommand({ env: 'camp' }, daemon);
        expect(daemon.renewalRecord.size()).toEqual(0);
      });
    });

    when('[t3] relocked by another env', () => {
      then('the renew entry stays', () => {
        const daemon = genDaemonWithRenew({});
        handleRelockCommand({ env: 'prep' }, daemon);
        expect(daemon.renewalRecord.size()).toEqual(1);
      });
    });

    when('[t4] relocked whole (no slug, no env)', () => {
      then('the renew entry is purged', () => {
        const daemon = genDaemonWithRenew({});
        handleRelockCommand({}, daemon);
        expect(daemon.renewalRecord.size()).toEqual(0);
      });
    });

    when('[t5] relocked by the slug at its reach', () => {
      then('the renew entry at that reach is purged', () => {
        const daemon = genDaemonWithRenew({ reach });
        handleRelockCommand({ slugs: [daemon.grant.slug], reach }, daemon);
        expect(daemon.renewalRecord.size()).toEqual(0);
      });
    });
  });

  /**
   * .what = a stopped renewal that outlived its grant is a key the human can still lock
   * .why = a lapsed or halted entry stays in status past its grant (F5) and keeps the daemon
   *        alive; a relock that missed it would leave both behind
   */
  given('[case5] a lapsed entry whose grant has left the store', () => {
    const expiresAtMax = asIsoTimeStamp(new Date(Date.now() + 9 * 60 * 60_000));
    const genDaemonWithLapsedOnly = () => {
      const keyStore = createDaemonKeyStore();
      const renewalRecord = createDaemonRenewalRecord();
      const grant = genSampleKeyrackSsoGrant({ expiresAt });
      handleUnlockCommand(
        { keys: [grant], renewals: [{ slug: grant.slug, expiresAtMax }] },
        { keyStore, renewalRecord },
      );
      const before = renewalRecord.get({ slug: grant.slug })!;
      renewalRecord.setIfHeld({
        address: renewalRecord.entries()[0]!.address,
        before,
        after: { ...before, status: 'lapsed' },
      });
      keyStore.del({ slug: grant.slug });
      return { keyStore, renewalRecord, grant };
    };

    when('[t0] relocked by the slug', () => {
      then('the key is reported locked and the entry is purged', () => {
        const daemon = genDaemonWithLapsedOnly();
        const result = handleRelockCommand(
          { slugs: [daemon.grant.slug] },
          daemon,
        );
        expect(result.relocked).toEqual([daemon.grant.slug]);
        expect(daemon.renewalRecord.size()).toEqual(0);
      });
    });

    when('[t1] relocked by its env', () => {
      then('the key is reported locked and the entry is purged', () => {
        const daemon = genDaemonWithLapsedOnly();
        const result = handleRelockCommand({ env: 'camp' }, daemon);
        expect(result.relocked).toEqual([daemon.grant.slug]);
        expect(daemon.renewalRecord.size()).toEqual(0);
      });
    });

    when('[t2] relocked whole', () => {
      then('the key is reported locked and the entry is purged', () => {
        const daemon = genDaemonWithLapsedOnly();
        const result = handleRelockCommand({}, daemon);
        expect(result.relocked).toEqual([daemon.grant.slug]);
        expect(daemon.renewalRecord.size()).toEqual(0);
      });
    });
  });

  given('[case6] a reach that arrives with no slugs', () => {
    when('[t0] relocked', () => {
      then(
        'it refuses, so the reach filter is never silently dropped',
        async () => {
          const keyStore = genStoreWithThreeReachesOfOneSlug();
          const error = await getError(async () =>
            handleRelockCommand(
              {
                env: 'prep',
                reach: new KeyrackKeyReach({ exid: 'github://org=ehmpathy' }),
              },
              { keyStore, renewalRecord: createDaemonRenewalRecord() },
            ),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain(
            'relock received a reach with no slugs',
          );
          expect(keyStore.size()).toEqual(3);
        },
      );
    });
  });
});
