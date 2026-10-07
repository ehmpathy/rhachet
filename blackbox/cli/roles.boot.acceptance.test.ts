import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = acceptance tests for `rhachet roles boot` over a ROLE source
 * .why = this render is the context a brain reads, so it is a contract: `toContain` pins intent,
 *        the snapshot pins the whole render (`rule.require.contract-snapshot-exhaustiveness`)
 * .note = every case names its stream; a refusal is snapped from stderr
 */
describe('rhachet roles boot', () => {
  given('[case1] repo with briefs', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-briefs' }),
    );

    when('[t0] roles boot --repo this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', 'this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs stats', () => {
        expect(result.stdout).toContain('<stats>');
      });

      then('outputs brief content', () => {
        expect(result.stdout).toContain('sample brief');
      });

      then('outputs readme', () => {
        expect(result.stdout).toContain('<readme');
      });

      then('the payload renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT — no error-readout wrapper
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout-briefs');
      });
    });

    when('[t1] roles boot --repo this --role absent', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', 'this', '--role', 'absent'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      /**
       * .why = this row walks the BUN `roles` entry (`bin/run` dispatches `roles` to
       *        `run.bun.rhachet-roles.bc`), a process root with its own last error handler,
       *        which maps a ConstraintError to exit 2
       */
      then('exits 2 — a caller-fixable constraint, never a malfunction', () => {
        expect(result.status).toEqual(2);
      });

      then('names the repair', () => {
        // an absent role is caller-fixable, so the refusal names the fix (`rule.require.errors-name-the-fix`)
        expect(result.stderr).toContain('roles link');
      });

      then('shows a human NO raw runtime dump', () => {
        expect(result.stderr).not.toContain('node_modules');
        expect(result.stderr).not.toMatch(/^\s*at /m);
        expect(result.stderr).not.toMatch(/Bun v\d/);
      });

      then('the refusal frame is locked to a snapshot', () => {
        // the asserts above prove the dump is gone; they cannot prove the frame READS
        // well or stays stable — a clean-but-reworded refusal ships with no diff for a
        // reviewer to catch. this is a NEW user-faced failure surface on the
        // `roles boot` contract, so it is snapped like every other one in this change
        // (`rule.require.contract-snapshot-exhaustiveness` +
        // `rule.require.acceptance-journey-coverage` — a negative path is snapped).
        // paired with those asserts, never snapshot-only (`rule.forbid.failhide`)
        // .readout = `asSnapshotSafe` over raw STDERR — no error-readout wrapper
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-role-absent',
        );
      });
    });

    when('[t2] roles boot --repo this --role absent --if-present', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'boot',
            '--repo',
            'this',
            '--role',
            'absent',
            '--if-present',
          ],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs skipped message', () => {
        expect(result.stdout).toContain('🫧');
        expect(result.stdout).toContain('skipped');
      });

      then('the skip renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-if-present-skip',
        );
      });
    });
  });

  given('[case2] repo with registry', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-registry' }),
    );

    when('[t0] roles boot --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs both briefs and skills stats', () => {
        expect(result.stdout).toContain('briefs');
        expect(result.stdout).toContain('skills');
      });

      then('the payload renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout-registry');
      });
    });
  });

  given('[case3] minimal repo', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] roles boot --repo this --role any --if-present', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'boot',
            '--repo',
            'this',
            '--role',
            'any',
            '--if-present',
          ],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('outputs skipped message', () => {
        expect(result.stdout).toContain('🫧');
        expect(result.stdout).toContain('skipped');
      });

      then('the skip render matches its snapshot', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-if-present-skip-minimal',
        );
      });
    });
  });

  given('[case4] repo with .scratch and .archive directories', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-scratch-archive' }),
    );

    when('[t0] roles boot --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('includes the normal brief', () => {
        expect(result.stdout).toContain('included.brief.md');
        expect(result.stdout).toContain('this brief should be included');
      });

      then('excludes briefs in .scratch directory', () => {
        expect(result.stdout).not.toContain('excluded.scratch.md');
        expect(result.stdout).not.toContain('briefs/.scratch/');
      });

      then('excludes briefs in .archive directory', () => {
        expect(result.stdout).not.toContain('excluded.archive.md');
        expect(result.stdout).not.toContain('briefs/.archive/');
      });

      then('reports correct brief count (1, not 3)', () => {
        expect(result.stdout).toContain('briefs = 1');
      });

      then('the payload renders as snapshotted — on STDOUT', () => {
        // the snapshot pins the set that landed; the assertions above pin what was excluded
        // .readout = `asSnapshotSafe` over raw STDOUT
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-scratch-archive-excluded',
        );
      });
    });
  });

  given('[case5] repo with compressed briefs (.md.min)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-min-briefs' }),
    );

    when('[t0] roles boot --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('loads content from .min file', () => {
        expect(result.stdout).toContain(
          'loader prefers minified variant for content',
        );
      });

      then('does not load verbose .md content', () => {
        expect(result.stdout).not.toContain(
          'verbose explanations',
        );
      });

      then('uses .min path in <brief> tag when min exists', () => {
        expect(result.stdout).toContain('path="');
        expect(result.stdout).toContain('sample.md.min"');
      });

      then('brief count reflects only .md files (not .min)', () => {
        expect(result.stdout).toContain('briefs = 1');
      });

      then('the payload renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT; the `.min` is what lands
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout-min');
      });
    });
  });

  given('[case6] repo with orphan .md.min', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-orphan-min' }),
    );

    when('[t0] roles boot --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr names the orphan file', () => {
        expect(result.stderr).toContain('orphan.md.min');
      });

      then('the refusal renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR — no error-readout wrapper
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-orphan-min',
        );
      });
    });
  });

  given('[case7] repo with mixed compression', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-mixed-min' }),
    );

    when('[t0] roles boot --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('loads .min content for briefs that have .min', () => {
        expect(result.stdout).toContain(
          'loader prefers minified variant',
        );
      });

      then('loads .md content for briefs that lack .min', () => {
        expect(result.stdout).toContain(
          'backwards compatibility',
        );
      });

      then('brief count is 2 (one compressed, one plain)', () => {
        expect(result.stdout).toContain('briefs = 2');
      });

      then('the payload renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-mixed-min',
        );
      });
    });
  });

  given('[case8] repo with .scratch and .archive directories that contain .md.min files', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-scratch-archive-min' }),
    );

    when('[t0] roles boot --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('includes the normal brief via .min content', () => {
        expect(result.stdout).toContain('included.brief.md');
        expect(result.stdout).toContain('loader prefers minified variant for included brief');
      });

      then('excludes .min files in .scratch directory', () => {
        expect(result.stdout).not.toContain('excluded.scratch.md');
        expect(result.stdout).not.toContain('excluded scratch minified');
      });

      then('excludes .min files in .archive directory', () => {
        expect(result.stdout).not.toContain('excluded.archive.md');
        expect(result.stdout).not.toContain('excluded archive minified');
      });

      then('brief count is 1 (blocklisted .min files excluded)', () => {
        expect(result.stdout).toContain('briefs = 1');
      });

      then('the payload renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT. the blocklist must reach a `.md.min`
        //   as it reaches a `.md`, so the snapshot pins the set that survived both filters
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-scratch-archive-min-excluded',
        );
      });
    });
  });

  given('[case9] a role dir that holds no resources', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });
      mkdirSync(join(r.path, '.agent', 'repo=.this', 'role=empty'), {
        recursive: true,
      });
      return r;
    });

    when('[t0] roles boot --repo .this --role empty', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'empty'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0 — an empty role is not a refusal', () => {
        expect(result.status).toEqual(0);
      });

      then('it says the role holds no resources', () => {
        expect(result.stdout).toContain(
          '🟡 no resources found — this boot emits naught',
        );
      });

      then('the empty render is snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-role-empty',
        );
      });
    });
  });
});
