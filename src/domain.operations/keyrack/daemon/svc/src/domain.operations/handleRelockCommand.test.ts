import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { createDaemonKeyStore } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';

import { handleRelockCommand } from './handleRelockCommand';

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
        const result = handleRelockCommand({ env: 'prep' }, { keyStore });

        expect(result.relocked).toEqual(['ahbode.prep.TOKEN']);
        expect(result.relocked).toHaveLength(1);
      });

      then('every reach is purged — to lock a key locks all of it (q1)', () => {
        const keyStore = genStoreWithThreeReachesOfOneSlug();
        handleRelockCommand({ env: 'prep' }, { keyStore });

        expect(keyStore.size()).toEqual(0);
      });
    });

    when(
      '[t2] relocked with no filter at all (the clear-all sweep path)',
      () => {
        then('it reports ONE key, not three (e12)', () => {
          const keyStore = genStoreWithThreeReachesOfOneSlug();
          const result = handleRelockCommand({}, { keyStore });

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
          { keyStore },
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
          { keyStore },
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
          { keyStore },
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
        const result = handleRelockCommand({ env: 'prep' }, { keyStore });

        expect(result.relocked).toEqual([
          'ahbode.prep.ALPHA',
          'ahbode.prep.BETA',
        ]);
      });
    });
  });
});
