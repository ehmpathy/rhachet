import { given, then, when } from 'test-fns';

import { asKeyrackStatusEmptyNotice } from './asKeyrackStatusEmptyNotice';

/**
 * .what = pins WHICH of the two empty-causes `status` names
 * .why = an empty rack means either "a filter ate your keys" or "the daemon holds none", and
 *        the two send a human to opposite places. this decision was inline in the orchestrator
 *        and its riskiest branch had no acceptance row at all — so a wrong answer there moved
 *        no snapshot and no test went red. these rows are the guard that was absent
 *        (`rule.require.clamp-edge-cases`)
 */
describe('asKeyrackStatusEmptyNotice', () => {
  /**
   * ⚠️ .why = THE DEFECT ROW. `--org` is a flag this wish added, and it inherited an empty
   *        render that branched on `--env` alone. so a typo'd `--org @al` said "(no keys
   *        unlocked)" on a daemon that HELD an unlocked key — a silent wrong answer at exit 0,
   *        found by a dogfood on a real box (`rule.forbid.failhide`)
   */
  given('[case1] an --org narrow ate every key', () => {
    when('[t0] the notice is composed', () => {
      const notice = asKeyrackStatusEmptyNotice({
        env: null,
        org: '@al',
        countBefore: 6,
        fixEnv: null,
        fixOrg: 'try --org ehmpathy',
      });

      then('it does NOT claim the daemon is empty — it is not', () => {
        expect(notice).not.toContain('no keys unlocked');
      });

      then('it names the org filter at fault, so a typo is visible', () => {
        expect(notice).toEqual('(no keys in --org @al, try --org ehmpathy)');
      });
    });
  });

  given('[case2] an --env narrow ate every key', () => {
    when('[t0] a peer env holds keys', () => {
      const notice = asKeyrackStatusEmptyNotice({
        env: 'test',
        org: null,
        countBefore: 3,
        fixEnv: 'try --env prep',
        fixOrg: null,
      });

      then('it reads exactly as it did before --org existed', () => {
        // ⚠️ the backwards-compat clamp — pinned byte-for-byte against the extant acceptance
        //    snapshot (`keyrack.status.env-filter…snap:100`), so the new axis cannot have
        //    moved the extant one
        expect(notice).toEqual('(no keys in --env test, try --env prep)');
      });
    });

    when('[t1] no peer env holds keys (only sudo, which is silent)', () => {
      const notice = asKeyrackStatusEmptyNotice({
        env: 'test',
        org: null,
        countBefore: 1,
        fixEnv: null,
        fixOrg: null,
      });

      then('it names the filter with no fix clause', () => {
        // pinned against `keyrack.status.env-filter…snap:112`
        expect(notice).toEqual('(no keys in --env test)');
      });
    });
  });

  given('[case3] both axes were spelled', () => {
    when('[t0] the notice is composed', () => {
      const notice = asKeyrackStatusEmptyNotice({
        env: 'camp',
        org: '@al',
        countBefore: 6,
        fixEnv: 'try --env prep or --env test',
        fixOrg: 'try --org ehmpathy',
      });

      then('it names BOTH filters, since either could be the cause', () => {
        expect(notice).toEqual(
          '(no keys in --env camp --org @al, try --env prep or --env test, try --org ehmpathy)',
        );
      });

      then('each axis keeps its own `try`, never one merged list', () => {
        // .note = a merged `try --env prep or --org ehmpathy` would read as "either alone
        //         fixes it" — a claim a compound narrow cannot make
        expect(notice.match(/try /g)).toHaveLength(2);
      });
    });
  });

  /**
   * ⚠️ .why = THE GUARD ROW, and the branch that had no acceptance coverage at all.
   *        `countBefore: 0` means the filter is INNOCENT — the daemon simply holds none. to
   *        blame the filter here would send a human to check a flag that was never the cause,
   *        which is the mirror-image defect of case1 and just as silent
   */
  given('[case4] the daemon is GENUINELY empty, under the same filter', () => {
    when('[t0] the notice is composed', () => {
      const notice = asKeyrackStatusEmptyNotice({
        env: 'test',
        org: '@al',
        countBefore: 0,
        fixEnv: null,
        fixOrg: null,
      });

      then('it blames no filter', () => {
        expect(notice).toEqual('(no keys unlocked)');
        expect(notice).not.toContain('--env');
        expect(notice).not.toContain('--org');
      });
    });
  });

  given('[case5] no filter was spelled at all', () => {
    when('[t0] the daemon holds keys but none rendered', () => {
      const notice = asKeyrackStatusEmptyNotice({
        env: null,
        org: null,
        countBefore: 6,
        fixEnv: null,
        fixOrg: null,
      });

      then('it reads as the unfiltered empty rack', () => {
        // pinned against `keyrack.relock…snap:41`
        expect(notice).toEqual('(no keys unlocked)');
      });
    });
  });
});
