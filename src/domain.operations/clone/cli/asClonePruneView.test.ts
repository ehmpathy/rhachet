import { given, then, when } from 'test-fns';

import { asClonePruneView, type ClonePruneRow } from './asClonePruneView';

// .note = spawnedAt is masked, never a raw stamp — the view treats it as an opaque
//   string, and a raw HH:MM:SS in a snapshot invites permadrift
const rowNamed: ClonePruneRow = {
  serial: '7f3a0000-0000-0000-0000-000000000000',
  slug: 'driver',
  spawnedAt: '__SPAWNED_AT_1__',
};
const rowBare: ClonePruneRow = {
  serial: '11110000-0000-0000-0000-000000000000',
  slug: null,
  spawnedAt: '__SPAWNED_AT_2__',
};

describe('asClonePruneView', () => {
  given('[case1] no prunable clones', () => {
    when('[t0] a plan view is built', () => {
      const view = asClonePruneView({ rows: [], mode: 'plan' });

      then('the empty-state line names there is naught to prune', () => {
        expect(view.tree).toContain('(no dead clones to prune)');
        expect(view.data.count).toEqual(0);
        expect(view.data.clones).toEqual([]);
      });

      then('the tree matches the snapshot', () => {
        expect(view.tree).toMatchSnapshot();
      });
    });
  });

  given('[case2] two prunable clones (a named + a bare)', () => {
    when('[t0] a PLAN view is built', () => {
      const view = asClonePruneView({
        rows: [rowNamed, rowBare],
        mode: 'plan',
      });

      then('the plan names the apply follow-up and the count', () => {
        expect(view.data.mode).toEqual('plan');
        expect(view.data.count).toEqual(2);
        expect(view.tree).toContain('--mode apply');

        /**
         * 🚨 the named clone shows its `@:slug`, the bare its `@:<SHORT serial>` — the
         *   same form `clone list` and `clone get` render
         *   (`rule.require.short-serial-for-unslugged-clones`).
         *
         * ⚠️ .the claim these rows used to make = *"the bare its @:full-serial"* and
         *   *"the full serial is always shown (copy-pasteable)"*. both were true of the
         *   code and false of the CONVENTION — the render's own docblock claimed it
         *   matched `list`, and `list` had shown 8 hex all along. the abbreviation is
         *   MORE copy-pasteable, not less: `getOneCloneByRef` resolves any hex body of
         *   4+ chars, so the short form reaches the clone and costs 28 fewer characters.
         */
        expect(view.tree).toContain('@:driver');
        expect(view.tree).toContain('@:11110000');
        expect(view.tree).toContain('serial=7f3a0000');

        // and the FULL serial stays out of the human tree entirely — it lives on the
        // machine twin (`view.data.clones`), which this row bounds
        expect(view.tree).not.toContain(rowBare.serial);
        expect(view.tree).not.toContain(rowNamed.serial);
      });

      then('the machine twin keeps the FULL serial, unabbreviated', () => {
        /**
         * 🚨 the paired positive to the negative above, and the row that makes the
         *   abbreviation safe to ship: a short serial written into a machine channel is
         *   a defect, never a courtesy — it makes the payload ambiguous where the whole
         *   point of a machine channel is that it is not.
         */
        expect(view.data.clones.map((clone) => clone.serial)).toEqual([
          rowNamed.serial,
          rowBare.serial,
        ]);
      });

      then('the plan tree matches the snapshot', () => {
        expect(view.tree).toMatchSnapshot();
      });
    });

    when('[t1] an APPLY view is built', () => {
      const view = asClonePruneView({
        rows: [rowNamed, rowBare],
        mode: 'apply',
      });

      then('the apply confirms what was pruned', () => {
        expect(view.data.mode).toEqual('apply');
        expect(view.tree).toContain('pruned: 2 dead clone(s)');
        expect(view.tree).not.toContain('--mode apply');
      });

      then('the apply tree matches the snapshot', () => {
        expect(view.tree).toMatchSnapshot();
      });
    });
  });
});
