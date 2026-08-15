import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import {
  enrollCloneAndWaitReady,
  setupEnrollFixture,
  setupRichStubBrainPath,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = blackbox acceptance for `rhx actor list` — the identity read (WHO is
 *   enrolled), distinct from `clone list` (the run read)
 * .why =
 *   - usecase.5: a caller discovers the identities on disk before it reaches a clone
 *   - an empty state must name the get-started move (never a dead end); a populated
 *     state must show the hash actor (enroll is hash-only — never a slug actor)
 *   - `--output json` carries the machine shape a cron/supervisor reads
 */
describe('rhx actor list (acceptance)', () => {
  given('[case1] a linked repo with NO actors enrolled', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'actor-list-empty' });
      setupEnrollFixture({ dir });
      return { dir };
    });

    when('[t0] `actor list` on the empty repo', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['actor', 'list'],
          cwd: scene.dir,
          logOnError: false,
        }),
      );

      then('the empty state names the get-started move', () => {
        expect(run.status).toEqual(0);
        expect(run.stdout.toLowerCase()).toContain('no actors enrolled yet');
        expect(run.stdout).toContain('rhx enroll');
      });

      then('the empty-state format is locked (visual spot-check)', () => {
        expect(asSnapshotSafe(run.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] `actor list --output json` on the empty repo', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['actor', 'list', '--output', 'json'],
          cwd: scene.dir,
          logOnError: false,
        }),
      );

      then('the machine shape is an empty actors array', () => {
        expect(run.status).toEqual(0);
        const parsed = JSON.parse(run.stdout) as { actors: unknown[] };
        expect(parsed.actors).toEqual([]);
      });

      then('the empty-actors json shape is locked (catches a drifted shape)', () => {
        // pair the field assert with a snapshot per rule.require.snapshots — the
        // empty-repo json has no volatile token, so it locks the exact machine shape
        expect(asSnapshotSafe(run.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case2] a linked repo with ONE actor enrolled', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'actor-list-one' });
      const configDir = genTempDir({ slug: 'actor-list-one-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };
      const { bg } = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:driver',
      });
      return { dir, env, bg };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] `actor list` after an enroll', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['actor', 'list'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('the enrolled hash actor appears with its brain + roles', () => {
        expect(run.status).toEqual(0);
        expect(run.stdout).toContain('brain=claude');
        // the roleset the fixture links (each present, order-independent)
        expect(run.stdout).toContain('driver');
        expect(run.stdout).toContain('mechanic');
        expect(run.stdout).toContain('architect');
      });

      then('the populated-actor format is locked (visual spot-check)', () => {
        // the hash is deterministic, roles render sorted — so the masked tree is
        // stable; this locks the column layout + labels against silent drift
        expect(asSnapshotSafe(run.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] `actor list --output json` after an enroll', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['actor', 'list', '--output', 'json'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('the machine shape carries the full hash + brain + roles', () => {
        expect(run.status).toEqual(0);
        const parsed = JSON.parse(run.stdout) as {
          actors: { hash: string; brain: string; roles: string[] }[];
        };
        expect(parsed.actors).toHaveLength(1);
        const actor = parsed.actors[0]!;
        // the full hash (not the abbreviated human form) is machine-reachable
        expect(actor.hash.length).toBeGreaterThan(7);
        expect(actor.brain).toEqual('claude');
        expect(actor.roles).toEqual(
          expect.arrayContaining(['driver', 'mechanic', 'architect']),
        );
      });

      then('the one-actor json shape is locked (catches a drifted shape)', () => {
        // pair the field asserts with a snapshot per rule.require.snapshots — the
        // actor hash is deterministic (content-addressed, unmasked); the repoPath is
        // the run's temp dir (machine-specific), so it is masked, and the rest of the
        // machine shape (hash + brain + roles + key-set) locks against drift
        const masked = asSnapshotSafe(run.stdout).replace(
          /("repoPath":\s*")[^"]*"/g,
          '$1__REPO__"',
        );
        expect(masked).toMatchSnapshot();
      });
    });
  });

  // the NEGATIVE / EDGE path — every user-faced contract owes exhaustive snapshot
  // coverage across positive AND negative variants (rule.require.contract-snapshot-
  // exhaustiveness). the empty + one-actor cases above are the positive paths; this
  // is the edge: an unknown `--output` mode must fail loud with an error that states
  // the fix.
  given('[case3] an invalid --output mode', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'actor-list-bad-output' });
      setupEnrollFixture({ dir });
      return { dir };
    });

    when('[t0] `actor list --output xml` (an unsupported mode)', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['actor', 'list', '--output', 'xml'],
          cwd: scene.dir,
          logOnError: false,
        }),
      );

      then('it fails loud and states the fix (the valid modes)', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).toContain('unknown --output mode');
        expect(run.stderr).toContain('xml');
        // the fix states the two valid modes so the caller recovers
        expect(run.stderr).toContain('tree');
        expect(run.stderr).toContain('json');
      });

      then('the edge-case error output is locked to a snapshot', () => {
        // pair the functional assert with a snapshot so the negative-path caller
        // experience is drift-locked, exactly like the positive paths above
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  // the UNLINKED-repo path — a first-time caller who never ran `rhachet roles link`,
  // so there is NO .agent/ directory at all. `actor list` is a READ, so it must
  // degrade gracefully (the pit of success): it never crashes on the absent dir. AND
  // its empty state is labelled DISTINCTLY from a linked-but-empty repo — "(repo not
  // linked)" names the link fix, never the enroll one (which would itself fail on an
  // unlinked repo). the same distinct-label discipline the enroll fail-loud enforces
  // (rule.forbid.snapshot-visual-blemishes + rule.require.contract-snapshot-exhaustiveness)
  given('[case4] a repo with NO .agent/ directory (never linked)', () => {
    const scene = useBeforeAll(async () => {
      // a bare temp dir — deliberately NO setupEnrollFixture, so no .agent/ exists
      const dir = genTempDir({ slug: 'actor-list-unlinked' });
      return { dir };
    });

    when('[t0] `actor list` in an unlinked repo (no .agent/)', () => {
      const run = useThen('exits 0 (a read degrades gracefully)', () =>
        invokeRhachetCliBinary({
          args: ['actor', 'list'],
          cwd: scene.dir,
          logOnError: false,
        }),
      );

      then('it does NOT crash — it shows the DISTINCT not-linked state + link fix', () => {
        // an absent .agent/ is not a fault for a read: it degrades to a labelled
        // empty state, never a stack trace. the label is "(repo not linked)" and the
        // fix is `rhx init --roles`, NOT the enroll hint — to send an unlinked repo to
        // `rhx enroll` would lead the human into a wall
        expect(run.status).toEqual(0);
        expect(run.stdout.toLowerCase()).toContain('repo not linked');
        expect(run.stdout).toContain('rhx init --roles');
      });

      then('it does NOT show the linked-but-empty enroll state (a distinct label)', () => {
        // the whole point: the unlinked repo must read DIFFERENTLY from a linked repo
        // with no actors enrolled (which says "no actors enrolled yet")
        expect(run.stdout.toLowerCase()).not.toContain('no actors enrolled yet');
      });

      then('the unlinked-repo not-linked format is locked (visual spot-check)', () => {
        // the unlinked outcome is token-free; it locks the exact experience a
        // first-time caller reads before any `rhachet roles link`
        expect(asSnapshotSafe(run.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] `actor list --output json` in an unlinked repo (no .agent/)', () => {
      const run = useThen('exits 0 (a read degrades gracefully)', () =>
        invokeRhachetCliBinary({
          args: ['actor', 'list', '--output', 'json'],
          cwd: scene.dir,
          logOnError: false,
        }),
      );

      then('the machine shape degrades to an empty actors array', () => {
        // the machine view does NOT distinguish unlinked from linked-but-empty —
        // the "(repo not linked)" label is a HUMAN-tree affordance only; both read
        // `{ "actors": [] }` to a machine. the lock states that contract: a cron
        // that scopes on `actors.length === 0` behaves the same on either repo
        expect(run.status).toEqual(0);
        const parsed = JSON.parse(run.stdout) as { actors: unknown[] };
        expect(parsed.actors).toEqual([]);
      });

      then('the unlinked-repo json shape is locked (machine contract)', () => {
        expect(asSnapshotSafe(run.stdout)).toMatchSnapshot();
      });
    });
  });

  // the SERVER-FAULT path — a corrupt actor.json on disk is the ONE `actor list`
  // error reachable under a valid `--output json` (the invalid-`--output` error
  // renders tree by construction, since the flag that selects json is what is
  // malformed). getAllActorsOndisk fails LOUD on an unparseable manifest
  // (MalfunctionError, exit 1) rather than hide the corruption, so a machine
  // consumer must be able to branch on the structured error — its json shape owes
  // a snapshot per rule.require.contract-snapshot-exhaustiveness, paired with the
  // human tree twin
  given('[case5] a corrupt actor manifest on disk (server fault)', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'actor-list-corrupt' });
      setupEnrollFixture({ dir });
      // plant an anonymous-actor dir whose actor.json is NOT valid json — the
      // fail-loud path getAllActorsOndisk takes on a real corruption
      const actorDir = join(dir, '.agent', '.actors', 'actor.via.hash=deadbeefdeadbeef');
      mkdirSync(actorDir, { recursive: true });
      writeFileSync(join(actorDir, 'actor.json'), '{ not valid json', 'utf8');
      return { dir };
    });

    when('[t0] `actor list` on the corrupt repo (tree)', () => {
      const run = useThen('exits non-zero (a corruption fails loud)', () =>
        invokeRhachetCliBinary({
          args: ['actor', 'list'],
          cwd: scene.dir,
          logOnError: false,
        }),
      );

      then('it fails loud and names the corrupt manifest', () => {
        expect(run.status).toEqual(1);
        expect(run.stderr).toContain('corrupt');
        expect(run.stderr).toContain('not valid JSON');
      });

      then('the corrupt-manifest tree error is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] `actor list --output json` on the corrupt repo (machine)', () => {
      const run = useThen('exits non-zero (a corruption fails loud)', () =>
        invokeRhachetCliBinary({
          args: ['actor', 'list', '--output', 'json'],
          cwd: scene.dir,
          logOnError: false,
        }),
      );

      then('the machine error is a structured MalfunctionError (exit 1)', () => {
        expect(run.status).toEqual(1);
        const parsed = JSON.parse(run.stderr) as {
          class: string;
          message: string;
        };
        // a server fault (not a caller fault) → MalfunctionError, so a supervisor
        // branches on the class field, never on stderr prose
        expect(parsed.class).toEqual('MalfunctionError');
        expect(parsed.message).toContain('corrupt');
      });

      then('the corrupt-manifest json error shape is locked (machine contract)', () => {
        // the rendered json carries {class, message} only (no machine-specific path),
        // so it is deterministic — the json twin of the tree error above, the last
        // `actor list` output variant per rule.require.contract-snapshot-exhaustiveness
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });
});
