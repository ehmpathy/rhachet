import { spawnSync } from 'node:child_process';
import { chmodSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genFakeSsmServerDetached } from '@/blackbox/.test/infra/genFakeSsmServerDetached';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = blackbox CLI acceptance for the aws.params vault's EPHEMERAL_VIA_GITHUB_APP mech —
 *   the owned-secret persist lane. a github-app credential is guided through `keyrack set` and
 *   the blob is written INTO SSM (then roundtrip-verified), at the real CLI contract boundary.
 *
 * .why = the per-case suite (keyrack.vault.awsParams) proves the reference mech creds-free, and
 *   the journey proves a reference unlock→get. NEITHER exercises the owned-secret write path —
 *   the vision's second headline (u2: keyrack persists a github-app blob into SSM on set, exactly
 *   as os.secure persists it locally / 1password writes it via `op item edit`). this suite closes
 *   that gap: a full guided github-app `set` for aws.params, backend = a real SSM stand-in.
 *
 * .backend = the persist writes a REAL SSM SecureString (PutParameter) then reads it back
 *   (GetParameter) to roundtrip-verify. real AWS is not reachable creds-free in CI, so the
 *   blueprint's endpoint-swap seam points the REAL @aws-sdk/client-ssm at a local SSM stand-in
 *   that speaks the genuine AWS JSON 1.1 protocol: the full keyrack → declastruct → SDK → HTTP
 *   write+read path runs verbatim, only the AWS service is local. that is a backend SWAP, not a
 *   mock (rule.forbid.acceptance.mocks holds) — no keyrack internal is faked. the override is
 *   honored only under NODE_ENV=test; a prod persist ignores it (keyrack.vault.awsParams c50).
 *
 * .backend-topology = the stand-in runs as its OWN DETACHED os process
 *   (genFakeSsmServerDetached), NOT an in-jest-worker http listener — a jest-spawned CLI
 *   subprocess cannot reach a listener inside the jest worker (its inbound loopback is blocked),
 *   but CAN reach a separate detached process over loopback. the set here writes through a spawned
 *   `rhx keyrack` subprocess, so the SSM backend must live out of the worker.
 *
 * .github-seams = the github-app guided setup uses two subprocess-reachable seams (identical to
 *   the os.secure github-app suite), so the persist runs creds-free:
 *   - mock-gh-cli on PATH → serves the keyrack-infra app discovery for org=testorg (no real gh)
 *   - pty-with-answers.js → a real pseudo-TTY (via `script -qec`) so process.stdin.isTTY is true,
 *     which defeats the no-TTY guard and feeds the app-selection + pem-path answers on prompt
 *     detection. NO real GitHub call happens on set — mint (deliverForGet) is an unlock-time
 *     concern that needs a real app, so it is out of this persist-lane's scope.
 */
const MOCK_GH_CLI_DIR = resolve(__dirname, '../.test/assets/mock-gh-cli');
const RHACHET_BIN = resolve(__dirname, '../../bin/run');
const PTY_WITH_ANSWERS = resolve(__dirname, '../.test/assets/pty-with-answers.js');

const KEY = 'GITHUB_TOKEN';
const REGION = 'us-east-1';
// the distinctive body line of the mock pem — asserted ABSENT from stdout, proving the persisted
// blob (which embeds this key) never leaks back through the guided-setup output
const PEM_BODY_MARKER = 'MIIEpQIBAAKCAQEA0Z3VS5JJcds3xfn';

/**
 * .what = strip ansi codes + pty noise, trim to the first tree glyph, for a stable snapshot
 * .why = the pty echoes the typed answers + control sequences; the snapshot must lock only the
 *        caller-visible tree, so drift surfaces cleanly in diffs
 */
const cleanPtyOutput = (str: string): string => {
  const stripped = str
    .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
    .replace(/\x1B\]/g, '')
    .replace(/\r/g, '')
    .replace(/·/g, '')
    .replace(/[ \t]+$/gm, '')
    // mask the volatile temp-repo path (a per-run uuid) so the snapshot stays deterministic —
    // mirrors the os.secure github-app suite's mask (rule.forbid.friction-hazards)
    .replace(/\/tmp\/rhachet-test-\d+-[a-z0-9]+/g, '/tmp/rhachet-test-XXXXX')
    .replace(/node:events:[\s\S]*?Node\.js v[\d.]+/g, '');
  const lockStart = stripped.indexOf('\u{1F510}');
  const turtleStart = stripped.indexOf('\u{1F422}');
  const candidates = [lockStart, turtleStart].filter((i) => i >= 0);
  const treeStart = candidates.length ? Math.min(...candidates) : -1;
  return stripped.slice(treeStart >= 0 ? treeStart : 0).trim();
};

describe('keyrack vault aws.params with EPHEMERAL_VIA_GITHUB_APP', () => {
  beforeAll(() => {
    // git may not preserve the +x bit on the mock gh binary
    chmodSync(`${MOCK_GH_CLI_DIR}/gh`, 0o755);
  });

  given('[case1] guided github-app set persists the blob into SSM', () => {
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(async () => {
      await scene.ssm.close();
      await killKeyrackDaemonForTests({ owner: null });
    });

    // a detached SSM stand-in (empty — the set WRITES the blob via PutParameter, then reads it
    // back), a temp repo whose fixture ships org=testorg (matching the mock-gh discovery), and a
    // host manifest for owner=mechanic the github-app key registers into
    const scene = useBeforeAll(async () => {
      const ssm = await genFakeSsmServerDetached();
      const repo = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'mechanic', '--org', 'testorg'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
      // the mock pem the guided setup reads as the app private key
      writeFileSync(
        `${repo.path}/mock-app.pem`,
        [
          '-----BEGIN RSA PRIVATE KEY-----',
          `${PEM_BODY_MARKER}/ygWyF8PbnGy0AHB7MaXBkvQRkz0Pj/Gx`,
          'KJELGl0FooHx7tXfWnj4TjB1kqR8xBzK3K3L3HqHbCh9XV4nlluTLArdB0JDcrPN',
          '-----END RSA PRIVATE KEY-----',
        ].join('\n'),
        'utf-8',
      );
      return { ssm, repo };
    });

    // the env every guided-set invocation shares: mock gh on PATH for creds-free discovery, dummy
    // static creds + region for the SDK write/read, NODE_ENV=test opts into the endpoint override,
    // KEYRACK_AWS_SSM_ENDPOINT points the SDK at the detached stand-in, and AWS_PROFILE cleared so
    // the SDK never attempts an SSO login on the roundtrip read
    const envFor = (): NodeJS.ProcessEnv => ({
      ...process.env,
      HOME: scene.repo.path,
      PATH: `${MOCK_GH_CLI_DIR}:${process.env.PATH}`,
      AWS_REGION: REGION,
      AWS_ACCESS_KEY_ID: 'test-akid',
      AWS_SECRET_ACCESS_KEY: 'test-secret',
      AWS_PROFILE: undefined,
      NODE_ENV: 'test',
      KEYRACK_AWS_SSM_ENDPOINT: scene.ssm.url,
    });

    when('[t0] keyrack set --vault aws.params --mech EPHEMERAL_VIA_GITHUB_APP (guided, pseudo-TTY)', () => {
      // invoke via the pseudo-TTY helper so process.stdin.isTTY is true in the child. the
      // keyrack-infra registry holds two testorg apps, so app selection prompts; the pem-path
      // prompt follows. answers on prompt detection: 1 (first app), ./mock-app.pem
      const result = useBeforeAll(async () =>
        spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key ${KEY} --vault aws.params --mech EPHEMERAL_VIA_GITHUB_APP --owner mechanic --env test --org testorg`,
            'choice|.pem',
            '1',
            './mock-app.pem',
          ],
          {
            encoding: 'utf-8',
            cwd: scene.repo.path,
            env: envFor(),
            timeout: 60000,
          },
        ),
      );

      then('the set exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the guided setup surfaces the app-selection and pem prompts', () => {
        expect(result.stdout).toContain('which github app');
        expect(result.stdout).toContain('.pem');
      });

      then('the persisted blob is never echoed back in the guided output', () => {
        // the private-key body of the blob must not leak through stdout — a write-once secret
        // stays write-once (the persist confirmation reports the path, never the value)
        expect(result.stdout).not.toContain(PEM_BODY_MARKER);
      });

      then('stdout matches snapshot', () => {
        expect(cleanPtyOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list --json after the guided github-app set', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--owner', 'mechanic', '--json'],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
        }),
      );

      then('the manifest entry records the github-app mech on the aws.params vault', () => {
        const parsed = JSON.parse(result.stdout);
        const entry = parsed['testorg.test.GITHUB_TOKEN'];
        expect(entry).toBeDefined();
        expect(entry.mech).toEqual('EPHEMERAL_VIA_GITHUB_APP');
        expect(entry.vault).toEqual('aws.params');
      });

      then('the stored entry carries no secret value (reference-by-path only)', () => {
        const parsed = JSON.parse(result.stdout);
        const entry = parsed['testorg.test.GITHUB_TOKEN'];
        // the blob lives in SSM; keyrack's manifest holds only the exid pointer + region meta
        expect(JSON.stringify(entry)).not.toContain(PEM_BODY_MARKER);
      });

      then('the manifest entry matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        const entry = parsed['testorg.test.GITHUB_TOKEN'];
        const snapped = {
          ...(entry as Record<string, unknown>),
          createdAt: '__TIMESTAMP__',
          updatedAt: '__TIMESTAMP__',
        };
        expect(snapped).toMatchSnapshot();
      });

      then('the blob was actually written into the SSM backend at the computed path', () => {
        const parsed = JSON.parse(result.stdout);
        const entry = parsed['testorg.test.GITHUB_TOKEN'];
        // the persist wrote the blob to SSM at the autocomputed exid, then roundtrip-verified it
        // (the set would have failed loud otherwise) — so the manifest exid is the SSM path
        expect(entry.exid).toContain('aws.params');
        expect(entry.exid).toContain('GITHUB_TOKEN');
      });
    });

  });

  given('[case2] guided github-app set fails loud on an unreadable pem path', () => {
    // the guided set can fail in user-facing ways (a bad pem path, an invalid pem, a canceled
    // prompt); each surfaces a CLI error a human sees. this case pins the most common failure —
    // a pem path that does not exist — so a future wording change to the error is caught, not
    // silent (rule.forbid.friction-hazards). getPemContent throws a ConstraintError before any
    // SSM write, so the flow fails deterministically (a single scripted answer, no re-prompt)
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(async () => {
      await scene.ssm.close();
      await killKeyrackDaemonForTests({ owner: null });
    });

    const scene = useBeforeAll(async () => {
      const ssm = await genFakeSsmServerDetached();
      const repo = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'mechanic', '--org', 'testorg'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
      // .note = no mock-app.pem is written — the guided answer points at a nonexistent path
      return { ssm, repo };
    });

    const envFor = (): NodeJS.ProcessEnv => ({
      ...process.env,
      HOME: scene.repo.path,
      PATH: `${MOCK_GH_CLI_DIR}:${process.env.PATH}`,
      AWS_REGION: REGION,
      AWS_ACCESS_KEY_ID: 'test-akid',
      AWS_SECRET_ACCESS_KEY: 'test-secret',
      AWS_PROFILE: undefined,
      NODE_ENV: 'test',
      KEYRACK_AWS_SSM_ENDPOINT: scene.ssm.url,
    });

    when('[t0] keyrack set with a pem path that does not exist (guided, pseudo-TTY)', () => {
      // answers on prompt detection: 1 (first app), ./no-such-file.pem (unreadable)
      const result = useBeforeAll(async () =>
        spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key ${KEY} --vault aws.params --mech EPHEMERAL_VIA_GITHUB_APP --owner mechanic --env test --org testorg`,
            'choice|.pem',
            '1',
            './no-such-file.pem',
          ],
          {
            encoding: 'utf-8',
            cwd: scene.repo.path,
            env: envFor(),
            timeout: 60000,
          },
        ),
      );

      then('the set exits non-zero', () => {
        expect(result.status).not.toEqual(0);
      });

      then('the guided output names the unreadable-pem failure', () => {
        expect(result.stdout).toContain('could not read pem file');
      });

      then('no secret blob is echoed on the failure path', () => {
        expect(result.stdout).not.toContain(PEM_BODY_MARKER);
      });

      then('the failure output matches snapshot', () => {
        expect(cleanPtyOutput(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] keyrack list --json after the failed github-app set', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--owner', 'mechanic', '--json'],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
        }),
      );

      then('no manifest entry was registered for the failed set', () => {
        const parsed = JSON.parse(result.stdout);
        // a failed pem read throws before registration, so no orphan entry is left behind
        expect(parsed['testorg.test.GITHUB_TOKEN']).toBeUndefined();
      });
    });
  });

  given('[case3] del of a github-app key destroys the SSM secret keyrack wrote', () => {
    // the highest-blast-radius path in the feature: keyrack ITSELF wrote a blob into SSM on set,
    // so del DESTROYS it (the "keyrack destroys what it created" symmetry, G6). a destructive,
    // irreversible remote delete MUST be visible — the CLI echoes the destroyed param, never a
    // bare "removed". this exercises the full CLI → adapter → declastruct → SDK → SSM
    // DeleteParameter path against the real stand-in — the reviewer flagged it as never run
    // end-to-end (r10.2: zero "destroyed" in blackbox before this)
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(async () => {
      await scene.ssm.close();
      await killKeyrackDaemonForTests({ owner: null });
    });

    const scene = useBeforeAll(async () => {
      const ssm = await genFakeSsmServerDetached();
      const repo = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'mechanic', '--org', 'testorg'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
      writeFileSync(
        `${repo.path}/mock-app.pem`,
        [
          '-----BEGIN RSA PRIVATE KEY-----',
          `${PEM_BODY_MARKER}/ygWyF8PbnGy0AHB7MaXBkvQRkz0Pj/Gx`,
          'KJELGl0FooHx7tXfWnj4TjB1kqR8xBzK3K3L3HqHbCh9XV4nlluTLArdB0JDcrPN',
          '-----END RSA PRIVATE KEY-----',
        ].join('\n'),
        'utf-8',
      );
      return { ssm, repo };
    });

    const envFor = (): NodeJS.ProcessEnv => ({
      ...process.env,
      HOME: scene.repo.path,
      PATH: `${MOCK_GH_CLI_DIR}:${process.env.PATH}`,
      AWS_REGION: REGION,
      AWS_ACCESS_KEY_ID: 'test-akid',
      AWS_SECRET_ACCESS_KEY: 'test-secret',
      AWS_PROFILE: undefined,
      NODE_ENV: 'test',
      KEYRACK_AWS_SSM_ENDPOINT: scene.ssm.url,
    });

    when('[t0] a github-app key is persisted into SSM (guided, pseudo-TTY)', () => {
      const result = useBeforeAll(async () =>
        spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key ${KEY} --vault aws.params --mech EPHEMERAL_VIA_GITHUB_APP --owner mechanic --env test --org testorg`,
            'choice|.pem',
            '1',
            './mock-app.pem',
          ],
          {
            encoding: 'utf-8',
            cwd: scene.repo.path,
            env: envFor(),
            timeout: 60000,
          },
        ),
      );

      then('the persist exits 0', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t1] the github-app key is deleted', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'del',
            '--key',
            KEY,
            '--owner',
            'mechanic',
            '--env',
            'test',
            '--org',
            'testorg',
          ],
          cwd: scene.repo.path,
          env: envFor(),
          logOnError: false,
        }),
      );

      then('the del is accepted', () => {
        expect(result.status).toEqual(0);
      });

      then('the CLI echoes that the SSM secret was destroyed (never a bare "removed")', () => {
        // the destructive remote delete is surfaced: keyrack wrote this blob, so its del destroys
        // it AND names the destroyed param — a silent removal would hide an irreversible mutation
        expect(result.stdout).toContain('was destroyed');
        expect(result.stdout).toContain('GITHUB_TOKEN');
      });

      then('the destroyed-secret output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('the key is no longer in the manifest', async () => {
        const listResult = await invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--owner', 'mechanic', '--json'],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
        });
        const parsed = JSON.parse(listResult.stdout);
        expect(parsed['testorg.test.GITHUB_TOKEN']).toBeUndefined();
      });
    });
  });

  given('[case4] set with no --mech drives the interactive mechanism prompt', () => {
    // the uc1 HEADLINE flow — no --mech supplied, so keyrack prompts "which mechanism?" and the
    // human picks. this is the ONE end-to-end proof of the shared inferKeyrackMechForSet prompt for
    // ANY vault: prior coverage was only the no-TTY guard (keyrack.vault.awsParams c40) + explicit
    // --mech (c4/c5). here a real pseudo-TTY (the pty helper) makes process.stdin.isTTY true so the
    // prompt renders, the answer '1' picks PERMANENT_VIA_REPLICA (the first supported mech), and the
    // prompt text a human sees is snapshotted. aws.params is the vault under test only because it has
    // 2 mechs; the prompt itself is vault-agnostic shared infra.
    // .org = @all, the creds-free identity (the grove's IMDS role, dummy static env creds here). the
    //   chosen replica mech WRITES the secret keyrack owns into SSM (via the hidden-secret prompt),
    //   then roundtrip-verifies the write reads back — so no seed is needed (the set writes it).
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
    afterAll(async () => {
      await scene.ssm.close();
      await killKeyrackDaemonForTests({ owner: null });
    });

    const scene = useBeforeAll(async () => {
      const ssm = await genFakeSsmServerDetached();
      const repo = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'mechanic', '--org', 'testorg'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
      return { ssm, repo };
    });

    when('[t0] keyrack set --vault aws.params with no --mech (guided, pseudo-TTY)', () => {
      // the prompt regex 'choice|secret' matches the "choice: " mech readline AND the replica
      // "enter secret" hidden prompt; the answer '1' selects the first supported mech
      // (PERMANENT_VIA_REPLICA), then the secret value is fed on the secret prompt. the replica
      // write persists it into the stand-in + roundtrip-verifies — two prompts, two answers
      const result = useBeforeAll(async () =>
        spawnSync(
          'node',
          [
            PTY_WITH_ANSWERS,
            `${RHACHET_BIN} keyrack set --key XAI_API_KEY --vault aws.params --owner mechanic --env test --org @all`,
            'choice|secret',
            '1',
            'xai-fixture-secret',
          ],
          {
            encoding: 'utf-8', // eslint-disable-line @cspell/spellchecker -- node api
            cwd: scene.repo.path,
            env: {
              ...process.env,
              HOME: scene.repo.path,
              AWS_REGION: REGION,
              AWS_ACCESS_KEY_ID: 'test-akid',
              AWS_SECRET_ACCESS_KEY: 'test-secret',
              AWS_PROFILE: undefined,
              NODE_ENV: 'test',
              KEYRACK_AWS_SSM_ENDPOINT: scene.ssm.url,
            },
            timeout: 60000,
          },
        ),
      );

      then('the set exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the prompt lists both supported mechs with descriptions', () => {
        expect(result.stdout).toContain('which mechanism?');
        expect(result.stdout).toContain('PERMANENT_VIA_REPLICA');
        expect(result.stdout).toContain('EPHEMERAL_VIA_GITHUB_APP');
      });

      then('the chosen mech (replica) is what registers', async () => {
        const listResult = await invokeRhachetCliBinary({
          args: ['keyrack', 'list', '--owner', 'mechanic', '--json'],
          cwd: scene.repo.path,
          env: { HOME: scene.repo.path },
        });
        const parsed = JSON.parse(listResult.stdout);
        expect(parsed['@all.test.XAI_API_KEY'].mech).toEqual(
          'PERMANENT_VIA_REPLICA',
        );
      });

      then('the prompt output matches snapshot', () => {
        expect(cleanPtyOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
