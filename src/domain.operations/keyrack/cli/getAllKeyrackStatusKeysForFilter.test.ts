import { given, then, when } from 'test-fns';

import type { DaemonStatusRow } from '@src/domain.operations/keyrack/daemon/sdk';

import { getAllKeyrackStatusKeysForFilter } from './getAllKeyrackStatusKeysForFilter';

/**
 * .what = the unit clamp for `status`'s two-axis narrow
 * .why = `status` is the one sweep verb whose rows carry BOTH a slug and a stored `.org`, so it
 *        is the one verb that can read the wrong one. the org axis must agree with `list` and
 *        `unlock`, which read the slug — and only a row where the two DISAGREE can prove it
 */
describe('getAllKeyrackStatusKeysForFilter', () => {
  /**
   * .note = `asRow` states the full shape once, so each case below spells only the fields it
   *         is about. `expiresAt` and `ttlLeftMs` are required by the interface and are inert
   *         to this narrow — it reads `slug`, `env`, and `org` alone
   */
  const asRow = (input: {
    slug: string;
    env: string;
    org: string;
  }): DaemonStatusRow => ({ ...input, expiresAt: null, ttlLeftMs: null });

  const rowMachineWide = asRow({
    slug: '@all.camp.MACHINE_KEY',
    env: 'camp',
    org: '@all',
  });
  const rowRepo = asRow({
    slug: 'testorg.camp.REPO_KEY',
    env: 'camp',
    org: 'testorg',
  });

  /**
   * ⚠️ .what = the row THIS FILE EXISTS FOR — a machine-wide slug whose STORED org is `'unknown'`
   * .why = `unlockKeyrackKeys.ts` mints the stored org from a fallback chain
   *        (`hostConfig.org ?? grant.org ?? slugOrg ?? repoManifest?.org ?? 'unknown'`), so a
   *        grant that falls through every source records `'unknown'` while the slug still says
   *        `@all`. every other row in this file has the two fields in agreement, and against
   *        those a stored-field read and a slug read are indistinguishable — so a suite built
   *        only from agreed rows cannot detect WHICH field the filter consults. this row is what
   *        gives the axis teeth
   */
  const rowMachineWideWithLostOrg = asRow({
    slug: '@all.camp.LOST_ORG_KEY',
    env: 'camp',
    org: 'unknown',
  });

  const keys = [rowMachineWide, rowRepo, rowMachineWideWithLostOrg];

  given('[case1] no filter on either axis', () => {
    when('[t0] both env and org are null', () => {
      // ⚠️ .why = THE DEFAULT ROW. null on an axis means NO filter, never an empty result —
      //         which is what makes both flags additive over `status`'s extant scope
      then('every row stands', () => {
        expect(
          getAllKeyrackStatusKeysForFilter({ keys, env: null, org: null }),
        ).toEqual(keys);
      });
    });
  });

  given('[case2] the org axis reads the SLUG, never the stored field', () => {
    when('[t0] the org is @all', () => {
      // ⚠️ .why = THE CLAMP WITH TEETH. a stored-field read keeps only `rowMachineWide` and
      //        silently drops `rowMachineWideWithLostOrg` — whose slug says `@all` and whose
      //        stored org says `'unknown'`. `list --org @all` reads the slug and WOULD keep it,
      //        so a stored-field read here makes two verbs disagree about the same key, with no
      //        error on either side. this row is what says which field was read
      then('BOTH machine-wide rows are kept, by their slugs', () => {
        expect(
          getAllKeyrackStatusKeysForFilter({ keys, env: null, org: '@all' }),
        ).toEqual([rowMachineWide, rowMachineWideWithLostOrg]);
      });
    });

    when('[t1] the org is a real org', () => {
      then('only the repo row is kept', () => {
        expect(
          getAllKeyrackStatusKeysForFilter({ keys, env: null, org: 'testorg' }),
        ).toEqual([rowRepo]);
      });
    });

    when('[t2] the org matches only a STORED value, never a slug', () => {
      // ⚠️ .why = the mirror of [t0], and the half that catches a HALF-migration. a filter that
      //        still read the stored field would keep `rowMachineWideWithLostOrg` here — a key
      //        surfaced under an org that appears in no slug on the rack. `'unknown'` is not a
      //        provenance a human can ask for; it is a record of a lookup that failed
      then('no row is kept', () => {
        expect(
          getAllKeyrackStatusKeysForFilter({ keys, env: null, org: 'unknown' }),
        ).toEqual([]);
      });
    });
  });

  given('[case3] the two axes compose', () => {
    const rowOtherEnv = asRow({
      slug: '@all.prep.OTHER_ENV_KEY',
      env: 'prep',
      org: '@all',
    });
    const keysAcrossEnvs = [...keys, rowOtherEnv];

    when('[t0] both env and org are named', () => {
      // .why = the axes are independent, so a narrow on both must be their INTERSECTION —
      //        never one axis silently overruled by the other
      then('only the rows that satisfy BOTH are kept', () => {
        expect(
          getAllKeyrackStatusKeysForFilter({
            keys: keysAcrossEnvs,
            env: 'camp',
            org: '@all',
          }),
        ).toEqual([rowMachineWide, rowMachineWideWithLostOrg]);
      });
    });

    when('[t1] the env alone is named', () => {
      // .note = null on the org axis leaves it OPEN, so this narrows on env alone
      then('the org axis stays open', () => {
        expect(
          getAllKeyrackStatusKeysForFilter({
            keys: keysAcrossEnvs,
            env: 'prep',
            org: null,
          }),
        ).toEqual([rowOtherEnv]);
      });
    });
  });

  given('[case5] a row whose STORED env disagrees with its slug', () => {
    /**
     * ⚠️ .what = the env-axis twin of `rowMachineWideWithLostOrg`, and the only shape that can
     *        read WHICH FIELD the env narrow uses
     * .why = `unlockKeyrackKeys.ts` mints the stored env from `hostConfig.env ?? grant.env ??
     *        slugEnv ?? env`, so a row minted from `hostConfig.env` — or from the ASK's env when
     *        the slug carried none — records an env its slug never spells. every other row in
     *        this file has the two in agreement, and against those a stored read and a slug read
     *        are indistinguishable. an axis is only guarded once ONE row disagrees on it, so this
     *        row is what makes the env narrow's field choice observable at all
     */
    const rowEnvDrift = asRow({
      slug: '@all.camp.DRIFTED_ENV_KEY',
      env: 'prep',
      org: '@all',
    });

    when('[t0] the env asked is the SLUG env', () => {
      // ⚠️ .why = THE CLAMP WITH TEETH. a stored-field read drops this row — its `.env` says
      //        `prep` — while `list --env camp` reads the slug and WOULD keep it. one rack, one
      //        flag, two verbs, two membership answers, with no error on either side
      then('the row is kept, by its slug', () => {
        expect(
          getAllKeyrackStatusKeysForFilter({
            keys: [rowEnvDrift],
            env: 'camp',
            org: null,
          }),
        ).toEqual([rowEnvDrift]);
      });
    });

    when('[t1] the env asked matches only the STORED value', () => {
      // ⚠️ .why = the mirror of [t0], and the half that catches a HALF-migration. a filter that
      //        still read the stored field would surface this row under `prep` — an env that
      //        appears in no slug on the rack
      then('no row is kept', () => {
        expect(
          getAllKeyrackStatusKeysForFilter({
            keys: [rowEnvDrift],
            env: 'prep',
            org: null,
          }),
        ).toEqual([]);
      });
    });

    when('[t2] a row carries a BARE key name rather than a full slug', () => {
      // .why = a bare name spells no env, so an env filter excludes it — for exactly the reason
      //        it spells no org. this is the rule `list` already held, now shared
      const rowBare = asRow({ slug: 'BARE_KEY', env: 'camp', org: '@all' });

      then('it is excluded from any env narrow', () => {
        expect(
          getAllKeyrackStatusKeysForFilter({
            keys: [rowBare],
            env: 'camp',
            org: null,
          }),
        ).toEqual([]);
      });

      then('and it still stands when no env is asked', () => {
        expect(
          getAllKeyrackStatusKeysForFilter({
            keys: [rowBare],
            env: null,
            org: null,
          }),
        ).toEqual([rowBare]);
      });
    });
  });

  given('[case4] a LOOKALIKE org rides the rack', () => {
    const rowLookalike = asRow({
      slug: '@allstar.camp.LOOKALIKE',
      env: 'camp',
      org: '@allstar',
    });

    when('[t0] the org is @all', () => {
      // ⚠️ .why = `@allstar` starts with the letters `@all`, so a `startsWith` read would hand a
      //        real org's credential to a machine-wide ask. the delegation inherits the one
      //        decoder's answer, and this row is what proves the delegation is real rather than
      //        a re-spelled prefix test
      then('the lookalike is excluded', () => {
        expect(
          getAllKeyrackStatusKeysForFilter({
            keys: [rowMachineWide, rowLookalike],
            env: null,
            org: '@all',
          }),
        ).toEqual([rowMachineWide]);
      });
    });
  });
});
