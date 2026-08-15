import { given, then, when } from 'test-fns';

import { asCloneRef } from '../asCloneRef';
import { asCloneListView, type CloneListGroup } from './asCloneListView';

describe('asCloneListView', () => {
  given('[case1] no actors enrolled on a LINKED repo', () => {
    when('[t0] the view is built with linked=true', () => {
      const view = asCloneListView({ groups: [], linked: true, scoped: false });

      then('the tree names the enroll get-started move', () => {
        expect(view.tree).toContain('no actors enrolled yet');
        expect(view.tree).toContain('rhx enroll');
      });
    });
  });

  given('[case1b] no actors enrolled on a NEVER-linked repo', () => {
    when('[t0] the view is built with linked=false', () => {
      const view = asCloneListView({
        groups: [],
        linked: false,
        scoped: false,
      });

      then('the tree names the DISTINCT link fix, not the enroll one', () => {
        expect(view.tree).toContain('repo not linked');
        expect(view.tree).toContain('rhx init --roles');
      });

      then('the tree omits the inaccurate enroll empty-state', () => {
        expect(view.tree).not.toContain('no actors enrolled yet');
      });
    });
  });

  given(
    '[case2] one actor with a named LIVE clone and an unnamed DEAD clone',
    () => {
      const groups: CloneListGroup[] = [
        {
          hash: '9c1e0000',
          brain: 'claude',
          roles: ['mechanic'],
          clones: [
            {
              serial: '7f3a1111-2222-3333-4444-555566667777',
              slug: 'driver',
              reachState: 'LIVE',
              // .note = masked, never a raw stamp — the view treats spawnedAt as an
              //   opaque string, and a raw HH:MM:SS in a snapshot invites permadrift
              spawnedAt: '__SPAWNED_AT_1__',
            },
            {
              serial: 'abcd8888-9999-aaaa-bbbb-ccccddddeeee',
              slug: null,
              reachState: 'DEAD',
              spawnedAt: '__SPAWNED_AT_2__',
            },
          ],
        },
      ];

      when('[t0] the view is built', () => {
        const view = asCloneListView({ groups, linked: true, scoped: false });

        then('the named clone shows its @:slug address + LIVE state', () => {
          expect(view.tree).toContain('@:driver');
          expect(view.tree).toContain('state=LIVE');
        });

        then(
          'the named clone shows its serial abbreviated to the human form',
          () => {
            // the serial= field is the human short form (asCloneSerialHuman), like the
            // address — the FULL serial stays in --output json (asserted below)
            expect(view.tree).toContain('serial=7f3a1111');
            expect(view.tree).not.toContain(
              'serial=7f3a1111-2222-3333-4444-555566667777',
            );
          },
        );

        then(
          'the unnamed clone is addressed by its SHORT serial (a reachable address)',
          () => {
            // the short address (asCloneSerialHuman) is reachable via the git-style
            // serial-prefix match in getOneCloneByRef — the full uuid is not forced on
            // a human. the full form does NOT appear in the tree (json keeps it)
            expect(view.tree).toContain('@:abcd8888');
            expect(view.tree).not.toContain(
              '@:abcd8888-9999-aaaa-bbbb-ccccddddeeee',
            );
            expect(view.tree).toContain('state=DEAD');
          },
        );

        then(
          'the short address parses as a slug ref, matched to the serial by prefix-reach',
          () => {
            // asCloneSerialHuman is not uuid-shaped, so asCloneRef reads it as a slug;
            // getOneCloneByRef then falls back to a git-style serial-prefix match (a
            // named slug always wins first). the full reach round-trip is clamped in
            // getOneCloneByRef.integration
            expect(asCloneRef({ raw: '@:abcd8888' })).toEqual({
              by: 'slug',
              slug: 'abcd8888',
            });
            // and it is a genuine prefix of the full serial, so the prefix-match hits
            expect(
              'abcd8888-9999-aaaa-bbbb-ccccddddeeee'.startsWith('abcd8888'),
            ).toBe(true);
          },
        );

        then(
          'a DEAD clone present earns a prune tip that names the fix',
          () => {
            // this case has an unnamed DEAD clone, so the output names `rhx clone prune`
            // as the next action (rule.require.errors-name-the-fix / status-feedback)
            expect(view.tree).toContain('rhx clone prune');
          },
        );

        then('the data carries the full serials a machine reaches by', () => {
          expect(view.data.actors[0]!.clones[0]!.serial).toEqual(
            '7f3a1111-2222-3333-4444-555566667777',
          );
        });

        then(
          'the rendered tree matches the snapshot (visual regression)',
          () => {
            // a snapshot alongside the .toContain asserts pins the WHOLE layout —
            // glyphs, indent, field order, the tip blank-line break — so an alignment
            // or label drift a per-field assert would miss surfaces in review
            // (rule.require.snapshots). the inputs are hardcoded, so this is stable
            expect(view.tree).toMatchSnapshot();
          },
        );
      });
    },
  );

  given(
    '[case4] TWO actors — a sorted multi-role actor with a DEAF clone, and a second actor',
    () => {
      // exercises the group branch prefixes (a non-last actor renders `├─` + a `│`
      // row indent, the last renders `└─` + a plain indent), the role SORT in the
      // header (given out of order, rendered sorted), and the third state DEAF
      const groups: CloneListGroup[] = [
        {
          hash: 'aaaa0000',
          brain: 'claude',
          // given OUT of canonical order — the view must render them sorted, to mirror
          // the sorted roleset the identity hash derives from
          roles: ['mechanic', 'architect'],
          clones: [
            {
              serial: '11110000-0000-0000-0000-000000000000',
              slug: null,
              reachState: 'DEAF',
              spawnedAt: '__SPAWNED_AT_1__',
            },
          ],
        },
        {
          hash: 'bbbb0000',
          brain: 'claude',
          roles: ['driver'],
          clones: [
            {
              serial: '22220000-0000-0000-0000-000000000000',
              slug: 'foreman',
              reachState: 'LIVE',
              spawnedAt: '__SPAWNED_AT_2__',
            },
          ],
        },
      ];

      when('[t0] the view is built', () => {
        const view = asCloneListView({ groups, linked: true, scoped: false });

        then('the first actor renders a non-last `├─` branch', () => {
          expect(view.tree).toContain('├─ actor aaaa000');
        });

        then('the last actor renders a `└─` branch', () => {
          expect(view.tree).toContain('└─ actor bbbb000');
        });

        then('the multi-role header is rendered SORTED', () => {
          expect(view.tree).toContain('roles=architect,mechanic');
        });

        then('the DEAF clone shows that state', () => {
          expect(view.tree).toContain('state=DEAF');
        });

        then('no prune tip appears when NO clone is DEAD', () => {
          // this case has only LIVE + DEAF clones — the prune tip is a DEAD-only
          // advisory, so it must NOT fire here (the conditional is exhaustively clamped
          // against case2, which DOES have a DEAD clone and DOES show the tip)
          expect(view.tree).not.toContain('rhx clone prune');
        });

        then(
          'the rendered tree matches the snapshot (visual regression)',
          () => {
            expect(view.tree).toMatchSnapshot();
          },
        );
      });
    },
  );

  given('[case3] an actor with no clones', () => {
    const groups: CloneListGroup[] = [
      {
        hash: 'ffff0000',
        brain: 'claude',
        roles: ['mechanic'],
        clones: [],
      },
    ];

    when('[t0] SCOPED — `clone list @<actor>` names THIS actor', () => {
      // the caller asked for this one actor by hash; its empty state IS the answer,
      // so it is kept and shown with a (no clones) leaf (the `clone list @<hash>` case)
      const view = asCloneListView({ groups, linked: true, scoped: true });

      then('the named actor appears with a (no clones) leaf', () => {
        expect(view.tree).toContain('ffff000');
        expect(view.tree).toContain('(no clones)');
      });

      then(
        'the scoped (no clones) leaf names its fix, like every empty state',
        () => {
          // every empty state this view produces names the next move
          // (rule.require.errors-name-the-fix); the scoped leaf is no exception. it uses
          // the SINGLE enroll move — NOT the unscoped two-part `…or see identities with
          // rhx actor list` — because the caller already named this identity by hash
          expect(view.tree).toContain('enroll one with `rhx enroll <brain>`');
          expect(view.tree).not.toContain('rhx actor list');
        },
      );

      then('json carries the scoped actor with an empty clones array', () => {
        // scoped keeps the actor in the machine shape too (tree ≡ json)
        expect(view.data.actors).toHaveLength(1);
        expect(view.data.actors[0]!.clones).toEqual([]);
      });
    });

    when('[t0] UNSCOPED — a bare `clone list`', () => {
      // a clone-less actor is noise in the CLONE list — it has no clone to show, so
      // it is hidden here (it stays visible via `rhx actor list`)
      const view = asCloneListView({ groups, linked: true, scoped: false });

      then(
        'the clone-less actor is HIDDEN, not shown as a (no clones) row',
        () => {
          expect(view.tree).not.toContain('ffff000');
          expect(view.tree).not.toContain('roles=mechanic');
        },
      );

      then(
        'the empty state names both the enroll AND the actor-list fix',
        () => {
          expect(view.tree).toContain('(no clones)');
          expect(view.tree).toContain('rhx enroll');
          expect(view.tree).toContain('rhx actor list');
        },
      );

      then('json hides the clone-less actor too (tree ≡ json)', () => {
        expect(view.data.actors).toEqual([]);
      });
    });
  });

  given(
    '[case5] UNSCOPED with a MIX — one actor with a clone, two clone-less (the dogfood scenario)',
    () => {
      // the exact real-repo shape a human hit: a live clone under one actor, plus
      // stale clone-less actors whose clones were all reaped. the bare list must show
      // ONLY the actor that owns a clone, never the empty ones (rule.require.clamp-edge-cases)
      const groups: CloneListGroup[] = [
        {
          hash: 'dead0000',
          brain: 'claude',
          roles: ['behaver', 'mechanic'],
          clones: [],
        },
        {
          hash: 'live0000',
          brain: 'claude',
          roles: ['driver'],
          clones: [
            {
              serial: '33330000-0000-0000-0000-000000000000',
              slug: 'runner',
              reachState: 'LIVE',
              spawnedAt: '__SPAWNED_AT_1__',
            },
          ],
        },
        {
          hash: 'gone0000',
          brain: 'claude',
          roles: ['reviewer'],
          clones: [],
        },
      ];

      when('[t0] a bare `clone list` is rendered', () => {
        const view = asCloneListView({ groups, linked: true, scoped: false });

        then('ONLY the actor that owns a clone renders', () => {
          // the header abbreviates the hash to 7 chars (`live000…`); the FULL hash
          // lives in json (asserted below)
          expect(view.tree).toContain('live000');
          expect(view.tree).toContain('@:runner');
        });

        then('the two clone-less actors are hidden from tree AND json', () => {
          expect(view.tree).not.toContain('dead000');
          expect(view.tree).not.toContain('gone000');
          expect(view.data.actors).toHaveLength(1);
          expect(view.data.actors[0]!.hash).toEqual('live0000');
        });

        then('the sole shown actor renders as the LAST `└─` branch', () => {
          // the filter re-seats branch prefixes — the one survivor is last, so it must
          // render `└─`, never a stray `├─` that assumed a peer below it
          expect(view.tree).toContain('└─ actor live000');
          expect(view.tree).not.toContain('├─ actor');
        });

        then(
          'the rendered tree matches the snapshot (visual regression)',
          () => {
            // pairs the per-field `toContain`/`not.toContain` asserts with a full-tree
            // pin (as case2/case4 do) — the WHOLE filtered layout (which actor shows,
            // which two are dropped, the re-seated `└─`) is locked, so a drift a per-field
            // assert would miss surfaces in review (rule.require.snapshots). inputs are
            // hardcoded, so this is stable
            expect(view.tree).toMatchSnapshot();
          },
        );
      });
    },
  );
});
