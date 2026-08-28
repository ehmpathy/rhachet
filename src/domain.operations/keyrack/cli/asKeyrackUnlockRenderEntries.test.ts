import { given, then, when } from 'test-fns';

import { genMockKeyrackKeyGrant } from '@src/.test/assets/genMockKeyrackKeyGrant';
import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import type { KeyrackKeyOmission } from '@src/domain.objects/keyrack/KeyrackKeyOmission';

import { asKeyrackUnlockRenderEntries } from './asKeyrackUnlockRenderEntries';

// .note = the shared fixture, never a local literal — the grant shape is a core domain
//         object and lived hand-copied at eight sites (`rule.require.shared-test-fixtures`).
//         only the fields this suite actually varies are named here
const genGrant = (slug: string): KeyrackKeyGrant =>
  genMockKeyrackKeyGrant({
    slug,
    key: {
      secret: 'sk-probe',
      grade: { protection: 'encrypted', duration: 'permanent' },
    },
    source: { vault: 'os.direct', mech: 'PERMANENT_VIA_REPLICA' },
    env: 'prep',
    org: 'testorg',
  });

describe('asKeyrackUnlockRenderEntries', () => {
  given('[case1] both grants and omissions', () => {
    const unlocked = [genGrant('testorg.prep.A'), genGrant('testorg.prep.B')];
    const omitted: KeyrackKeyOmission[] = [
      { slug: 'testorg.prep.C', reason: 'lost' },
      {
        slug: '@all.prep.D',
        reason: 'absent',
        reach: { exid: 'casey@ahction.com' },
      },
    ];

    when('[t0] the render list is built', () => {
      const entries = asKeyrackUnlockRenderEntries({ unlocked, omitted });

      then('every row on both sides is present', () => {
        expect(entries.length).toEqual(4);
      });

      then('grants come first, omissions after', () => {
        expect(entries.map((entry) => entry.type)).toEqual([
          'unlocked',
          'unlocked',
          'omitted',
          'omitted',
        ]);
      });

      then('each grant rides under `grant`, unflattened', () => {
        const first = entries[0]!;
        expect(first.type).toEqual('unlocked');
        if (first.type !== 'unlocked') throw new Error('narrow failed');
        expect(first.grant.slug).toEqual('testorg.prep.A');
      });

      then('each omission rides under `omission`, unflattened', () => {
        const third = entries[2]!;
        expect(third.type).toEqual('omitted');
        if (third.type !== 'omitted') throw new Error('narrow failed');
        expect(third.omission.reason).toEqual('lost');
      });

      then('an omission carries its reach through untouched', () => {
        const fourth = entries[3]!;
        if (fourth.type !== 'omitted') throw new Error('narrow failed');
        // ⚠️ the reach must survive the wrap. it is what tells two rows of one slug apart, so a
        //    wrap that dropped it would re-open the byte-identical-row ambiguity one layer up
        //    from where `asKeyrackOmittedRow` attaches it
        expect(fourth.omission.reach).toEqual({ exid: 'casey@ahction.com' });
      });
    });
  });

  given('[case2] grants only — the healthy common case', () => {
    when('[t0] the render list is built', () => {
      const entries = asKeyrackUnlockRenderEntries({
        unlocked: [genGrant('testorg.prep.A')],
        omitted: [],
      });

      then('it holds the one grant and no omission row', () => {
        expect(entries.length).toEqual(1);
        expect(entries[0]!.type).toEqual('unlocked');
      });
    });
  });

  given('[case3] an empty rack', () => {
    when('[t0] the render list is built', () => {
      const entries = asKeyrackUnlockRenderEntries({
        unlocked: [],
        omitted: [],
      });

      then('it is empty rather than a row of undefined', () => {
        expect(entries).toEqual([]);
      });
    });
  });
});
