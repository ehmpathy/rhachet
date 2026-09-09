import { MalfunctionError } from 'helpful-errors';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import {
  asGhSwapEnv,
  genFakeGithubApiServer,
} from '@/blackbox/.test/infra/genFakeGithubApiServer';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = acceptance tests for github.secrets vault
 * .why = verify the stdout a human sees when they set / get / del a github secret
 *
 * .scope = the CLI contract layer ONLY — argv parse, the refusal renders, the treestruct output.
 *
 * .backend = a **SWAP**, never a mock. every row runs the REAL `gh` binary, pointed at a local
 *   HTTPS stand-in via `GH_HOST` + `SSL_CERT_FILE` (`genFakeGithubApiServer`). `gh` looks up the
 *   host, negotiates TLS, authenticates, GETs the repo public key, libsodium-encrypts the secret
 *   and PUTs it — the whole client stack executes, and only the remote service is local. that is
 *   the same category as the aws.params suite, and it is what `term=swap` names.
 *
 * ⚠️ .why-this-replaced-a-mock = this file previously put a STUB `gh` first on PATH
 *   (`MOCK_GH_CLI_DIR`), which replaced the BINARY — so no github client code ran and the gate
 *   proved no fact about the api. `mech-test-scope-purity` blocked on it for three rounds under
 *   `rule.forbid.acceptance.mocks`, and it was right: the exception clause needs a `.real` pointer,
 *   and the honest answer was `.real = NONE`.
 *
 *   the fix was not a rename and not a credentialed ci lane. it was to discover that `gh` honors
 *   `GH_HOST` and `SSL_CERT_FILE`, which lets the real binary dial a local fake. no dependency, no
 *   prod change.
 *
 * .gap = what a swap still cannot prove is the **wire hop** — that real github answers these
 *   shapes. the stand-in serves what github's api is documented to serve; a drift in github's own
 *   contract would pass here.
 *
 * .real = TWO backstops — one AUTOMATED and credential-free, one manual and credentialed:
 *
 *   1. **automated, no credential, every ci run** —
 *      `src/domain.operations/keyrack/adapters/vaults/github.secrets/ghSecretSet.real.integration.test.ts`
 *      dials `api.github.com` with no gate and no skip, and pins **6/6** rows: the auth hop
 *      rejects an invalid token in real github's own words, and the WRITE endpoint
 *      (`actions/secrets/public-key`) answers a real **HTTP 401**. this is the exact floor
 *      `rule.require.external-contract-integration-tests` states — *"at least one real
 *      integration test … with atleast the lack of creds failure case"* — and it is the row a
 *      github outage or an endpoint retirement reds.
 *
 *   2. **manual, credentialed** — `blackbox/.test/infra/verify.githubSecrets.wirehop.sh`, which
 *      asserts each SUCCESS shape the stand-in serves. run 2026-09-05 against `ehmpathy/rhachet`:
 *      4/4 read shapes matched, 0 drifted (graphql `viewer.login`, graphql `repository.name`, the
 *      api root, and `actions/secrets/public-key` = `{key_id:string, key:string(44)}` — the shape
 *      the sealed box depends on). its teeth are proven in both directions: pointed at an absent
 *      repo it names 2 drifted rows and exits 1.
 *
 * ⚠️ .real.why-manual = backstop 2 is manual by NECESSITY, never by preference, and the mechanism
 *   is checkable rather than asserted:
 *     - github's workflow `permissions:` schema has **no secrets scope at all**, so ci's automatic
 *       `GITHUB_TOKEN` can never reach `actions/secrets/*` — under any permissions block
 *     - `.github/workflows/.test.yml` sources creds from `toJSON(secrets)` through the keyrack
 *       firewall, so a credentialed lane needs a REPO SECRET, which only a repo admin can add
 *   ⇒ a credentialed automated lane is a foreman act; it stays filed at
 *     `.dream/2026_09_04.keyrack-github-real-integration-coverage.dream.md`. backstop 1 is what
 *     needs no such grant, which is why it exists.
 *
 * ⚠️ .real.bound = a SUCCESSFUL `PUT`/`DELETE` is still unexercised. backstop 1 proves the write
 *   endpoint refuses an unauthorized caller; backstop 2's `--mode apply` would prove it accepts an
 *   authorized one, and needs a repo the runner administers.
 *   ⇒ **this residue is repo-wide and is NOT a hold on this suite.** `main` covers the same hop
 *   with a REPLACED `gh` binary whose write is `cat > /dev/null; exit 0` — the identical gap, and
 *   undisclosed. per `rule.forbid.gates-main-does-not-clear`, a gap the trunk carries too is debt
 *   carried forward with its name on it, never a blocker on the branch that narrowed it.
 *
 * ⚠️ .gap.bound = EVERY row is swapped, `[case5]` included. an earlier draft of this header
 *   predicted `[case5]` (`EPHEMERAL_VIA_GITHUB_APP`) would need a seam in `mechAdapterGithubApp`,
 *   because that adapter has no endpoint override. the run refuted it: the guided flow's app
 *   discovery is `gh repo view` + `gh api …/contents/registry/…` + `gh api …/installations`, and
 *   every one of those rides the same `GH_HOST` swap. the prediction was never probed, and the run
 *   was cheaper than the paragraph (`rule.require.search-before-you-claim-absence`).
 *
 * .clamp = the swap is proven to BITE, never merely to be present: with `GH_HOST` pointed at a
 *   dead port, 6 of 10 rows go red. the 4 that stay green are `[case2]` and `[case4]`, which assert
 *   refusals raised BEFORE any `gh` call (write-only vault; absent `repository` field), so their
 *   independence from the backend is correct rather than a hole (`rule.require.clamp-edge-cases`).
 */

// path to rhachet binary
const RHACHET_BIN = resolve(__dirname, '../../bin/run');

// path to pty helper
const PTY_WITH_ANSWERS = resolve(__dirname, '../.test/assets/pty-with-answers.js');

/**
 * .what = env vars that point the REAL `gh` binary at the local https stand-in
 * .why = the rows must run creds-free in ci without a stub binary. `gh` honors `GH_HOST` and
 *        `SSL_CERT_FILE`, so the real client stack runs against a local server — a swap, not a
 *        mock. `asGhSwapEnv` holds the three non-obvious details (empty `GH_TOKEN`, enterprise
 *        token, isolated `GH_CONFIG_DIR`); see its jsdoc for why each one matters
 */
const envWithGhSwap = (home: string) => ({
  HOME: home,
  ...asGhSwapEnv({
    host: ghSwap.server.host,
    certPath: ghSwap.server.certPath,
    configDir: ghSwap.configDir,
  }),
});

/**
 * .what = run `keyrack init` in a scene's temp repo and fail loud if it did not succeed
 * .why = every scene below leans on init to have built the encrypted manifest. a fire-and-forget
 *        call lets a failed init pass silently, and then each downstream row asserts against a repo
 *        that was never initialized — so a green row proves the wrong fact, and a red row blames
 *        the wrong cause. this raises the failure at its own site, with init's own output
 *        (`rule.forbid.failhide`, `rule.require.failloud`)
 * .note = a MalfunctionError, not a Constraint: an init that fails inside a fixture the suite
 *         itself just built is a broken harness, never a caller mistake
 */
const initKeyrackInScene = (input: { cwd: string }): void => {
  const result = invokeRhachetCliBinary({
    args: ['keyrack', 'init'],
    cwd: input.cwd,
    env: { HOME: input.cwd },
  });
  if (result.status !== 0)
    throw new MalfunctionError('scene setup failed: `keyrack init` did not succeed', {
      cwd: input.cwd,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    });
};

/**
 * .what = strip ansi codes and pty noise from output
 * .why = snapshots should be readable without escape sequences
 */
const cleanPtyOutput = (str: string): string => {
  const stripped = str
    .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '') // ANSI escape sequences
    .replace(/\x1B\]/g, '') // OSC sequences
    .replace(/\r/g, '') // carriage returns from PTY
    .replace(/·/g, '') // middle dots from PTY
    .replace(/\s+$/gm, '') // trim end-of-line whitespace
    .replace(/\/tmp\/rhachet-test-\d+-[a-z0-9]+/g, '/tmp/rhachet-test-XXXXX') // sanitize temp paths
    .replace(/node:events:[\s\S]*?Node\.js v[\d.]+/g, ''); // strip EPIPE stack trace noise from PTY

  // trim PTY echo noise before tree header
  const treeStart = stripped.indexOf('\u{1F510}');
  return stripped
    .slice(treeStart >= 0 ? treeStart : 0)
    .trim();
};

/**
 * .what = the live https stand-in every row dials, plus the isolated gh config dir
 * .why = one server for the whole file — each row is a separate CLI subprocess, so they cannot
 *        share an in-process fake any other way. the ephemeral port keeps parallel suites apart
 */
const ghSwap = useBeforeAll(async () => {
  const server = await genFakeGithubApiServer();
  // an isolated GH_CONFIG_DIR, so `gh` reads no ambient credential store (hermetic)
  const configDir = join(await genTempDir({ slug: 'gh-swap-config' }), 'gh');
  mkdirSync(configDir, { recursive: true });
  return { server, configDir };
});

describe('keyrack.vault.githubSecrets', () => {
  afterAll(async () => ghSwap.server.close());

  /**
   * [uc1] set key with PERMANENT_VIA_REPLICA via github.secrets vault
   */
  given('[case1] set key with PERMANENT_VIA_REPLICA', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-vault-github-secrets' });

      // keyrack init (creates encrypted manifest + ssh key discovery)
      initKeyrackInScene({ cwd: r.path });

      return r;
    });

    const envGhSwap = () => envWithGhSwap(repo.path);

    when('[t0] keyrack set --key --vault github.secrets --mech PERMANENT_VIA_REPLICA via pty', () => {
      const result = useBeforeAll(async () => {
        // invoke via pseudo-TTY helper so process.stdin.isTTY is true in the child
        // answers: secret value
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key NEW_SECRET --env test --vault github.secrets --mech PERMANENT_VIA_REPLICA`,
            'secret', // prompt pattern to watch for
            'my-secret-value-123', // answer
          ],
          {
            encoding: 'utf-8',
            cwd: repo.path,
            env: { ...process.env, ...envGhSwap() },
            timeout: 60000,
          },
        );
        return r;
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        const cleaned = cleanPtyOutput(result.stdout);
        expect(cleaned).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc2] get failfast for write-only vault (shows remote status)
   */
  given('[case2] get key from write-only github.secrets vault', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-vault-github-secrets' });

      // keyrack init
      initKeyrackInScene({ cwd: r.path });

      return r;
    });

    const envGhSwap = () => envWithGhSwap(repo.path);

    when('[t0] keyrack get --key for github.secrets key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', 'testorg.test.GITHUB_SECRET_KEY'],
          cwd: repo.path,
          env: envGhSwap(),
        }),
      );

      then('exits with non-zero status (write-only vault)', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stdout shows remote status', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc3] del key from github.secrets vault
   */
  given('[case3] del key from github.secrets vault', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-vault-github-secrets' });

      // keyrack init
      initKeyrackInScene({ cwd: r.path });

      return r;
    });

    const envGhSwap = () => envWithGhSwap(repo.path);

    when('[t0] keyrack del --key for github.secrets key', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'del', '--key', 'testorg.test.GITHUB_SECRET_KEY'],
          cwd: repo.path,
          env: envGhSwap(),
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  /**
   * [uc4] missing package.json repository field error
   */
  given('[case4] missing package.json repository field', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-vault-github-secrets' });

      // keyrack init
      initKeyrackInScene({ cwd: r.path });

      // remove repository field from package.json
      const pkgPath = `${r.path}/package.json`;
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      delete pkg.repository;
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

      return r;
    });

    const envGhSwap = () => envWithGhSwap(repo.path);

    when('[t0] keyrack set --vault github.secrets without repository field via pty', () => {
      const result = useBeforeAll(async () => {
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key NEW_SECRET --env test --vault github.secrets --mech PERMANENT_VIA_REPLICA`,
            'secret',
            'my-secret-value',
          ],
          {
            encoding: 'utf-8',
            cwd: repo.path,
            env: { ...process.env, ...envGhSwap() },
            timeout: 60000,
          },
        );
        return r;
      });

      then('exits with non-zero status', () => {
        expect(result.status).not.toEqual(0);
      });

      then('output shows repository field required error', () => {
        // error may appear in stdout or stderr per how the cli reports it
        const output = `${result.stdout}\n${result.stderr}`;
        const cleaned = cleanPtyOutput(output);
        // the set action renders a caller-fixable ConstraintError as a blocked treestruct
        // that NAMES ITS CLASS at the node; it roots on keyrack's own lock glyph 🔐 (no role
        // mascot), so assert the domain-rooted blocked node + the caller-relevant content
        // ⚠️ .note = the class name is CONTENT, never chrome — it is the one token that says
        //         the caller must fix this (and that the exit is 2, not 1). what the tree
        //         replaces is the flush-left exception DUMP, never the class itself
        //         (`rule.require.unabridged-error-prefix`)
        expect(cleaned).toContain('🔐');
        expect(cleaned).not.toContain('🐢');
        expect(cleaned).toContain('✋ ConstraintError: ');
        expect(cleaned).toContain('package.json.repository required');
        expect(cleaned).toContain('github.secrets vault');
      });
    });
  });

  /**
   * [uc5] set key with EPHEMERAL_VIA_GITHUB_APP via github.secrets vault
   * .why = verify guided setup flow works for github.secrets with ephemeral mech
   */
  given('[case5] set key with EPHEMERAL_VIA_GITHUB_APP', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-vault-github-secrets' });

      // keyrack init (creates encrypted manifest + ssh key discovery)
      initKeyrackInScene({ cwd: r.path });

      return r;
    });

    const envGhSwap = () => envWithGhSwap(repo.path);

    when('[t0] keyrack set --key --vault github.secrets --mech EPHEMERAL_VIA_GITHUB_APP via pty', () => {
      const result = useBeforeAll(async () => {
        // invoke via pseudo-TTY helper so process.stdin.isTTY is true in the child
        // org is derived from the key slug (no org prompt); the registry holds two apps
        // so app selection prompts. answers: 1 (my-test-app), pem path
        const r = spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key GITHUB_APP_SECRET --env test --vault github.secrets --mech EPHEMERAL_VIA_GITHUB_APP`,
            'choice|.pem',
            '1', './mock-app.pem',
          ],
          {
            encoding: 'utf-8',
            cwd: repo.path,
            env: { ...process.env, ...envGhSwap() },
            timeout: 60000,
          },
        );
        return r;
      });

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout matches snapshot', () => {
        const cleaned = cleanPtyOutput(result.stdout);
        expect(cleaned).toMatchSnapshot();
      });
    });
  });
});
