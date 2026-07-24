import { chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = black-box acceptance tests for `keyrack infra init` — the member journey to
 *         bootstrap the per-org keyrack-infra repo + github-apps registry, driven through
 *         the compiled binary as a real subprocess
 * .why = this is the member-faced cli contract; subprocess snapshots of every variant
 *        (help, negative path, fresh success, robot mode, idempotent re-run, operational
 *        error) lock the exact caller experience against silent drift and let reviewers
 *        vibecheck the output in a pr without a run
 *
 * .mock = the gh cli boundary only, via a mock `gh` placed on PATH ahead of the real one
 * .why-mock = a real `keyrack infra init` creates an irreversible $org/keyrack-infra github
 *             repo — no sandbox, the effect cannot be undone. per
 *             rule.forbid.acceptance.mocks' documented-exception clause ("clearly
 *             unavoidable, no sandbox"), the gh boundary alone is a mock; all else (the
 *             compiled binary, commander parse, the cli action, the report format, real
 *             stdout/stderr, real exit code) is the true contract path.
 * .real = the real gh boundary is proven at the integration grain in
 *         src/domain.operations/keyrack/infra/gh/runGh.integration.test.ts
 */

/**
 * .what = path to the mock gh CLI executable
 * .why = placed on PATH ahead of the real gh so infra init runs without real credentials
 */
const MOCK_GH_CLI_DIR = resolve(__dirname, '../.test/assets/mock-gh-cli');

/**
 * .what = env with the mock gh CLI on PATH and HOME pinned to the temp repo
 * .why = keeps the acceptance run fully portable — no real github access or credentials
 */
const envWithMockGh = (home: string): Record<string, string | undefined> => ({
  HOME: home,
  PATH: `${MOCK_GH_CLI_DIR}:${process.env.PATH}`,
});

/**
 * .what = strip ansi + volatile fragments and trim for a stable snapshot
 * .why = infra init output is plain (non-pty) stdout/stderr; asSnapshotSafe removes ansi
 *        + machine-specific paths, and the trim keeps leading/trailing blank lines out of
 *        the snapshot so it reads as the caller-visible tree
 */
const cleanCliOutput = (str: string): string => asSnapshotSafe(str).trim();

describe('keyrack infra init (acceptance)', () => {
  // git may not preserve the executable bit on the mock gh executable
  beforeAll(() => chmodSync(`${MOCK_GH_CLI_DIR}/gh`, 0o755));

  given('[case1] the keyrack cli is available', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] the caller asks for `keyrack infra init --help`', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'infra', 'init', '--help'],
          cwd: repo.path,
          env: envWithMockGh(repo.path),
          logOnError: false,
        }),
      );

      then('it exits success', () => {
        expect(result.status).toEqual(0);
      });

      then('the help output (the member contract) stays locked', () => {
        expect(cleanCliOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case2] the caller omits the required --org option', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] `keyrack infra init` runs with no --org', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'infra', 'init'],
          cwd: repo.path,
          env: envWithMockGh(repo.path),
          logOnError: false,
        }),
      );

      then('it exits non-zero (commander rejects the absent option)', () => {
        expect(result.status).not.toEqual(0);
      });

      then('the error names the absent --org option', () => {
        expect(result.stderr).toContain('--org');
      });

      then('the rejection message (negative-path contract) stays locked', () => {
        expect(cleanCliOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] a fresh org (no keyrack-infra yet)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] `keyrack infra init --org freshorg` runs in human mode', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'infra', 'init', '--org', 'freshorg'],
          cwd: repo.path,
          env: envWithMockGh(repo.path),
          logOnError: false,
        }),
      );

      then('it exits success', () => {
        expect(result.status).toEqual(0);
      });

      then('the human treestruct stdout (positive path) stays locked', () => {
        expect(cleanCliOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] `keyrack infra init --org freshorg --json` runs in robot mode', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'infra', 'init', '--org', 'freshorg', '--json'],
          cwd: repo.path,
          env: envWithMockGh(repo.path),
          logOnError: false,
        }),
      );

      then('it exits success', () => {
        expect(result.status).toEqual(0);
      });

      then('the --json stdout (positive path, robot mode) stays locked', () => {
        expect(cleanCliOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case4] an org already fully set up', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] `keyrack infra init --org setuporg` re-runs (idempotent)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'infra', 'init', '--org', 'setuporg'],
          cwd: repo.path,
          env: envWithMockGh(repo.path),
          logOnError: false,
        }),
      );

      then('it exits success', () => {
        expect(result.status).toEqual(0);
      });

      then('the idempotent-rerun stdout (all found) stays locked', () => {
        expect(cleanCliOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case6] the keyrack-infra repo exists but is public', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] `keyrack infra init --org puborg` finds a public repo', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'infra', 'init', '--org', 'puborg'],
          cwd: repo.path,
          env: envWithMockGh(repo.path),
          logOnError: false,
        }),
      );

      then('it exits non-zero (fail loud — the lock is private access)', () => {
        expect(result.status).not.toEqual(0);
      });

      then('the stderr names the private-repo fix', () => {
        expect(result.stderr).toContain('--visibility private');
      });

      then('the blocked treestruct stderr (public-repo contract) stays locked', () => {
        expect(cleanCliOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case5] the gh boundary fails mid-init (operational error)', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'minimal' }),
    );

    when('[t0] `keyrack infra init --org erroorg` hits a forbidden repo create', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'infra', 'init', '--org', 'erroorg'],
          cwd: repo.path,
          env: envWithMockGh(repo.path),
          logOnError: false,
        }),
      );

      then('it exits non-zero (fail loud)', () => {
        expect(result.status).not.toEqual(0);
      });

      then('the blocked treestruct stderr (failure contract) stays locked', () => {
        expect(cleanCliOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });
});
