import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = black-box acceptance tests for the admin-free github-app DISCOVERY matrix of
 *         `keyrack set --mech EPHEMERAL_VIA_GITHUB_APP`, driven through the compiled binary
 *         as a real subprocess:
 *          - admin adds an app → discovered via the org install list → auto-registered
 *          - keyrack-infra absent → fail loud (init it first)
 *          - registry empty + member (403) → fail loud (ask an admin)
 * .why = these are the wish's core fallback journeys — "a member sets a github-app key
 *        without admin", and its loud-failure guardrails. the member-from-registry happy
 *        path is proven in keyrack.vault.osSecure.githubApp (case1); this file locks the
 *        remaining discovery outcomes at the subprocess grain so reviewers vibecheck the
 *        exact caller experience and drift surfaces in diffs.
 *
 * .mock = the gh cli boundary only, via a per-case inline mock `gh` on PATH ahead of the
 *         real one — so each case varies the repo/registry/install-list responses
 * .why-mock = a real run mints a real installation token and writes to a real
 *             $org/keyrack-infra repo — irreversible external effects, no sandbox. per
 *             rule.forbid.acceptance.mocks' documented-exception clause ("clearly
 *             unavoidable, no sandbox"), only the gh boundary is faked; the compiled
 *             binary, commander parse, the set action, mech discovery, real age encryption
 *             to disk, the report format, real stdout/stderr and exit code are the true
 *             contract path. the real gh boundary is proven at the integration grain in
 *             src/domain.operations/keyrack/infra/gh/runGh.integration.test.ts.
 */

const RHACHET_BIN = resolve(__dirname, '../../bin/run');
const PTY_WITH_ANSWERS = resolve(__dirname, '../.test/assets/pty-with-answers.js');

/**
 * .what = write a per-case mock gh executable and return its dir
 * .why = each discovery journey needs its own repo/registry/install-list responses, so
 *        the mock is authored inline per case (the pattern the osSecure guided tests use)
 */
const genMockGhDir = (input: { home: string; body: string[] }): string => {
  const dir = `${input.home}/.mock-gh`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    `${dir}/gh`,
    ['#!/usr/bin/env bash', 'ARGS="$*"', 'case "$ARGS" in', ...input.body, '  *) echo "mock gh: unknown: $ARGS" >&2; exit 1 ;;', 'esac'].join('\n'),
    'utf-8',
  );
  chmodSync(`${dir}/gh`, 0o755);
  return dir;
};

/**
 * .what = seed a temp repo with a keyrack manifest + keyrack.yml for the given org
 * .why = the set action loads a host manifest (os.secure encrypts to its recipients) and
 *        derives the org from the repo manifest; each case gets an isolated repo
 */
const genRepoForOrg = async (input: { org: string }) => {
  const r = await genTestTempRepo({ fixture: 'minimal' });
  invokeRhachetCliBinary({
    args: ['keyrack', 'init'],
    cwd: r.path,
    env: { HOME: r.path },
  });
  const agentDir = `${r.path}/.agent`;
  if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
  writeFileSync(
    `${agentDir}/keyrack.yml`,
    `org: ${input.org}\n\nenv.test:\n  - GITHUB_TOKEN\n`,
    'utf-8',
  );
  return r;
};

/**
 * .what = env with a case-local mock gh dir on PATH and HOME pinned to the temp repo
 */
const envWithMock = (input: {
  home: string;
  mockDir: string;
}): Record<string, string | undefined> => ({
  HOME: input.home,
  PATH: `${input.mockDir}:${process.env.PATH}`,
});

/**
 * .what = strip ansi + pty noise, trim to the first tree glyph for a stable snapshot
 */
const cleanCliOutput = (str: string): string => asSnapshotSafe(str).trim();

describe('keyrack set github-app discovery (acceptance)', () => {
  beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
  afterAll(() => killKeyrackDaemonForTests({ owner: null }));

  given('[case0] the keyrack set cli surface', () => {
    // a bare temp repo is enough — `--help` short-circuits in commander before the set
    // action runs, so no manifest, mock gh, or org is needed; HOME is pinned so the help
    // probe never touches the real home
    const repo = useBeforeAll(async () => genTestTempRepo({ fixture: 'minimal' }));

    when('[t0] the caller asks for `keyrack set --help`', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'set', '--help'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('it exits success', () => {
        expect(result.status).toEqual(0);
      });

      then('the help output (set contract) stays locked', () => {
        // lock the `keyrack set` help surface so a flag or copy change surfaces in a diff
        // (rule.require.test-coverage-by-grain — help is part of the cli contract)
        expect(cleanCliOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case1] an admin adds an app (registry empty, admin can list installs)', () => {
    const repo = useBeforeAll(async () => {
      const r = await genRepoForOrg({ org: 'adminorg' });
      // pem the guided setup reads off disk (real fs read + real age encryption)
      writeFileSync(
        `${r.path}/mock-app.pem`,
        [
          '-----BEGIN RSA PRIVATE KEY-----',
          'MIIEpQIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MaXBkvQRkz0Pj/Gx',
          '-----END RSA PRIVATE KEY-----',
        ].join('\n'),
        'utf-8',
      );
      // keyrack-infra exists, registry absent (404 → empty), admin install-list has one
      // app, and the auto-register PUT succeeds
      const mockDir = genMockGhDir({
        home: r.path,
        body: [
          '  "auth status") exit 0 ;;',
          '  "repo view adminorg/keyrack-infra --json name") echo \'{"name":"keyrack-infra"}\'; exit 0 ;;',
          '  "api /repos/adminorg/keyrack-infra/contents/registry/github-apps.json") echo "HTTP 404: Not Found" >&2; exit 1 ;;',
          '  "api /orgs/adminorg/installations") echo \'{"installations":[{"id":78901234,"app_id":123456,"app_slug":"adminorg-bot"}]}\'; exit 0 ;;',
          '  "api --method PUT /repos/adminorg/keyrack-infra/contents/registry/github-apps.json"*) exit 0 ;;',
        ],
      });
      return { ...r, mockDir };
    });

    when('[t0] `keyrack set --mech EPHEMERAL_VIA_GITHUB_APP` runs (auto-select + pem)', () => {
      const result = useBeforeAll(async () =>
        spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key GITHUB_TOKEN --env test --vault os.secure --mech EPHEMERAL_VIA_GITHUB_APP`,
            '.pem',
            './mock-app.pem',
          ],
          {
            encoding: 'utf-8',
            cwd: repo.path,
            env: { ...process.env, ...envWithMock({ home: repo.path, mockDir: repo.mockDir }) },
            timeout: 60000,
          },
        ),
      );

      then('it exits success', () => {
        expect(result.status).toEqual(0);
      });

      then('the auto-register guided-setup + summary stdout stays locked', () => {
        const stripped = result.stdout
          .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
          .replace(/\x1B\]/g, '')
          .replace(/\r/g, '')
          .replace(/·/g, '')
          .replace(/\s+$/gm, '');
        const treeStart = stripped.indexOf('\u{1F510}');
        expect(stripped.slice(treeStart >= 0 ? treeStart : 0).trim()).toMatchSnapshot();
      });
    });
  });

  given('[case2] keyrack-infra is not initialized for the org', () => {
    const repo = useBeforeAll(async () => {
      const r = await genRepoForOrg({ org: 'noinfraorg' });
      // repo view 404 → keyrack-infra absent → fail loud before any prompt (the graphql
      // not-found phrasing the code matches)
      const mockDir = genMockGhDir({
        home: r.path,
        body: [
          '  "auth status") exit 0 ;;',
          '  "repo view noinfraorg/keyrack-infra --json name") echo "GraphQL: Could not resolve to a Repository with the name \'noinfraorg/keyrack-infra\'." >&2; exit 1 ;;',
        ],
      });
      return { ...r, mockDir };
    });

    when('[t0] `keyrack set --mech EPHEMERAL_VIA_GITHUB_APP` runs', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack', 'set', '--key', 'GITHUB_TOKEN', '--env', 'test',
            '--vault', 'os.secure', '--mech', 'EPHEMERAL_VIA_GITHUB_APP',
          ],
          cwd: repo.path,
          env: envWithMock({ home: repo.path, mockDir: repo.mockDir }),
          logOnError: false,
        }),
      );

      then('it exits non-zero (caller-fixable, exit 2)', () => {
        expect(result.status).toEqual(2);
      });

      then('the blocked treestruct stderr (init-first contract) stays locked', () => {
        expect(cleanCliOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] the registry is empty and the caller is a member (403)', () => {
    const repo = useBeforeAll(async () => {
      const r = await genRepoForOrg({ org: 'noapporg' });
      // keyrack-infra exists, registry absent (404 → empty), install-list forbidden (403
      // → member) → fail loud "ask an admin" before any prompt
      const mockDir = genMockGhDir({
        home: r.path,
        body: [
          '  "auth status") exit 0 ;;',
          '  "repo view noapporg/keyrack-infra --json name") echo \'{"name":"keyrack-infra"}\'; exit 0 ;;',
          '  "api /repos/noapporg/keyrack-infra/contents/registry/github-apps.json") echo "HTTP 404: Not Found" >&2; exit 1 ;;',
          '  "api /orgs/noapporg/installations") echo "HTTP 403: Must have admin rights to Repository." >&2; exit 1 ;;',
        ],
      });
      return { ...r, mockDir };
    });

    when('[t0] `keyrack set --mech EPHEMERAL_VIA_GITHUB_APP` runs', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack', 'set', '--key', 'GITHUB_TOKEN', '--env', 'test',
            '--vault', 'os.secure', '--mech', 'EPHEMERAL_VIA_GITHUB_APP',
          ],
          cwd: repo.path,
          env: envWithMock({ home: repo.path, mockDir: repo.mockDir }),
          logOnError: false,
        }),
      );

      then('it exits non-zero (caller-fixable, exit 2)', () => {
        expect(result.status).toEqual(2);
      });

      then('the blocked treestruct stderr (ask-an-admin contract) stays locked', () => {
        expect(cleanCliOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });
});
