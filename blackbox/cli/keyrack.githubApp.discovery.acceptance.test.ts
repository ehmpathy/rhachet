import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asPtySnapshotSafe,
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
 *             contract path.
 * .real = two proofs, at two grains, because the mock leaves two different things unproven:
 *          1. the gh BOUNDARY (does `runGh` really invoke gh and read it back?) — proven at
 *             src/domain.operations/keyrack/infra/gh/runGh.integration.test.ts, in CI
 *          2. the cross-org MINT (does a `ghs_` token minted at reach X really open org X?)
 *             — ⚠️ NOT proven by any automated test, and cannot be: it needs one real app
 *             installed in two real orgs, and a real mint writes to a real
 *             $org/keyrack-infra. verified by hand instead, per release:
 *                 rhx keyrack set --key $KEY --env prep --mech EPHEMERAL_VIA_GITHUB_APP \
 *                   --reach github://org=$otherOrg          # from a repo of a DIFFERENT org
 *                 rhx keyrack unlock --key $KEY --env prep --reach github://org=$otherOrg
 *                 gh api /repos/$otherOrg/$repo             # must return the repo, not 404
 *             the `404` is the tell: github hides an unreachable repo rather than forbids
 *             it, so a wrong-org token reads as an absent repo (see the vision's day-in-the-
 *             life). this is the ONE guarantee the whole wish exists for, so it is named
 *             here as a residual risk rather than left implicit in `[case4]`'s notes
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
        // the shared helper, not an inline strip — it applies the identical five scrubs
        // (ansi, osc, \r, ·, end-of-line whitespace) AND the same 🔐 tree-start slice, plus a
        // pid redaction the inline copy lacked. one implementation cannot drift from itself
        expect(asPtySnapshotSafe(result.stdout)).toMatchSnapshot();
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

  /**
   * .what = the wish's HEADLINE journey at the grain a human runs it — a repo declared by
   *         one org, a key cut for another org's reach, driven through the compiled
   *         binary with `--reach github://org=$org`
   * .why = this is the wish's opening example and its entire motivation: "dispatch a task
   *        into an `ehmpathy` repo while inside an `ahbode` repo". it was proven at the
   *        integration grain (`genGithubAppSource.integration.test.ts [case5]`) and nowhere
   *        at the cli grain, so the arg parse, the mech dispatch, and the guided flow were
   *        each unproven on the one path the feature exists for
   *
   * .note = ⚠️ THE clamp is that the mock answers for `reachorg` ONLY, while `slugorg`'s
   *         keyrack-infra reports absent. so a green exit CANNOT be produced by a fallback
   *         to the slug's org — that path lands on `[case2]`'s blocked tree instead. success
   *         itself is the assertion, and the snapshot pins which registry answered
   * .note = the app id and install id are `reachorg`'s, deliberately unlike any `slugorg`
   *         value, so the tree names WHICH org's app was picked rather than merely that one
   *         was. `[case1]` is the reachless twin — same guided flow, org from the slug — so
   *         read as a pair they are an A/B on the reach axis alone
   * .note = the snapshot renders the org/reach split whole: the slug stays
   *         `slugorg.test.…` (provenance, FROM) while the app is reachorg's (destination,
   *         INTO). one artifact, both senses, which is the clearest statement of the axis
   *         anywhere in the suite
   *
   * .note = what this case does NOT prove, stated rather than implied: that the minted
   *         `ghs_` token actually opens reachorg. that needs a real app installed in two
   *         real orgs and a live api.github.com mint — no sandbox exists, so it is beyond
   *         any hermetic grain. it is also NOT this branch's behavior: the mint reads a
   *         baked-in `installationId` and is untouched here. what this branch changed is
   *         WHICH id gets baked in, and that is exactly what this case clamps. the unlock
   *         half of the reach axis — that a grant stores and reads back at its reach —
   *         is mech-agnostic and proven at `keyrack.session.acceptance [case6]`
   */
  given('[case4] a repo of one org, a key cut for another org’s reach', () => {
    const registered = {
      org: 'reachorg',
      appId: '987654',
      installationId: '55667788',
      slug: 'reachorg-bot',
    };

    const repo = useBeforeAll(async () => {
      const r = await genRepoForOrg({ org: 'slugorg' });
      writeFileSync(
        `${r.path}/mock-app.pem`,
        [
          '-----BEGIN RSA PRIVATE KEY-----',
          'MIIEpQIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MaXBkvQRkz0Pj/Gx',
          '-----END RSA PRIVATE KEY-----',
        ].join('\n'),
        'utf-8',
      );
      // the contents api hands back base64 — built here rather than in the shell so the
      // mock stays a plain `echo` and the fixture reads as data
      const registryB64 = Buffer.from(JSON.stringify([registered])).toString(
        'base64',
      );
      const mockDir = genMockGhDir({
        home: r.path,
        body: [
          '  "auth status") exit 0 ;;',
          // reachorg — the reach asked for. its registry holds exactly one app
          '  "repo view reachorg/keyrack-infra --json name") echo \'{"name":"keyrack-infra"}\'; exit 0 ;;',
          `  "api /repos/reachorg/keyrack-infra/contents/registry/github-apps.json") echo '{"content":"${registryB64}","sha":"abc123"}'; exit 0 ;;`,
          // the caller is a member of reachorg, not an admin — 403 on the install list, so
          // discovery rests on the registry alone. that is the admin-free path this whole
          // lookup exists for (`rule.require.github-app-org-lookup-via-keyrack-infra`), and
          // it is what a cross-org caller realistically holds: read access, no admin rights
          '  "api /orgs/reachorg/installations") echo "HTTP 403: Must have admin rights to Repository." >&2; exit 1 ;;',
          '  "api --method PUT /repos/reachorg/keyrack-infra/contents/registry/github-apps.json"*) exit 0 ;;',
          // slugorg — the repo's OWN org, deliberately absent. this is the clamp: were the
          // reach dropped, the lookup would land here and blocked-exit instead of succeed.
          // the phrasing is github's verbatim graphql not-found text, which is what
          // `isGhNotFoundStderr` matches
          '  "repo view slugorg/keyrack-infra --json name") echo "GraphQL: Could not resolve to a Repository with the name \'slugorg/keyrack-infra\'." >&2; exit 1 ;;',
        ],
      });
      return { ...r, mockDir };
    });

    when('[t0] `keyrack set --reach github://org=reachorg` runs', () => {
      const result = useBeforeAll(async () =>
        spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key GITHUB_TOKEN --env test --vault os.secure --mech EPHEMERAL_VIA_GITHUB_APP --reach github://org=reachorg`,
            '.pem',
            './mock-app.pem',
          ],
          {
            encoding: 'utf-8',
            cwd: repo.path,
            env: {
              ...process.env,
              ...envWithMock({ home: repo.path, mockDir: repo.mockDir }),
            },
            timeout: 60000,
          },
        ),
      );

      // ⚠️ THE assertion. slugorg's keyrack-infra reports absent, so exit 0 is reachable
      //    ONLY through reachorg — a fallback to the slug's org blocked-exits at [case2]
      then('it exits success, which only the reach can produce', () => {
        expect(result.status).toEqual(0);
      });

      then('the app picked is the REACHED org’s, never the slug’s', () => {
        expect(result.stdout).toContain('reachorg-bot');
        expect(result.stdout).toContain('987654');
      });

      // the failure this case exists to make impossible: a fallback that names slugorg
      then('no blocked report for the slug’s own org appears', () => {
        expect(result.stdout).not.toContain('keyrack-infra not reachable');
        expect(result.stderr).not.toContain('slugorg/keyrack-infra');
      });

      // BOTH streams, the empty one too. the `not.toContain` pair above proves two specific
      // phrases are absent from stderr; only a snapshot of the whole stream proves that
      // stream stays empty — a warn, a debug print, or a refusal that MIGRATES here would
      // leave every phrase assertion green
      then('the cross-org guided-setup + summary stdout stays locked', () => {
        expect(asPtySnapshotSafe(result.stdout)).toMatchSnapshot('stdout');
      });

      then('stderr matches snapshot', () => {
        expect(asPtySnapshotSafe(result.stderr)).toMatchSnapshot('stderr');
      });
    });
  });
});
