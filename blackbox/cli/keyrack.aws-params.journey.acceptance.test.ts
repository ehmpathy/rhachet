import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genFakeSsmServerDetached } from '@/blackbox/.test/infra/genFakeSsmServerDetached';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';
import { maskKeyrackGrantVolatiles } from '@/blackbox/.test/infra/maskKeyrackGrantVolatiles';

/**
 * .what = the end-to-end grove journey for the aws.params vault — a single replica
 *   credential walked through its whole lifecycle at the CLI contract boundary:
 *   set → locked → unlock (identity IS the unlock) → get serves the value → relock → locked
 *
 * .why = the vision's headline behavior (uc5) is "a box unlocks by its own identity and
 *   gets its credential with NO secret ever placed on it". the per-case suite
 *   (keyrack.vault.awsParams) proves the creds-free CLI contract (set-shape, help, gates,
 *   faulted-unlock exit code) but NEVER walks one credential through a POSITIVE unlock→get.
 *   this journey does, snapshotted at every checkpoint, so a regression to the headline
 *   path is caught at the exact boundary a human/grove uses.
 *
 * .backend = the positive unlock reads a REAL SSM SecureString. real AWS is not reachable
 *   creds-free in CI, so the blueprint's endpoint-swap seam points the REAL @aws-sdk/client-ssm
 *   at a local SSM stand-in that speaks the genuine AWS JSON 1.1 protocol: the full keyrack →
 *   declastruct → SDK → HTTP path runs verbatim, only the AWS service is local. that is a
 *   backend swap, not a mock (rule.forbid.acceptance.mocks holds) — no keyrack internal is
 *   faked. the override is honored only under NODE_ENV=test (the sanctioned test signal); a
 *   prod process ignores it (proven in keyrack.vault.awsParams c50).
 *
 * .backend-topology = the stand-in runs as its OWN DETACHED os process
 *   (genFakeSsmServerDetached), NOT an in-jest-worker http listener. this matters: a
 *   jest-spawned CLI subprocess CANNOT reach a listener that lives inside the jest worker (the
 *   worker's inbound loopback is blocked — proven empirically), but it CAN reach a separate
 *   detached process over loopback. so the SSM backend must live out of the worker for the
 *   spawned `rhx keyrack` subprocess to reach it. (the in-process genFakeSsmServer stays for
 *   integration tests, whose SDK call runs in the same worker and reaches an in-worker listener
 *   fine — see getOneKeyrackAwsParam.emulator.integration.test.ts.)
 *
 * .scope = the org=@all (grove) path, mech=PERMANENT_VIA_REPLICA. @all → the ambient IMDS
 *   identity, which in a test env is the dummy static env creds the subprocess carries; the
 *   SDK never reaches real IMDS. an explicit --exid is used because @all cannot ride the
 *   autocompute path (its '@' is outside SSM's legal charset) — so this also exercises uc2.
 *
 * .checkpoint-plan = the [tN] labels below are LOCAL to this reference journey; they are NOT the
 *   blueprint's [t0..t7] plan labels (a reader must not cross-reference by number alone). the
 *   mapping to the blueprint's [case1] checkpoint intents, so intent is unambiguous:
 *     [t0] set the replica key              → blueprint "register" (uc1/uc2)
 *     [t1] get before unlock → locked       → blueprint "get before unlock" (uc7)
 *     [t2] unlock (identity is the unlock)   → blueprint "unlock" (uc5)
 *     [t3] get after unlock → value served  → blueprint "get after unlock" (uc5)
 *     [t4] relock                            → blueprint "lock boundary"
 *     [t5] get after relock → locked again  → blueprint "TTL/lock elapse → locked" (uc8, via
 *                                              explicit relock — see .ttl-note)
 *     [t6] rotate upstream + re-unlock       → blueprint "rotation edge" (uc9)
 *   every checkpoint carries a toMatchSnapshot (volatile fields masked), so a regression to the
 *   human-seen output at any step is caught.
 *
 * .ttl-note = the daemon's max-duration AUTO-evict-by-timer is proven at the unit/integration
 *   grain (a wall-clock timer at the acceptance layer would flake CI); this journey proves the
 *   OBSERVABLE lock boundary (relock → locked, t5) and the staleness guarantee that motivates the
 *   TTL (a fetch after the lock boundary serves the ROTATED value, never a stale cache, t6) — the
 *   two regressions a TTL exists to prevent. so the acceptance layer covers the staleness/lock
 *   behavior; the timer arithmetic is covered where it is deterministic.
 *
 * .case2-note = the github-app mech's lifecycle is covered across grains; only ONE slice is
 *   genuinely infeasible creds-free at the CLI-subprocess layer, and this note records the split
 *   precisely so the asymmetry is explicit, not implicit (aws.params #61).
 *
 *   COVERED at the CLI-subprocess layer, exhaustively — keyrack.aws-params.githubApp.acceptance.test.ts
 *   walks the SET-side lifecycle through a REAL pseudo-TTY (pty-with-answers.js) + a mock-gh-cli app
 *   discovery seam, so the guided github-app flow runs creds-free: guided persist of the blob INTO
 *   SSM (case1 t0), list/manifest + SSM-write verify (case1 t1), an unreadable-pem set fails loud
 *   with no orphan entry (case2), del DESTROYS the SSM secret keyrack wrote and echoes it (case3),
 *   and a no-`--mech` set drives the interactive mechanism prompt (case4).
 *
 *   COVERED at the integration grain — setKeyrackAwsParamGithubApp.integration.test.ts (persist +
 *   roundtrip verify against the real SSM stand-in).
 *
 *   COVERED at the unit grain — mechAdapterGithubApp.test.ts (validate, the no-TTY acquireForSet
 *   guard, AND the mint's caller-fixable ERROR path: deliverForGet on a malformed private key throws
 *   a ConstraintError, provable creds-free because the bad key fails at the LOCAL jwt sign step
 *   before any network call).
 *
 *   NOT reachable creds-free — the POSITIVE mint (unlock→get a real ~1h installation token, and its
 *   TTL / re-mint). deliverForGet calls the real GitHub API via @octokit/auth-app and has NO
 *   endpoint-override seam, unlike the SSM read path's KEYRACK_AWS_SSM_ENDPOINT — so no CLI-subprocess
 *   nor in-process test can mint a token without a real GitHub App + installation. a full CLI mint
 *   journey would need a KEYRACK_GITHUB_API_ENDPOINT seam (symmetric to the SSM one, NODE_ENV=test
 *   gated) + a fake GitHub token-mint endpoint. that seam lives in mechAdapterGithubApp, which is
 *   SHARED by every github-app vault (os.secure too), so it is a cross-vault change beyond this
 *   vault's scope — flagged as a clean deferred follow-up, a documented DELIBERATE scope decision,
 *   never an unrecorded drift.
 */
const REGION = 'us-east-1';
// a synthetic key name guaranteed absent from the ambient env — a real key name (e.g.
// ANTHROPIC_API_KEY) would collide with an exported env var, and keyrack's os.envvar fallback
// would serve THAT, so the aws.params vault path this journey exists to prove never runs
const KEY = 'JOURNEY_AWS_PARAMS_SECRET';
const EXID = `/keyrack/journey/${KEY}`;
const SECRET = 'sk-ant-journey-seeded-fixture-value';
// the value the store is rotated to mid-journey (t6) — a DISTINCT value so the assertion proves a
// fresh fetch served the new value, not a stale cached seed
const SECRET_ROTATED = 'sk-ant-journey-rotated-fixture-value';

describe('keyrack vault aws.params journey (cli)', () => {
  beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

  given('[case1] a grove bootstraps an aws.params replica key end-to-end', () => {
    // a detached SSM stand-in (the set writes the secret into it), plus a temp repo whose host
    // manifest (owner=mechanic) the replica key registers into
    const scene = useBeforeAll(async () => {
      const ssm = await genFakeSsmServerDetached({ seed: [] });
      const repo = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });
      // pin the repo manifest to org=@all BEFORE init. keyrack init is findsert — it will NOT
      // overwrite a keyrack.yml already on disk (the fixture ships org: testorg) — so we rewrite
      // the file directly. org=@all is the grove scope: the repo-manifest hydration then builds
      // the SAME slug the @all set writes (@all.<env>.<key>), which lets a non-sudo get find the
      // daemon grant instead of a promoted 'absent', and routes the unlock identity to IMDS
      // (the dummy env creds) rather than an org profile.
      writeFileSync(join(repo.path, '.agent', 'keyrack.yml'), "org: '@all'\n");
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'mechanic', '--org', '@all'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
      return { ssm, repo };
    });

    afterAll(async () => {
      await scene.ssm.close();
    });

    // the env every aws.params invocation shares: HOME isolates the manifest/daemon, dummy
    // static creds satisfy the SDK default chain (the @all/IMDS identity), NODE_ENV=test opts
    // into the endpoint override, and KEYRACK_AWS_SSM_ENDPOINT points the SDK at the stand-in
    const envFor = (): Record<string, string | undefined> => ({
      HOME: scene.repo.path,
      AWS_REGION: REGION,
      AWS_ACCESS_KEY_ID: 'test-akid',
      AWS_SECRET_ACCESS_KEY: 'test-secret',
      NODE_ENV: 'test',
      KEYRACK_AWS_SSM_ENDPOINT: scene.ssm.url,
      // strip any inherited collision so the os.envvar fallback can never shadow the vault path
      [KEY]: undefined,
    });

    when('[t0] set the replica key (@all, explicit --exid, secret written into SSM via stdin)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            KEY,
            '--vault',
            'aws.params',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--owner',
            'mechanic',
            '--env',
            'test',
            '--org',
            '@all',
            '--exid',
            EXID,
          ],
          cwd: scene.repo.path,
          env: envFor(),
          stdin: SECRET,
          logOnError: false,
        }),
      );

      then('the set is accepted', () => {
        expect(result.status).toEqual(0);
      });

      then('it registers the key against the aws.params replica mech', () => {
        expect(result.stdout).toContain(KEY);
        expect(result.stdout).toContain('aws.params');
        expect(result.stdout).toContain('PERMANENT_VIA_REPLICA');
      });

      then('the secret value is never echoed back in stdout', () => {
        expect(result.stdout).not.toContain(SECRET);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] get before unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--owner',
            'mechanic',
            '--key',
            KEY,
            '--env',
            'test',
            '--org',
            '@all',
            '--json',
          ],
          cwd: scene.repo.path,
          env: envFor(),
          logOnError: false,
        }),
      );

      then('the key reads as locked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('it names the unlock fix', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('unlock');
      });

      then('the locked-before-unlock output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] unlock — the ambient identity IS the unlock (no prompt)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--owner',
            'mechanic',
            '--env',
            'test',
            '--key',
            KEY,
          ],
          cwd: scene.repo.path,
          env: envFor(),
          logOnError: true,
          // a wall-clock cap so a regression (the SDK dials real AWS instead of the stand-in)
          // surfaces as a failed result with its output, not a suite-wide stall
          timeoutMs: 30_000,
        }),
      );

      then('unlock succeeds with no human prompt', () => {
        expect(result.status).toEqual(0);
      });

      then('the unlocked key slug is surfaced', () => {
        expect(result.stdout).toContain(KEY);
      });

      then('stdout matches snapshot', () => {
        expect(
          maskKeyrackGrantVolatiles({ stdout: asSnapshotSafe(result.stdout) }),
        ).toMatchSnapshot();
      });
    });

    when('[t3] get after unlock — the value is served from the daemon', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--owner',
            'mechanic',
            '--key',
            KEY,
            '--env',
            'test',
            '--org',
            '@all',
            '--json',
          ],
          cwd: scene.repo.path,
          env: envFor(),
          logOnError: false,
        }),
      );

      // a second, human-default get (the tree a caller actually sees, NOT --json) —
      // snapshotted so the POSITIVE CLI get contract is proven at the acceptance grain, not
      // only its --json field shape. this closes the journey's headline checkpoint: unlock
      // truly makes the credential readable via the CLI (the value the vision's uc5 promises).
      const tree = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--owner',
            'mechanic',
            '--key',
            KEY,
            '--env',
            'test',
            '--org',
            '@all',
          ],
          cwd: scene.repo.path,
          env: envFor(),
          logOnError: false,
        }),
      );

      then('the key reads as granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('the served value is the secret written at set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual(SECRET);
      });

      then('the grant vault is aws.params', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.source.vault).toEqual('aws.params');
      });

      then('the human-default get output matches snapshot', () => {
        // redact the seeded value (defensive — the default tree shows status, not the secret)
        // + mask volatile grant fields (expiresAt), for a stable positive-path CLI contract snap
        expect(
          maskKeyrackGrantVolatiles({
            stdout: asSnapshotSafe(tree.stdout.split(SECRET).join('__SECRET__')),
          }),
        ).toMatchSnapshot();
      });
    });

    when('[t4] relock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock', '--owner', 'mechanic', '--env', 'test'],
          cwd: scene.repo.path,
          env: envFor(),
          logOnError: false,
        }),
      );

      then('relock succeeds', () => {
        expect(result.status).toEqual(0);
      });

      then('the relock output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t5] get after relock — locked again, needs a fresh unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--owner',
            'mechanic',
            '--key',
            KEY,
            '--env',
            'test',
            '--org',
            '@all',
            '--json',
          ],
          cwd: scene.repo.path,
          env: envFor(),
          logOnError: false,
        }),
      );

      then('the key reads as locked again', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('the locked-after-relock output matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    // [t6] rotation edge — the value is rotated UPSTREAM in the store between sessions, then the
    // grove re-unlocks. this is the staleness regression the reviewer flagged as uncovered: a
    // fetch after relock must serve the NEWLY-rotated value, never a stale cached one. the rotation
    // is a real PutParameter (Overwrite:true, SecureString) POSTed to the same detached stand-in
    // the SDK reads from — so the store genuinely holds a new value before the re-unlock, and the
    // whole keyrack → declastruct → SDK → HTTP read path re-runs against it (no cache shortcut).
    when('[t6] the value is rotated upstream, then the grove re-unlocks', () => {
      const rotated = useBeforeAll(async () => {
        // overwrite the set-written SecureString at EXID with a new value, straight into the
        // stand-in (the AWS JSON 1.1 PutParameter wire shape the stand-in speaks). Type MUST stay
        // SecureString — keyrack's gate 6 refuses a plaintext String — and Overwrite:true so the
        // re-put replaces the prior value rather than a ParameterAlreadyExists reject
        await fetch(`${scene.ssm.url}/`, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-amz-json-1.1',
            'x-amz-target': 'AmazonSSM.PutParameter',
          },
          body: JSON.stringify({
            Name: EXID,
            Value: SECRET_ROTATED,
            Type: 'SecureString',
            Overwrite: true,
          }),
        });

        // re-unlock: the daemon is empty (relocked in t4), so this re-fetches from the store —
        // which now serves the rotated value — via the real SDK path, no cache shortcut
        const unlock = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--owner',
            'mechanic',
            '--env',
            'test',
            '--key',
            KEY,
          ],
          cwd: scene.repo.path,
          env: envFor(),
          logOnError: true,
          timeoutMs: 30_000,
        });

        // read the freshly-unlocked value from the daemon
        const get = await invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--owner',
            'mechanic',
            '--key',
            KEY,
            '--env',
            'test',
            '--org',
            '@all',
            '--json',
          ],
          cwd: scene.repo.path,
          env: envFor(),
          logOnError: false,
        });

        return { unlock, get };
      });

      then('the re-unlock succeeds', () => {
        expect(rotated.unlock.status).toEqual(0);
      });

      then('the NEWLY-rotated value is served, never the stale seed', () => {
        const parsed = JSON.parse(rotated.get.stdout);
        expect(parsed.grant.key.secret).toEqual(SECRET_ROTATED);
        expect(parsed.grant.key.secret).not.toEqual(SECRET);
      });

      then('the rotated-unlock output matches snapshot', () => {
        expect(
          maskKeyrackGrantVolatiles({
            stdout: asSnapshotSafe(rotated.unlock.stdout),
          }),
        ).toMatchSnapshot();
      });
    });
  });
});
