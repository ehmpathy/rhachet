import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { setupEnrollFixture } from '@/blackbox/.test/infra/enrollCloneHarness';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { findsertActorOndisk } from '@src/domain.operations/actor/enrolled/findsertActorOndisk';
import { genSampleCloneOndisk } from '@src/.test/assets/genSampleCloneOndisk';

/**
 * .what = `rhx clone list` against repos with no clone, no actor dir, or no `.agent/`
 * .note = split from `clone.acceptance.test.ts` so it runs on its own jest worker; the
 *   describe name is kept, so each snapshot key is the one it held before the split
 */
describe('rhx clone reach (acceptance)', () => {
  given('[case4] a linked repo with NO clones enrolled', () => {
    // the empty-state + invalid-actor negatives (uc.5) — no pty, no spawn: a plain
    // linked repo with an actors root but zero clones. cheap subprocess invocations
    // lock the two residual `clone list` variants a caller encounters
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-none' });
      setupEnrollFixture({ dir });
      return { dir, env: { PATH: process.env.PATH ?? '' } };
    });

    when('[t0] `clone list` on a repo with no clones', () => {
      const listed = useThen('the empty-state list renders', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'list'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 0 and shows an empty state (no clone rows)', () => {
        expect(listed.status).toEqual(0);
        // no clone rows — never a spurious LIVE/DEAD line for a repo with none
        expect(listed.stdout).not.toContain('state=LIVE');
        expect(listed.stdout).not.toContain('state=DEAD');
      });

      then('the empty clone-list format is locked (visual spot-check)', () => {
        // a repo with no clones is a fixed, token-free layout — locks the empty state
        // a caller sees, per rule.require.contract-snapshot-exhaustiveness
        expect(asSnapshotSafe(listed.stdout)).toMatchSnapshot();
      });

      then('the empty clone-list json machine shape is locked (catches a drifted shape)', () => {
        // the MACHINE counterpart of the empty tree — a consumer reads an empty
        // `actors` array, never a box-glyph, so the empty state has BOTH variants
        // snapped, a mirror of the actor-list empty json (uc.11)
        const listedJson = invokeRhachetCliBinary({
          args: ['clone', 'list', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(listedJson.status).toEqual(0);
        expect(listedJson.stdout).not.toContain('├─');
        const parsed = JSON.parse(listedJson.stdout) as { actors: unknown[] };
        expect(parsed.actors).toEqual([]);
        expect(asSnapshotSafe(listedJson.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] `clone list @<unknown-actor>` (an invalid actor scope)', () => {
      const listed = useThen('an unknown actor scope fails loud', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'list', '@deadbeef'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits non-zero and names the fix (no actor matches)', () => {
        expect(listed.status).not.toEqual(0);
        expect(listed.stderr.toLowerCase()).toMatch(/no.*actor|no match|deadbeef/);
      });

      then('the unknown-actor error format is locked (visual spot-check)', () => {
        // @deadbeef is a fixed literal prefix that matches no enrolled actor — the
        // error is token-free, so it locks the exact text a caller reads against drift
        expect(asSnapshotSafe(listed.stderr)).toMatchSnapshot();
      });

      then('the unknown-actor json error shape is locked (machine contract)', () => {
        // the MACHINE twin — a cron that scopes `clone list @<actor>` on an unknown
        // prefix must read the failure as a structured field, not scrape the tree
        const listedJson = invokeRhachetCliBinary({
          args: ['clone', 'list', '@deadbeef', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(listedJson.status).toEqual(2);
        const parsed = JSON.parse(listedJson.stderr) as {
          class: string;
          message: string;
        };
        expect(parsed.class).toEqual('ConstraintError');
        expect(parsed.message.toLowerCase()).toMatch(/no.*actor|deadbeef/);
        expect(asSnapshotSafe(listedJson.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] `clone whoami` with a STALE clone-serial env (names no on-disk clone)', () => {
      // the infra-fault branch of whoami: a process carries a clone serial in its env
      // (RHACHET_CLONE_SERIAL) — so it IS a clone — but that serial resolves to no clone
      // on disk (e.g. its record was reaped by `clone prune` while the process lived on).
      // this is a SERVER fault (a MalfunctionError, exit 1), distinct from t5b's caller
      // fault (no serial at all → a ConstraintError, exit 2) — so a self-managed clone is
      // never handed a fabricated identity for a serial that no longer exists
      const staleSerial = '00000000-0000-4000-8000-000000000000';
      const bad = useThen('whoami fails loud for a serial with no on-disk clone', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'whoami'],
          cwd: scene.dir,
          env: { ...scene.env, RHACHET_CLONE_SERIAL: staleSerial },
          logOnError: false,
        }),
      );

      then('it exits 1 (a server fault) and names the stale-serial cause', () => {
        expect(bad.status).toEqual(1);
        expect(bad.stderr.toLowerCase()).toContain('no on-disk clone');
      });

      then('the stale-serial whoami error format is locked (visual spot-check)', () => {
        // the message headline is token-free (the serial lives in metadata, masked by
        // asSnapshotSafe), so this locks the exact MalfunctionError text against drift
        expect(asSnapshotSafe(bad.stderr)).toMatchSnapshot();
      });

      then('the stale-serial whoami json error shape is locked (machine contract)', () => {
        // the MACHINE twin — a self-managed clone that reads whoami --output json must
        // read the infra fault as a parseable MalfunctionError, never scrape tree prose
        const badJson = invokeRhachetCliBinary({
          args: ['clone', 'whoami', '--output', 'json'],
          cwd: scene.dir,
          env: { ...scene.env, RHACHET_CLONE_SERIAL: staleSerial },
          logOnError: false,
        });
        expect(badJson.status).toEqual(1);
        const parsed = JSON.parse(badJson.stderr) as {
          class: string;
          message: string;
        };
        expect(parsed.class).toEqual('MalfunctionError');
        expect(parsed.message.toLowerCase()).toContain('no on-disk clone');
        expect(asSnapshotSafe(badJson.stderr)).toMatchSnapshot();
      });
    });

    when('[t3] `say --await <bad>` (the await-target guard)', () => {
      // the say-verb twin of t8c's --format guard: `--await` names the caller's target state
      // (enqueue | release), so a mistyped value must fail loud with the valid set named
      // (asCloneSayAwaitTarget), never a silent fallback to the default. it lives HERE, in the
      // no-clone scene, on purpose: the cast runs BEFORE any clone lookup or dispatch
      // (invokeCloneSay), so `@:driver` is never resolved and no message is ever written — which
      // is the STRONGEST demonstration of "cast before dispatch" (there is no clone to dispatch
      // to at all) AND lets the case snapshot locally, off the credentialed-enroll pty wall
      const bad = useThen('a malformed --await fails loud', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'say', '@:driver', '--what', 'hello', '--await', 'bogus'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 2 (a caller fault) and names the valid forms', () => {
        expect(bad.status).toEqual(2);
        expect(bad.stderr.toLowerCase()).toContain('--await');
        expect(bad.stderr).toMatch(/enqueue|release/i);
      });

      then('the bad-await error format is locked (visual spot-check)', () => {
        // --await bogus is a fixed literal, so no token needs a mask; locks the exact error a
        // caller reads against drift, the same discipline as t8c's bad --format
        expect(asSnapshotSafe(bad.stderr)).toMatchSnapshot();
      });
    });

    when('[t4] `say --await <bad> --output json` (the machine twin)', () => {
      // the json twin of t3 — a machine that selects a target state must read a malformed
      // value as a structured error field, never scrape the human tree
      const badJson = useThen('a malformed --await fails loud with a shape', () =>
        invokeRhachetCliBinary({
          args: [
            'clone',
            'say',
            '@:driver',
            '--what',
            'hello',
            '--await',
            'bogus',
            '--output',
            'json',
          ],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 2 (a caller fault) and the error is parseable', () => {
        expect(badJson.status).toEqual(2);
        const parsed = JSON.parse(badJson.stderr) as {
          class: string;
          message: string;
        };
        expect(parsed.class).toEqual('ConstraintError');
        expect(parsed.message.toLowerCase()).toContain('--await');
      });

      then('the bad-await json error shape is locked (machine contract)', () => {
        expect(asSnapshotSafe(badJson.stderr)).toMatchSnapshot();
      });
    });
  });

  // the actor-scoped-EMPTY variant — a VALID actor exists (its brain config + roles
  // log are on disk) but ZERO clones live under it. this is DISTINCT from case4 t0 (no
  // actors at all → zero groups) and case4 t1 (an UNKNOWN actor → fail loud): here the
  // actor IS resolved, so `clone list @<exid>` renders ONE actor header with NO clone
  // rows. a caller hits this after a prune reaps an actor's last clone (the actor dir
  // survives the reap), so the variant owes a locked snapshot per
  // rule.require.contract-snapshot-exhaustiveness
  given('[case6] a linked repo with an actor enrolled but NO clones under it', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-actor-empty' });
      setupEnrollFixture({ dir });
      // plant a valid actor with NO clone via the REAL op enroll uses — findsert the
      // actor dir (brain config + roles log), never a clone. the exid is deterministic
      // (genEnrollmentHash of {brain, roles}), so the scoped render locks stably
      const actor = await findsertActorOndisk({
        repoPath: dir,
        brain: 'claude',
        roles: ['mechanic'],
        delta: null,
        reason: null,
        logEnrollment: true,
      }, { repo: { ambient: { roles: [] } } });
      return {
        dir,
        exid: actor.exid,
        env: { PATH: process.env.PATH ?? '' },
      };
    });

    when('[t0] `clone list @<exid>` for an actor with no clones', () => {
      const listed = useThen('the actor-scoped empty list renders', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'list', `@${scene.exid}`],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it exits 0 and shows the actor header with NO clone rows', () => {
        expect(listed.status).toEqual(0);
        // the actor IS resolved (unlike case4 t1's fail-loud), so no error — but it has
        // no clones, so never a LIVE/DEAD/DEAF row under it
        expect(listed.stdout).not.toContain('state=LIVE');
        expect(listed.stdout).not.toContain('state=DEAD');
        expect(listed.stdout).not.toContain('state=DEAF');
      });

      then('the scoped (no clones) leaf names its fix, like every empty state', () => {
        // consistency with every other empty state (rule.require.errors-name-the-fix):
        // the scoped leaf names the SINGLE enroll move (the caller already named this
        // identity, so the unscoped `…or see identities` clause is redundant here)
        expect(listed.stdout).toContain('(no clones)');
        expect(listed.stdout).toContain('enroll one with `rhx enroll <brain>`');
        expect(listed.stdout).not.toContain('rhx actor list');
      });

      then('the actor-scoped empty format is locked (visual spot-check)', () => {
        // the actor exid is deterministic, so the one-header-no-rows layout is a fixed,
        // token-free shape — locks the exact variant a caller reads after a prune reaps
        // an actor's last clone, per rule.require.contract-snapshot-exhaustiveness
        expect(asSnapshotSafe(listed.stdout)).toMatchSnapshot();
      });

      then('the actor-scoped empty json machine shape is locked', () => {
        // the MACHINE twin — a cron that scopes `clone list @<actor>` on a reaped actor
        // reads ONE actor with an empty `clones` array, never a box-glyph
        const listedJson = invokeRhachetCliBinary({
          args: ['clone', 'list', `@${scene.exid}`, '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        expect(listedJson.status).toEqual(0);
        expect(listedJson.stdout).not.toContain('├─');
        const parsed = JSON.parse(listedJson.stdout) as {
          actors: { clones: unknown[] }[];
        };
        expect(parsed.actors).toHaveLength(1);
        expect(parsed.actors[0]!.clones).toEqual([]);
        expect(asSnapshotSafe(listedJson.stdout)).toMatchSnapshot();
      });
    });
  });

  // the UNSCOPED clone-less-actor-HIDE — the dogfood fix (a human hit a bare `clone list`
  // cluttered with actors whose clones were all reaped). an unscoped `clone list` shows
  // ONLY actors that own a clone; a clone-less actor is hidden here (it stays discoverable
  // via `rhx actor list`). born from a real prod bug, so it owes a blackbox clamp per
  // rule.require.acceptance.blackbox + rule.require.clamp-edge-cases — the unit
  // (asCloneListView.test case5) proves the render shape, this proves it end-to-end on the
  // real built cli, where a future refactor would otherwise silently reintroduce the clutter
  given(
    '[case7] UNSCOPED `clone list` with a MIX — one actor owns a clone, one is clone-less',
    () => {
      const scene = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'clone-list-mixed' });
        setupEnrollFixture({ dir });
        // actor A (roles=[mechanic]) OWNS a socketless clone → renders (DEAF: process alive,
        // no socket). planted via the SAME real ops enroll uses, so the tree stays faithful
        const owner = await genSampleCloneOndisk({
          repoPath: dir,
          roles: ['mechanic'],
          serial: 'aaaa1111-2222-3333-4444-555566667777',
          slug: null,
          socketEligible: false,
        });
        // actor B (roles=[architect]) is CLONE-LESS → findsert the actor dir, never a clone.
        // a DIFFERENT roleset → a DIFFERENT deterministic exid, so the two never collide
        const empty = await findsertActorOndisk({
          repoPath: dir,
          brain: 'claude',
          roles: ['architect'],
          delta: null,
          reason: null,
          logEnrollment: true,
        }, { repo: { ambient: { roles: [] } } });
        return {
          dir,
          ownerExid: owner.actorExid,
          emptyExid: empty.exid,
          env: { PATH: process.env.PATH ?? '' },
        };
      });

      when('[t0] a bare `clone list` is run', () => {
        const listed = useThen('the unscoped mixed list renders', () =>
          invokeRhachetCliBinary({
            args: ['clone', 'list'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          }),
        );

        then('it exits 0 and shows ONLY the actor that owns a clone', () => {
          expect(listed.status).toEqual(0);
          // the owner's exid header appears; the clone-less one`s does not
          expect(listed.stdout).toContain(scene.ownerExid);
          expect(listed.stdout).not.toContain(scene.emptyExid);
        });

        then(
          'the sole shown actor renders as the LAST `└─` branch, never a stray `├─`',
          () => {
            // the filter re-seats branch prefixes: the one survivor is last, so it must
            // render `└─`, never a `├─` that assumed a peer below it (the case5 unit
            // invariant, now proven at the cli grain against the real built binary)
            expect(listed.stdout).toContain(`└─ actor @${scene.ownerExid}`);
            expect(listed.stdout).not.toContain('├─ actor');
          },
        );

        then('the unscoped-mixed tree format is locked (visual regression)', () => {
          // the actor exids are deterministic (genEnrollmentHash of {brain, roles}); the
          // clone serial + since-time are masked by asSnapshotSafe — so the WHOLE layout
          // (which actor shows, which is hidden, the `└─` seat) is a stable, token-free lock
          expect(asSnapshotSafe(listed.stdout)).toMatchSnapshot();
        });

        then('json hides the clone-less actor too (tree ≡ json)', () => {
          // the MACHINE twin — a cron reads ONE actor (the owner), never the clone-less one
          const listedJson = invokeRhachetCliBinary({
            args: ['clone', 'list', '--output', 'json'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          expect(listedJson.status).toEqual(0);
          const parsed = JSON.parse(listedJson.stdout) as {
            actors: { exid: string }[];
          };
          expect(parsed.actors).toHaveLength(1);
          expect(parsed.actors[0]!.exid).toEqual(scene.ownerExid);
          expect(asSnapshotSafe(listedJson.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  // the all-clone-less UNSCOPED empty-state — enrolled actors exist, but the unscoped
  // filter hides EVERY one (none owns a clone), so the view degrades to a get-started
  // breadcrumb that names BOTH next moves: enroll a fresh clone, OR see the hidden
  // identities via `rhx actor list`. DISTINCT from case4`s zero-actor "(no actors enrolled
  // yet)" state — owed its own locked snapshot per rule.require.contract-snapshot-exhaustiveness
  given(
    '[case8] UNSCOPED `clone list` where EVERY enrolled actor is clone-less',
    () => {
      const scene = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'clone-list-all-empty' });
        setupEnrollFixture({ dir });
        // two clone-less actors, distinct rolesets → distinct hashes, zero clones between them
        await findsertActorOndisk({
          repoPath: dir,
          brain: 'claude',
          roles: ['mechanic'],
          delta: null,
          reason: null,
          logEnrollment: true,
        }, { repo: { ambient: { roles: [] } } });
        await findsertActorOndisk({
          repoPath: dir,
          brain: 'claude',
          roles: ['architect'],
          delta: null,
          reason: null,
          logEnrollment: true,
        }, { repo: { ambient: { roles: [] } } });
        return { dir, env: { PATH: process.env.PATH ?? '' } };
      });

      when('[t0] a bare `clone list` is run', () => {
        const listed = useThen('the all-empty unscoped list renders', () =>
          invokeRhachetCliBinary({
            args: ['clone', 'list'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          }),
        );

        then(
          'it exits 0 and shows the `(no clones)` empty-state that names BOTH fixes',
          () => {
            expect(listed.status).toEqual(0);
            expect(listed.stdout).toContain('(no clones)');
            expect(listed.stdout).toContain('rhx enroll');
            expect(listed.stdout).toContain('rhx actor list');
            // the filter hid every actor, so never a stray clone-state row
            expect(listed.stdout).not.toContain('state=');
          },
        );

        then(
          'the all-clone-less empty-state format is locked (visual spot-check)',
          () => {
            expect(asSnapshotSafe(listed.stdout)).toMatchSnapshot();
          },
        );

        then('json hides all clone-less actors too (tree ≡ json)', () => {
          const listedJson = invokeRhachetCliBinary({
            args: ['clone', 'list', '--output', 'json'],
            cwd: scene.dir,
            env: scene.env,
            logOnError: false,
          });
          expect(listedJson.status).toEqual(0);
          const parsed = JSON.parse(listedJson.stdout) as { actors: unknown[] };
          expect(parsed.actors).toEqual([]);
          expect(asSnapshotSafe(listedJson.stdout)).toMatchSnapshot();
        });
      });
    },
  );

  // the UNLINKED-repo path for `clone list` — the exact negative variant `actor list`
  // already locks (its case4), owed here too per rule.require.contract-snapshot-
  // exhaustiveness: a repo with NO .agent/ directory (never linked) must read DISTINCTLY
  // from a linked-but-empty repo. it degrades gracefully (a read never crashes) AND its
  // empty state names the link fix, never the enroll one — the same distinct-label
  // discipline as `actor list` (rule.forbid.snapshot-visual-blemishes)
  given('[case5] a repo with NO .agent/ directory (never linked)', () => {
    const scene = useBeforeAll(async () => {
      // a bare temp dir — deliberately NO setupEnrollFixture, so no .agent/ exists
      const dir = genTempDir({ slug: 'clone-list-unlinked' });
      return { dir, env: { PATH: process.env.PATH ?? '' } };
    });

    when('[t0] `clone list` in an unlinked repo (no .agent/)', () => {
      const listed = useThen('exits 0 (a read degrades gracefully)', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'list'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it does NOT crash — it shows the DISTINCT not-linked state + link fix', () => {
        // an absent .agent/ is not a fault for a read: it degrades to a labelled empty
        // state, never a stack trace. the label names the link fix (`rhx init --roles`),
        // NOT the enroll hint — an unlinked repo cannot enroll
        expect(listed.status).toEqual(0);
        expect(listed.stdout.toLowerCase()).toContain('repo not linked');
        expect(listed.stdout).toContain('rhx init --roles');
      });

      then('it does NOT show the linked-but-empty enroll state (a distinct label)', () => {
        // the unlinked repo must read DIFFERENTLY from a linked repo with no clones
        // (which says "no actors enrolled yet")
        expect(listed.stdout.toLowerCase()).not.toContain(
          'no actors enrolled yet',
        );
      });

      then('the unlinked-repo not-linked format is locked (visual spot-check)', () => {
        // the unlinked outcome is token-free; locks the exact experience a first-time
        // caller reads before any `rhachet roles link`
        expect(asSnapshotSafe(listed.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] `clone list --output json` in an unlinked repo (no .agent/)', () => {
      const listedJson = useThen('exits 0 (a read degrades gracefully)', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'list', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('the machine shape degrades to an empty actors array', () => {
        // the machine view does NOT distinguish unlinked from linked-but-empty — the
        // "(repo not linked)" label is a HUMAN-tree affordance only; both read
        // `{ "actors": [] }` to a machine. the parity of `actor list` (its case4 t1)
        expect(listedJson.status).toEqual(0);
        expect(listedJson.stdout).not.toContain('├─');
        const parsed = JSON.parse(listedJson.stdout) as { actors: unknown[] };
        expect(parsed.actors).toEqual([]);
      });

      then('the unlinked-repo clone-list json shape is locked (machine contract)', () => {
        expect(asSnapshotSafe(listedJson.stdout)).toMatchSnapshot();
      });
    });
  });

});
