import { given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';

import { asKeyrackOmittedRow } from './asKeyrackOmittedRow';

/**
 * .what = pins the exact field set `asKeyrackOmittedRow` builds, at its own grain
 * .why = it is the ONE named home for an omission row, and the reach it attaches is what lets a
 *   human tell two rows of one slug apart. it was exercised only through `unlockKeyrackKeys`, so
 *   an edit that dropped the reach spread would re-open the byte-identical-row ambiguity this
 *   behavior exists to close, and no case would go red until an acceptance run
 *
 * .note = the ABSENCE cases matter as much as the presence ones. `reach` and `cause` must be
 *   OMITTED rather than set to `undefined`, because `JSON.stringify` drops an absent field and
 *   keeps a `null` for an undefined one — so a reachless row stays byte-identical to what it has
 *   always rendered, and no extant snapshot moves (e1)
 */
describe('asKeyrackOmittedRow', () => {
  const hostAtReach = genMockKeyrackHostManifest({
    hosts: {
      '@all.prep.MY_KEY@casey@ahction.com': {
        slug: '@all.prep.MY_KEY',
        reach: { exid: 'casey@ahction.com' },
      },
    },
  }).hosts['@all.prep.MY_KEY@casey@ahction.com']!;

  const hostReachless = genMockKeyrackHostManifest({
    hosts: { 'testorg.prep.MY_KEY': {} },
  }).hosts['testorg.prep.MY_KEY']!;

  given('[case1] a host cut at a reach', () => {
    when('[t0] a row is built for it', () => {
      const row = asKeyrackOmittedRow({
        slug: '@all.prep.MY_KEY',
        reason: 'lost',
        host: hostAtReach,
      });

      then('it names the slug, never the address', () => {
        expect(row.slug).toEqual('@all.prep.MY_KEY');
      });

      then('it carries the reach read OFF THE HOST', () => {
        expect(row.reach).toEqual({ exid: 'casey@ahction.com' });
      });

      then('it names the reason it was given', () => {
        expect(row.reason).toEqual('lost');
      });

      then('it holds no cause, since none was given', () => {
        expect('cause' in row).toEqual(false);
      });
    });
  });

  given('[case2] a host with no reach', () => {
    when('[t0] a row is built for it', () => {
      const row = asKeyrackOmittedRow({
        slug: 'testorg.prep.MY_KEY',
        reason: 'remote',
        host: hostReachless,
      });

      then('the reach field is OMITTED, never set to undefined', () => {
        // ⚠️ `in`, never `=== undefined` — the two differ exactly where it matters. a key
        //    present-but-undefined survives an equality check and still moves a snapshot
        expect('reach' in row).toEqual(false);
      });

      then('the row is byte-identical to a pre-reach row', () => {
        expect(JSON.stringify(row)).toEqual(
          JSON.stringify({ slug: 'testorg.prep.MY_KEY', reason: 'remote' }),
        );
      });
    });
  });

  given(
    '[case3] no host at all — the `absent` path, where none resolved',
    () => {
      when('[t0] a row is built', () => {
        const row = asKeyrackOmittedRow({
          slug: 'testorg.prep.MY_KEY',
          reason: 'absent',
        });

        then('it still builds, and carries no reach', () => {
          expect('reach' in row).toEqual(false);
          expect(row.reason).toEqual('absent');
        });
      });
    },
  );

  given('[case4] a live fault to report', () => {
    when('[t0] a row is built with its cause', () => {
      const cause = new Error('ssm throttled');
      const row = asKeyrackOmittedRow({
        slug: '@all.prep.MY_KEY',
        reason: 'errored',
        host: hostAtReach,
        cause,
      });

      then('the cause rides along', () => {
        expect(row.cause).toEqual(cause);
      });

      then('the reach still names WHICH account faulted', () => {
        // the pair is the point: a vault-level fault hits every reach of a slug at once, so a
        // row that named the cause but not the reach would leave a human unable to tell which
        // of two identical-looking rows belongs to which account
        expect(row.reach).toEqual({ exid: 'casey@ahction.com' });
      });
    });

    when('[t1] a cause is explicitly undefined', () => {
      const row = asKeyrackOmittedRow({
        slug: 'testorg.prep.MY_KEY',
        reason: 'errored',
        cause: undefined,
      });

      then('the field is dropped rather than kept as undefined', () => {
        expect('cause' in row).toEqual(false);
      });
    });
  });
});
