import { given, then, when } from 'test-fns';

import { ActorOndisk } from '@src/domain.objects/ActorOndisk';

import { asActorListView } from './asActorListView';

describe('asActorListView', () => {
  given('[case1] no enrolled actors on a LINKED repo', () => {
    when('[t0] the view is built with linked=true', () => {
      const view = asActorListView({ actors: [], linked: true });

      then('the tree names the enroll get-started move', () => {
        expect(view.tree).toContain('no actors enrolled yet');
        expect(view.tree).toContain('rhx enroll');
      });

      then('the data carries an empty actors list', () => {
        expect(view.data.actors).toEqual([]);
      });
    });
  });

  given('[case1b] no enrolled actors on a NEVER-linked repo', () => {
    when('[t0] the view is built with linked=false', () => {
      const view = asActorListView({ actors: [], linked: false });

      then('the tree names the DISTINCT link fix, not the enroll one', () => {
        expect(view.tree).toContain('repo not linked');
        expect(view.tree).toContain('rhx init --roles');
      });

      then('the tree omits the inaccurate enroll empty-state', () => {
        expect(view.tree).not.toContain('no actors enrolled yet');
      });

      then('the data still carries an empty actors list', () => {
        expect(view.data.actors).toEqual([]);
      });
    });
  });

  given('[case2] two enrolled actors', () => {
    const actors = [
      new ActorOndisk({
        repoPath: '/repo',
        hash: 'aaaa1111',
        brain: 'claude',
        roles: ['mechanic'],
      }),
      new ActorOndisk({
        repoPath: '/repo',
        hash: 'bbbb2222',
        brain: 'codex',
        roles: ['architect', 'driver'],
      }),
    ];

    when('[t0] the view is built', () => {
      const view = asActorListView({ actors, linked: true });

      then('the tree names each actor with brain + roles', () => {
        expect(view.tree).toContain('brain=claude');
        expect(view.tree).toContain('roles=architect,driver');
      });

      then('the tree abbreviates the hash', () => {
        expect(view.tree).toContain('@aaaa111…');
      });

      then('the data carries the FULL hash a machine reaches by', () => {
        expect(view.data.actors[0]!.hash).toEqual('aaaa1111');
      });

      then('the rendered tree matches the snapshot (visual regression)', () => {
        // pins the WHOLE two-actor layout — the `├─`/`└─` branch prefixes, the
        // abbreviated `@<hash>…` address, the sorted roles, the brain — so a glyph
        // or alignment drift a per-field assert would miss surfaces in review
        // (rule.require.snapshots). the inputs are hardcoded, so this is stable
        expect(view.tree).toMatchSnapshot();
      });
    });
  });
});
