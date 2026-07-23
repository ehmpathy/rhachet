import { existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';

import { genTempDir, given, then, useThen, when } from 'test-fns';

import { asSummaryBlock } from '@/blackbox/.test/infra/asSummaryBlock';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import {
  isRoleLinked,
  setupRoleFixtureRepo,
} from '@/blackbox/.test/infra/roleFixtureRepo';

/**
 * .what = slices the `--roles` option help lines out of `init --help` stdout
 * .why = the incremental `+role`/`-role` syntax is documented on the --roles
 *        option; a snapshot of only its help block locks that discoverability
 *        contract without a link to unrelated options' help text
 *
 * .note = a piped subprocess has no tty, so commander wraps at a fixed 80 cols,
 *   so this block stays deterministic to snapshot
 */
const asRolesHelpBlock = (input: { stdout: string }): string => {
  const lines = input.stdout.split('\n');
  const start = lines.findIndex((line) => line.includes('--roles <roles...>'));
  if (start === -1) return input.stdout;
  const rest = lines.slice(start + 1);
  const nextOption = rest.findIndex((line) => /^\s+--\w/.test(line));
  const end = nextOption === -1 ? rest.length : nextOption;
  return [lines[start], ...rest.slice(0, end)].join('\n');
};

describe('rhx init --roles incremental (acceptance)', () => {
  given('[case1] an empty repo, absolute form (e16 no regression)', () => {
    const testDir = genTempDir({ slug: 'init-abs' });
    beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

    when('[t0] `init --roles mechanic behaver`', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'mechanic', 'behaver'],
          cwd: testDir,
        }),
      );
      then('both roles are linked', () => {
        expect(run.status).toEqual(0);
        expect(isRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(true);
        expect(isRoleLinked({ dir: testDir, role: 'behaver' })).toEqual(true);
      });

      then(
        'the absolute-form stdout tree reports the linked roles (e16)',
        () => {
          // the raw absolute-form stdout embeds volatile parts (a timestamped
          // backup filename, the package's abs node_modules path + version, and
          // brief/skill counts), so a verbatim snapshot would be flaky. assert on
          // the stable structural lines instead.
          expect(run.stdout).toContain('🔧 init 2 role(s)');
          expect(run.stdout).toContain('link role repo=ehmpathy/role=mechanic');
          expect(run.stdout).toContain('link role repo=bhuild/role=behaver');
          expect(run.stdout).toContain('2 role(s) linked');
          expect(run.stdout).toContain('2 role(s) initialized');
        },
      );
    });
  });

  given('[case2] a repo with mechanic linked', () => {
    const testDir = genTempDir({ slug: 'init-add' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'mechanic'],
        cwd: testDir,
      });
    });

    when('[t0] `init --roles +architect` (e1 add, keep rest)', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+architect'],
          cwd: testDir,
        }),
      );
      then('architect is added and mechanic is untouched', () => {
        expect(run.status).toEqual(0);
        expect(isRoleLinked({ dir: testDir, role: 'architect' })).toEqual(true);
        expect(isRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(true);
      });

      then('the incremental summary tree matches snapshot', () => {
        expect(asSummaryBlock({ stdout: run.stdout, dir: testDir })).toMatchSnapshot();
      });
    });
  });

  given('[case3] a repo with mechanic + architect linked', () => {
    const testDir = genTempDir({ slug: 'init-remove' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'mechanic', 'architect'],
        cwd: testDir,
      });
    });

    when('[t0] `init --roles -architect` (remove, keep rest)', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '-architect'],
          cwd: testDir,
        }),
      );
      then('architect is removed and mechanic is untouched', () => {
        expect(run.status).toEqual(0);
        expect(isRoleLinked({ dir: testDir, role: 'architect' })).toEqual(
          false,
        );
        expect(isRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(true);
      });

      then('the incremental summary tree matches snapshot', () => {
        // a remove-only call prints only the deterministic incremental tree
        // (no link/init path output), so stdout is stable to snapshot
        const masked = run.stdout.split(testDir).join('$TESTDIR');
        expect(masked).toContain('🔧 init roles (incremental)');
        expect(masked).toContain('subtractions');
        expect(masked).toContain('- ehmpathy/architect');
        expect(masked).toContain('untouched (1)');
        // snapshot the sliced summary block (from the 🔧 marker) so every tree
        // snapshot starts at 🔧 — no head-newline asymmetry vs the add-path
        // cases that slice via asSummaryBlock
        expect(
          asSummaryBlock({ stdout: run.stdout, dir: testDir }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case4] add and remove in one call', () => {
    const testDir = genTempDir({ slug: 'init-addremove' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'mechanic', 'reviewer'],
        cwd: testDir,
      });
    });

    when('[t0] `init --roles +architect -reviewer`', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+architect', '-reviewer'],
          cwd: testDir,
        }),
      );
      then('architect added, reviewer removed, mechanic kept', () => {
        expect(run.status).toEqual(0);
        expect(isRoleLinked({ dir: testDir, role: 'architect' })).toEqual(true);
        expect(isRoleLinked({ dir: testDir, role: 'reviewer' })).toEqual(false);
        expect(isRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(true);
      });

      then('the incremental summary tree matches snapshot', () => {
        expect(asSummaryBlock({ stdout: run.stdout, dir: testDir })).toMatchSnapshot();
      });
    });
  });

  given('[case5] mixed absolute + incremental call (e3)', () => {
    const testDir = genTempDir({ slug: 'init-mixed' });
    beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

    when('[t0] `init --roles mechanic +architect`', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'mechanic', '+architect'],
          cwd: testDir,
          logOnError: false,
        }),
      );
      then('is rejected with a mixed-call message', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).toContain('cannot mix');
        // snapshot the exact error text so a reword is caught in review
        expect(run.stderr.split(testDir).join('$TESTDIR')).toMatchSnapshot();
      });
    });
  });

  given('[case6] contradictory `+x -x` (e7)', () => {
    const testDir = genTempDir({ slug: 'init-conflict' });
    beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

    when('[t0] `init --roles +architect -architect`', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+architect', '-architect'],
          cwd: testDir,
          logOnError: false,
        }),
      );
      then('is rejected as contradictory', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).toContain('both add and remove');
        expect(run.stderr.split(testDir).join('$TESTDIR')).toMatchSnapshot();
      });
    });
  });

  given('[case7] unknown role add (e5)', () => {
    const testDir = genTempDir({ slug: 'init-unknown' });
    beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

    when('[t0] `init --roles +nonesuch`', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+nonesuch'],
          cwd: testDir,
          logOnError: false,
        }),
      );
      then('is rejected with a not-found error', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr.toLowerCase()).toContain('not found');
      });

      then('stderr surfaces the available roles as a hint', () => {
        // the not-found error carries availableRoles metadata (qualified slugs),
        // which HelpfulError serializes into the message that reaches stderr
        expect(run.stderr).toContain('availableRoles');
        expect(run.stderr).toContain('architect');
      });

      then('the not-found error message matches snapshot', () => {
        // snapshot the full error block (message + metadata + [args]) so the
        // format stays consistent with the other error snapshots. the
        // availableRoles list is version-fragile (it grows as packages add
        // roles), so redact its contents to a stable token while the rest of
        // the block stays deterministic
        const masked = run.stderr
          .split(testDir)
          .join('$TESTDIR')
          .replace(
            /("availableRoles":\s*)\[[\s\S]*?\]/,
            '$1[ "$AVAILABLE_ROLES" ]',
          );
        expect(masked).toMatchSnapshot();
      });
    });
  });

  given('[case8] qualified incremental add (e10)', () => {
    const testDir = genTempDir({ slug: 'init-qualified' });
    beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

    when('[t0] `init --roles +ehmpathy/architect`', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+ehmpathy/architect'],
          cwd: testDir,
        }),
      );
      then('links role=architect under repo=ehmpathy', () => {
        expect(run.status).toEqual(0);
        expect(
          existsSync(
            resolve(testDir, '.agent', 'repo=ehmpathy', 'role=architect'),
          ),
        ).toEqual(true);
      });

      then('the incremental summary tree matches snapshot', () => {
        expect(asSummaryBlock({ stdout: run.stdout, dir: testDir })).toMatchSnapshot();
      });
    });
  });

  given('[case9] bare remove sigil with no role (e9)', () => {
    const testDir = genTempDir({ slug: 'init-baresigil' });
    beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

    when('[t0] `init --roles -`', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '-'],
          cwd: testDir,
          logOnError: false,
        }),
      );
      then('is rejected as empty specifier', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).toContain('empty');
        expect(run.stderr.split(testDir).join('$TESTDIR')).toMatchSnapshot();
      });
    });
  });

  given('[case10] remove of an absent role (e2 idempotent)', () => {
    const testDir = genTempDir({ slug: 'init-absent' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'mechanic'],
        cwd: testDir,
      });
    });

    when('[t0] `init --roles -architect` when architect is not linked', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '-architect'],
          cwd: testDir,
        }),
      );
      then('is a no-op, mechanic still linked', () => {
        expect(run.status).toEqual(0);
        expect(isRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(true);
      });

      then('the incremental summary tree matches snapshot', () => {
        expect(asSummaryBlock({ stdout: run.stdout, dir: testDir })).toMatchSnapshot();
      });
    });
  });

  given('[case11] remove the last role empties the set (e4, e12)', () => {
    const testDir = genTempDir({ slug: 'init-empty' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      invokeRhachetCliBinary({
        args: ['init', '--roles', '+ehmpathy/architect'],
        cwd: testDir,
      });
    });

    when('[t0] `init --roles -architect` (the only role)', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '-architect'],
          cwd: testDir,
        }),
      );
      then('the repo dir is cleaned and no warn', () => {
        expect(run.status).toEqual(0);
        expect(isRoleLinked({ dir: testDir, role: 'architect' })).toEqual(
          false,
        );
        expect(existsSync(resolve(testDir, '.agent', 'repo=ehmpathy'))).toEqual(
          false,
        );
      });

      then('the incremental summary tree matches snapshot', () => {
        expect(asSummaryBlock({ stdout: run.stdout, dir: testDir })).toMatchSnapshot();
      });
    });
  });

  given('[case12] remove a native repo=.this role (e11)', () => {
    const testDir = genTempDir({ slug: 'init-native' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      // create a native role under repo=.this
      mkdirSync(resolve(testDir, '.agent', 'repo=.this', 'role=homegrown'), {
        recursive: true,
      });
    });

    when('[t0] `init --roles -homegrown`', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '-homegrown'],
          cwd: testDir,
          logOnError: false,
        }),
      );
      then('is rejected — native roles cannot be removed', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).toContain('native roles');
        expect(run.stderr.split(testDir).join('$TESTDIR')).toMatchSnapshot();
      });
    });
  });

  given('[case13] duplicate add tokens (e6 dedupe)', () => {
    const testDir = genTempDir({ slug: 'init-dedupe' });
    beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

    when('[t0] `init --roles +architect +architect`', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+architect', '+architect'],
          cwd: testDir,
        }),
      );
      then('architect is linked once, no duplicate-add error', () => {
        expect(run.status).toEqual(0);
        expect(isRoleLinked({ dir: testDir, role: 'architect' })).toEqual(true);
      });

      then('the incremental summary tree matches snapshot', () => {
        expect(asSummaryBlock({ stdout: run.stdout, dir: testDir })).toMatchSnapshot();
      });
    });
  });

  given('[case14] unqualified remove of a slug under 2 repos (e8)', () => {
    const testDir = genTempDir({ slug: 'init-ambiguous' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      // seed the same role slug linked under two distinct repos
      mkdirSync(resolve(testDir, '.agent', 'repo=ehmpathy', 'role=architect'), {
        recursive: true,
      });
      mkdirSync(resolve(testDir, '.agent', 'repo=bhuild', 'role=architect'), {
        recursive: true,
      });
    });

    when('[t0] `init --roles -architect` without a repo qualifier', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '-architect'],
          cwd: testDir,
          logOnError: false,
        }),
      );
      then('is rejected as ambiguous with a qualify hint', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).toContain('ambiguous');
        expect(run.stderr.split(testDir).join('$TESTDIR')).toMatchSnapshot();
      });
    });
  });

  given('[case15] remove where the symlink is already broken (e13)', () => {
    const testDir = genTempDir({ slug: 'init-broken' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      // seed a broken role symlink: entry present, target absent
      mkdirSync(resolve(testDir, '.agent', 'repo=ehmpathy'), {
        recursive: true,
      });
      symlinkSync(
        resolve(testDir, '.agent', 'repo=ehmpathy', 'role=nonesuch-target'),
        resolve(testDir, '.agent', 'repo=ehmpathy', 'role=architect'),
        'dir',
      );
    });

    when('[t0] `init --roles -architect` on the broken link', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '-architect'],
          cwd: testDir,
        }),
      );
      then('the broken link is removed and the empty repo dir cleaned', () => {
        expect(run.status).toEqual(0);
        expect(existsSync(resolve(testDir, '.agent', 'repo=ehmpathy'))).toEqual(
          false,
        );
      });

      then('the incremental summary tree matches snapshot', () => {
        expect(asSummaryBlock({ stdout: run.stdout, dir: testDir })).toMatchSnapshot();
      });
    });
  });

  given('[case16] re-add an already-linked role (e1 `+extant` no-op)', () => {
    const testDir = genTempDir({ slug: 'init-readd' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      // seed architect already linked via a first incremental add
      invokeRhachetCliBinary({
        args: ['init', '--roles', '+architect'],
        cwd: testDir,
      });
    });

    when('[t0] `init --roles +architect` a second time', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+architect'],
          cwd: testDir,
        }),
      );
      then(
        'the second add is an idempotent no-op, architect still linked',
        () => {
          expect(run.status).toEqual(0);
          expect(isRoleLinked({ dir: testDir, role: 'architect' })).toEqual(
            true,
          );
        },
      );

      then('the incremental summary tree matches snapshot', () => {
        expect(asSummaryBlock({ stdout: run.stdout, dir: testDir })).toMatchSnapshot();
      });
    });
  });

  given('[case17] incremental set-math is independent of --mode (e15)', () => {
    // two parallel repos each start from the same linked set (mechanic), then
    // receive the identical `+architect -mechanic` call under a different --mode
    const dirFindsert = genTempDir({ slug: 'init-mode-findsert' });
    const dirUpsert = genTempDir({ slug: 'init-mode-upsert' });
    beforeAll(() => {
      for (const dir of [dirFindsert, dirUpsert]) {
        setupRoleFixtureRepo({ dir });
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'mechanic'],
          cwd: dir,
        });
      }
    });

    when('[t0] the same `+architect -mechanic` runs under each mode', () => {
      const runFindsert = useThen('findsert exits 0', () =>
        invokeRhachetCliBinary({
          args: [
            'init',
            '--roles',
            '+architect',
            '-mechanic',
            '--mode',
            'findsert',
          ],
          cwd: dirFindsert,
        }),
      );
      const runUpsert = useThen('upsert exits 0', () =>
        invokeRhachetCliBinary({
          args: [
            'init',
            '--roles',
            '+architect',
            '-mechanic',
            '--mode',
            'upsert',
          ],
          cwd: dirUpsert,
        }),
      );

      then('both calls succeed', () => {
        expect(runFindsert.status).toEqual(0);
        expect(runUpsert.status).toEqual(0);
      });

      then(
        'both produce the identical target set (architect, not mechanic)',
        () => {
          // findsert result
          expect(isRoleLinked({ dir: dirFindsert, role: 'architect' })).toEqual(
            true,
          );
          expect(isRoleLinked({ dir: dirFindsert, role: 'mechanic' })).toEqual(
            false,
          );
          // upsert result — must match findsert exactly (mode does not sway set-math)
          expect(isRoleLinked({ dir: dirUpsert, role: 'architect' })).toEqual(
            true,
          );
          expect(isRoleLinked({ dir: dirUpsert, role: 'mechanic' })).toEqual(
            false,
          );
        },
      );
    });
  });

  given('[case18] `--help` documents the incremental sigils', () => {
    const testDir = genTempDir({ slug: 'init-help' });
    beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

    when('[t0] `init --help`', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['init', '--help'],
          cwd: testDir,
        }),
      );

      then('the --roles help documents `+role` add and `-role` remove', () => {
        expect(run.status).toEqual(0);
        expect(run.stdout).toContain('--roles');
        expect(run.stdout).toContain('+role');
        expect(run.stdout).toContain('-role');
        expect(run.stdout).toContain('incrementally');
      });

      then('the --roles help block matches snapshot', () => {
        expect(asRolesHelpBlock({ stdout: run.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case19] bare add sigil with no role (e9)', () => {
    const testDir = genTempDir({ slug: 'init-baresigil-add' });
    beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

    when('[t0] `init --roles +`', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+'],
          cwd: testDir,
          logOnError: false,
        }),
      );
      then('is rejected as empty specifier after "+"', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).toContain('empty');
        expect(run.stderr).toContain('"+"');
        expect(run.stderr.split(testDir).join('$TESTDIR')).toMatchSnapshot();
      });
    });
  });

  given('[case20] a repo with mechanic linked, multi-add', () => {
    const testDir = genTempDir({ slug: 'init-multiadd' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'mechanic'],
        cwd: testDir,
      });
    });

    when('[t0] `init --roles +architect +reviewer` (add two, keep rest)', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+architect', '+reviewer'],
          cwd: testDir,
        }),
      );
      then('both roles are added and mechanic is untouched', () => {
        expect(run.status).toEqual(0);
        expect(isRoleLinked({ dir: testDir, role: 'architect' })).toEqual(true);
        expect(isRoleLinked({ dir: testDir, role: 'reviewer' })).toEqual(true);
        expect(isRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(true);
      });

      then('the multi-add summary tree matches snapshot', () => {
        expect(
          asSummaryBlock({ stdout: run.stdout, dir: testDir }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case21] a repo with mechanic + architect + reviewer linked, multi-remove', () => {
    const testDir = genTempDir({ slug: 'init-multiremove' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'mechanic', 'architect', 'reviewer'],
        cwd: testDir,
      });
    });

    when('[t0] `init --roles -architect -reviewer` (remove two, keep rest)', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '-architect', '-reviewer'],
          cwd: testDir,
        }),
      );
      then('both roles are removed and mechanic is untouched', () => {
        expect(run.status).toEqual(0);
        expect(isRoleLinked({ dir: testDir, role: 'architect' })).toEqual(
          false,
        );
        expect(isRoleLinked({ dir: testDir, role: 'reviewer' })).toEqual(false);
        expect(isRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(true);
      });

      then('the multi-remove summary tree matches snapshot', () => {
        expect(
          asSummaryBlock({ stdout: run.stdout, dir: testDir }),
        ).toMatchSnapshot();
      });
    });
  });

  // ── comma form: `--roles +a,-b` must behave identically to the space form ──
  // the shared getRoleDeltaTokens splits on commas too, so every space-form
  // scenario is mirrored here in comma form: the happy paths (add / remove /
  // mixed) assert the set outcome AND lock the stdout summary to a snapshot, and
  // the error paths (conflict / unknown role / empty sigil) prove the shared
  // grammar rejects the same way regardless of separator.

  given('[case22] comma-form multi-add (e1 add via commas)', () => {
    const testDir = genTempDir({ slug: 'init-comma-add' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'mechanic'],
        cwd: testDir,
      });
    });

    when('[t0] `init --roles +architect,+reviewer`', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+architect,+reviewer'],
          cwd: testDir,
        }),
      );
      then('both are added and mechanic is untouched', () => {
        expect(run.status).toEqual(0);
        expect(isRoleLinked({ dir: testDir, role: 'architect' })).toEqual(true);
        expect(isRoleLinked({ dir: testDir, role: 'reviewer' })).toEqual(true);
        expect(isRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(true);
      });

      then('the comma-form add summary tree matches snapshot', () => {
        expect(
          asSummaryBlock({ stdout: run.stdout, dir: testDir }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case23] comma-form multi-remove (e2 remove via commas)', () => {
    const testDir = genTempDir({ slug: 'init-comma-remove' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'mechanic', 'architect', 'reviewer'],
        cwd: testDir,
      });
    });

    when('[t0] `init --roles -architect,-reviewer`', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '-architect,-reviewer'],
          cwd: testDir,
        }),
      );
      then('both are removed and mechanic is untouched', () => {
        expect(run.status).toEqual(0);
        expect(isRoleLinked({ dir: testDir, role: 'architect' })).toEqual(
          false,
        );
        expect(isRoleLinked({ dir: testDir, role: 'reviewer' })).toEqual(false);
        expect(isRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(true);
      });

      then('the comma-form remove summary tree matches snapshot', () => {
        expect(
          asSummaryBlock({ stdout: run.stdout, dir: testDir }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case24] comma-form mixed add + remove (e3 via commas)', () => {
    const testDir = genTempDir({ slug: 'init-comma-mixed' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'mechanic', 'reviewer'],
        cwd: testDir,
      });
    });

    when('[t0] `init --roles +architect,-reviewer`', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+architect,-reviewer'],
          cwd: testDir,
        }),
      );
      then('architect added, reviewer removed, mechanic kept', () => {
        expect(run.status).toEqual(0);
        expect(isRoleLinked({ dir: testDir, role: 'architect' })).toEqual(true);
        expect(isRoleLinked({ dir: testDir, role: 'reviewer' })).toEqual(false);
        expect(isRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(true);
      });

      then('the comma-form mixed summary tree matches snapshot', () => {
        expect(
          asSummaryBlock({ stdout: run.stdout, dir: testDir }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case25] comma-form conflict (+a,-a) is rejected', () => {
    const testDir = genTempDir({ slug: 'init-comma-conflict' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'mechanic'],
        cwd: testDir,
      });
    });

    when('[t0] `init --roles +architect,-architect`', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+architect,-architect'],
          cwd: testDir,
          logOnError: false,
        }),
      );
      then('the shared grammar rejects add+remove of one role, no null byte', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).toContain('add and remove');
      });

      then('the conflict error output matches snapshot', () => {
        expect(run.stderr.split(testDir).join('$TESTDIR')).toMatchSnapshot();
      });
    });
  });

  given('[case26] comma-form unknown role add (+ghostrole) is rejected', () => {
    const testDir = genTempDir({ slug: 'init-comma-unknown' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'mechanic'],
        cwd: testDir,
      });
    });

    // .note = an unknown ADD errors (there is no such role to link); an unknown
    //   REMOVE is a correct no-op (no linked role to unlink), so the unknown-role
    //   rejection is proven via an ADD, mirroring the space-form case7.
    when('[t0] `init --roles +architect,+ghostrole` (unknown add via comma)', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+architect,+ghostrole'],
          cwd: testDir,
          logOnError: false,
        }),
      );
      then('the decoded unknown role surfaces cleanly, no null byte', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).toContain('ghostrole');
        expect(run.stderr.toLowerCase()).toContain('not found');
      });

      then('the not-found error output matches snapshot', () => {
        // redact the version-fragile availableRoles list, as the space-form
        // case7 does, so the rest of the block stays deterministic
        const masked = run.stderr
          .split(testDir)
          .join('$TESTDIR')
          .replace(
            /("availableRoles":\s*)\[[\s\S]*?\]/,
            '$1[ "$AVAILABLE_ROLES" ]',
          );
        expect(masked).toMatchSnapshot();
      });
    });
  });

  given('[case27] comma-form empty sigil (+,) is rejected', () => {
    const testDir = genTempDir({ slug: 'init-comma-empty-sigil' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'mechanic'],
        cwd: testDir,
      });
    });

    when('[t0] `init --roles +architect,+` (bare sigil after comma)', () => {
      const run = useThen('exits non-zero', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+architect,+'],
          cwd: testDir,
          logOnError: false,
        }),
      );
      then('the shared grammar rejects a bare sigil, no null byte', () => {
        expect(run.status).not.toEqual(0);
        expect(run.stderr).not.toContain('\u0000');
        expect(run.stderr.toLowerCase()).toContain('empty');
      });

      then('the empty-sigil error output matches snapshot', () => {
        expect(run.stderr.split(testDir).join('$TESTDIR')).toMatchSnapshot();
      });
    });
  });
});
