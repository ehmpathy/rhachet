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
        // the named clone shows its @:slug, the bare its @:full-serial
        expect(view.tree).toContain('@:driver');
        expect(view.tree).toContain(`@:${rowBare.serial}`);
        // the full serial is always shown (copy-pasteable)
        expect(view.tree).toContain(`serial=${rowNamed.serial}`);
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
