import { given, then, useBeforeAll, when } from 'test-fns';

import { genFakeSsmServerDetached } from '@/blackbox/.test/infra/genFakeSsmServerDetached';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';
import { maskKeyrackGrantVolatiles } from '@/blackbox/.test/infra/maskKeyrackGrantVolatiles';

// a replica set WRITES the secret into a real local SSM stand-in (a backend swap, not a mock), then
// roundtrip-verifies it reads back at the computed name (owner=mechanic, machine-wide @all)
const REGION = 'us-east-1';

// the env a live-backend aws.params invocation carries: HOME isolates the manifest/daemon, dummy
// static creds satisfy the SDK default chain (the @all/IMDS identity in a test env), NODE_ENV=test
// opts into the endpoint override, and KEYRACK_AWS_SSM_ENDPOINT points the real SDK at the stand-in.
// the key is stripped so an os.envvar fallback can never shadow the vault path. AWS_PROFILE is
// stripped so an inherited shell profile can never shadow the dummy static creds: these are @all
// (grove) cases, whose ONLY ambient identity is the instance role (the static creds here stand in
// for IMDS) — no profile. the replica set captures the machine's ambient identity at set-time, so a
// leaked AWS_PROFILE would otherwise win over the static creds (the SDK prefers a profile) and read
// as "no AWS identity"
const envLive = (input: {
  home: string;
  ssmUrl: string;
  key: string;
}): Record<string, string | undefined> => ({
  HOME: input.home,
  AWS_REGION: REGION,
  AWS_PROFILE: undefined,
  AWS_ACCESS_KEY_ID: 'test-akid',
  AWS_SECRET_ACCESS_KEY: 'test-secret',
  NODE_ENV: 'test',
  KEYRACK_AWS_SSM_ENDPOINT: input.ssmUrl,
  [input.key]: undefined,
});

/**
 * .what = blackbox CLI acceptance for the aws.params vault surface (creds-free)
 *
 * .why = prove the user-faced CLI contract without AWS:
 *   - `keyrack set --vault aws.params` is ACCEPTED (was rejected as invalid before)
 *   - an unsupported --mech for aws.params is rejected + names the supported set
 *   - the general `keyrack set --help` stays CLEAN of aws.params prereqs (the wisher
 *     ruled vault-specific region/owner/IAM/KMS copy must not clutter the global help
 *     every non-aws user reads); those prereqs surface REACTIVELY in the error paths
 *
 * .scope = the CLI contract layer; the live SSM read/write is proven in the adapter
 *   + communicator integration tests (real backend, no mock)
 */
describe('keyrack vault aws.params (cli)', () => {
  // the replica roundtrip cases touch the daemon (unlock pushes, get reads); clear any prior
  // daemon state so a stale grant cannot mask a regression
  beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

  given('[case1] the aws.params vault is a valid --vault value', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] keyrack set with an unsupported --mech for aws.params', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'TEST',
            '--vault',
            'aws.params',
            '--mech',
            'EPHEMERAL_VIA_AWS_SSO',
            '--owner',
            'mechanic',
            '--env',
            'test',
            '--org',
            'ehmpathy',
          ],
          cwd: repo.path,
          env: { HOME: repo.path, AWS_REGION: 'us-east-1' },
          logOnError: false,
        }),
      );

      then('the vault itself is accepted (no "invalid --vault" error)', () => {
        expect(result.stderr).not.toContain('invalid --vault');
      });

      then('exits non-zero (the mech is what fails, not the vault)', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] keyrack set with PERMANENT_VIA_REFERENCE (dropped from aws.params)', () => {
      // aws.params no longer supports the reference mech — it only manages secrets it owns
      // (a replica copy or a github-app blob). a reference set must be rejected + name the
      // supported set, never silently accepted
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'TEST',
            '--vault',
            'aws.params',
            '--mech',
            'PERMANENT_VIA_REFERENCE',
            '--owner',
            'mechanic',
            '--env',
            'test',
            '--org',
            'ehmpathy',
          ],
          cwd: repo.path,
          env: { HOME: repo.path, AWS_REGION: 'us-east-1' },
          logOnError: false,
        }),
      );

      then('the vault itself is accepted (no "invalid --vault" error)', () => {
        expect(result.stderr).not.toContain('invalid --vault');
      });

      then('exits non-zero (reference is not a supported aws.params mech)', () => {
        expect(result.status).not.toEqual(0);
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case2] the general keyrack set --help stays clean of aws.params prereqs', () => {
    // the wisher ruled that vault-specific prerequisites must NOT clutter the global `set` help
    // every non-aws user reads. so `set --help` still lists aws.params as ONE vault option, but
    // carries NONE of its region/owner/IAM/KMS prereq copy — those stay discoverable REACTIVELY,
    // where they bite: the region-absent (case7), owner-absent, and AccessDenied errors each name
    // their fix + the exact grant. this pins the clean-global-help contract so a future change
    // cannot silently re-pollute it
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-keyrack-manifest' }),
    );

    when('[t0] keyrack set --help', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'set', '--help'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('help lists aws.params as a vault option', () => {
        expect(result.stdout).toContain('aws.params');
      });

      then('help does NOT carry the aws.params AWS_REGION prereq copy', () => {
        expect(result.stdout).not.toContain('AWS_REGION');
      });

      then('help does NOT carry the per-mech IAM/KMS grant copy', () => {
        expect(result.stdout).not.toContain('ssm:GetParameter');
        expect(result.stdout).not.toContain('kms:Decrypt');
        expect(result.stdout).not.toContain('ssm:PutParameter');
        expect(result.stdout).not.toContain('kms:Encrypt');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  // a host manifest for owner=mechanic must exist before a `set` can register into it.
  // gen the temp repo, then init the host manifest for that owner (auto-discovers the
  // fixture's .ssh key as the age recipient) so the set flow reaches the aws.params path
  const genAwsParamsScene = async (): Promise<{ path: string }> => {
    const scene = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });
    await invokeRhachetCliBinary({
      args: ['keyrack', 'init', '--owner', 'mechanic', '--org', 'testorg'],
      cwd: scene.path,
      env: { HOME: scene.path },
      logOnError: false,
    });
    return scene;
  };

  given('[case3] set with no --mech on a non-terminal stdin (c40, unattended)', () => {
    const repo = useBeforeAll(async () => genAwsParamsScene());

    // aws.params supports 2 mechs, so an omitted --mech would prompt. a provision task
    // has no terminal to answer that prompt — it must fail loud, never block forever
    when('[t0] keyrack set --vault aws.params with no --mech, stdin not a tty', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'XAI_API_KEY',
            '--vault',
            'aws.params',
            '--owner',
            'mechanic',
            '--env',
            'test',
            '--org',
            'testorg',
          ],
          cwd: repo.path,
          env: { HOME: repo.path, AWS_REGION: 'us-east-1' },
          logOnError: false,
        }),
      );

      then('it fails loud instead of a blocked prompt', () => {
        expect(result.status).not.toEqual(0);
        expect(result.stderr).toContain('stdin is not a terminal');
      });

      then('the error names --mech as the fix', () => {
        expect(result.stderr).toContain('--mech');
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case5] unlock exits non-zero when an aws.params key faults (G5, c45)', () => {
    // the grove use case chains `unlock && start-app`, so the unlock PROCESS EXIT CODE is
    // decisive: a silent exit 0 with an absent credential would let the app start
    // credential-less. G5 routes a per-key live-fault to keysOmitted reason 'errored' and the
    // CLI sets a non-zero exit. the replica key is registered fine against the live SSM stand-in
    // (its write + roundtrip verify), then unlock is pointed at a DEAD endpoint so the fetch faults —
    // the key errors and the batch exits non-zero. this is the single highest-leverage line: a
    // regression makes the grove start credential-less rather than fail loud
    const KEY = 'XAI_API_KEY';
    const SECRET = 'xai-fixture-secret-value';
    const scene = useBeforeAll(async () => {
      const ssm = await genFakeSsmServerDetached({ seed: [] });
      const repo = await genAwsParamsScene();
      // register a replica aws.params key — the secret writes + verifies against the live stand-in
      await invokeRhachetCliBinary({
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
        ],
        cwd: repo.path,
        env: envLive({ home: repo.path, ssmUrl: ssm.url, key: KEY }),
        stdin: SECRET,
        logOnError: false,
      });
      return { ssm, repo };
    });
    afterAll(async () => scene.ssm.close());

    when('[t0] keyrack unlock runs against a dead SSM endpoint', () => {
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
          // point at a closed port → the fetch connection is refused → a live get-fault, exactly
          // the G5 'errored' path (the key registered fine; only the unlock read faults)
          env: envLive({
            home: scene.repo.path,
            ssmUrl: 'http://127.0.0.1:9',
            key: KEY,
          }),
          logOnError: false,
        }),
      );

      then('the unlock exits NON-ZERO (the G5 automation contract)', () => {
        expect(result.status).not.toEqual(0);
      });

      then('the faulted key is surfaced, never silently dropped', () => {
        const output = `${result.stdout}${result.stderr}`;
        expect(output).toContain(KEY);
      });

      // the operator-seen errored-key render is deterministic (fixed slug + region), so pin it
      // with a snapshot — a future change to the errored branch's copy or structure is caught
      then('the errored-key output matches snapshot', () => {
        const output = `${result.stdout}${result.stderr}`;
        expect(asSnapshotSafe(output)).toMatchSnapshot();
      });
    });
  });

  given('[case7] set fails loud when AWS_REGION is absent (region gate, c19)', () => {
    // region is NOT ambient — the SDK does not derive it from IMDS — so a replica set with no
    // AWS_REGION (nor AWS_DEFAULT_REGION) must fail loud + name the fix, never silently register a
    // region-less key that only breaks at a later unattended unlock. every other case in this
    // suite passes AWS_REGION explicitly, so this pins the CLI surface of the region gate a human
    // hits on the most likely first-run mistake (forgot to export AWS_REGION). creds-free: the
    // region throw fires before any SSM call
    const repo = useBeforeAll(async () => genAwsParamsScene());

    when('[t0] keyrack set --vault aws.params with no region in the env', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'XAI_API_KEY',
            '--vault',
            'aws.params',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--owner',
            'mechanic',
            '--env',
            'test',
            '--org',
            'testorg',
          ],
          cwd: repo.path,
          // undefined removes an inherited value from the merged env — so BOTH region sources are
          // truly absent (the harness merges process.env, which may carry AWS_REGION)
          env: {
            HOME: repo.path,
            AWS_REGION: undefined,
            AWS_DEFAULT_REGION: undefined,
          },
          logOnError: false,
        }),
      );

      then('it fails loud (non-zero) instead of a region-less register', () => {
        expect(result.status).not.toEqual(0);
      });

      then('the error states the region requirement and the fix', () => {
        const output = `${result.stdout}${result.stderr}`;
        expect(output).toContain('requires a region');
        expect(output).toContain('AWS_REGION');
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case9] set fails loud when --owner is omitted (owner gate, c49)', () => {
    // owner is a MANDATORY segment of the computed param name — the CLI never defaults it (deriveOwner
    // returns null when --owner/--for and the global owner are all absent). every other case in this
    // suite passes --owner mechanic, so "the human forgot --owner" is proven only at the transformer
    // unit grain (asKeyrackAwsParamName.test.ts c21), never at the CLI surface a human sees. this pins
    // that surface: an omitted --owner fails loud + names owner as the fix, never a silent register
    const repo = useBeforeAll(async () => genAwsParamsScene());

    when('[t0] keyrack set --vault aws.params with no --owner', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'XAI_API_KEY',
            '--vault',
            'aws.params',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--env',
            'test',
            '--org',
            'testorg',
          ],
          cwd: repo.path,
          env: { HOME: repo.path, AWS_REGION: 'us-east-1' },
          logOnError: false,
        }),
      );

      then('it fails loud (non-zero) instead of a register with no owner', () => {
        expect(result.status).not.toEqual(0);
      });

      then('the error names owner as the mandatory fix', () => {
        // robust across BOTH fail-loud paths: the owner-scoped host-manifest lookup (names
        // `--owner` in its `keyrack init --owner` fix) OR the adapter's "requires an owner in the
        // param name". both surface the word owner as the missing input a human must supply
        const output = `${result.stdout}${result.stderr}`;
        expect(output.toLowerCase()).toContain('owner');
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case10] a replica set WRITES the secret into SSM, then roundtrips set→unlock→get', () => {
    // the mech is orthogonal to the vault: aws.params supports PERMANENT_VIA_REPLICA too. unlike a
    // reference (which points at an out-of-band value and writes none), a replica WRITES a static
    // secret copy INTO SSM at set, then roundtrip-verifies it reads back. the SSM stand-in is NOT
    // pre-seeded — the set is what places the value — so this proves the full owned-secret write
    // path end-to-end: set (stdin secret → SSM) → unlock → get returns the replicated secret with an
    // encrypted grade (keyrack wrote a KMS-encrypted copy, so protection is encrypted, not reference)
    const KEY = 'XAI_API_KEY';
    const SECRET = 'xai-replica-secret-value';
    const scene = useBeforeAll(async () => {
      const ssm = await genFakeSsmServerDetached({ seed: [] });
      const repo = await genAwsParamsScene();
      return { ssm, repo };
    });
    afterAll(async () => scene.ssm.close());

    when('[t0] set --org @all --mech PERMANENT_VIA_REPLICA (secret via stdin → written to SSM)', () => {
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
          ],
          cwd: scene.repo.path,
          env: envLive({ home: scene.repo.path, ssmUrl: scene.ssm.url, key: KEY }),
          // non-tty stdin is read whole as the secret to replicate into SSM
          stdin: SECRET,
          logOnError: false,
        }),
      );

      then('the set is accepted (the secret was written + verified)', () => {
        expect(result.status).toEqual(0);
      });

      then('the secret value is never echoed back in stdout', () => {
        expect(result.stdout).not.toContain(SECRET);
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] unlock (the ambient identity IS the unlock, no prompt)', () => {
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
          env: envLive({ home: scene.repo.path, ssmUrl: scene.ssm.url, key: KEY }),
          logOnError: true,
          timeoutMs: 30_000,
        }),
      );

      then('unlock succeeds with no human prompt', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t2] get --json after unlock returns the replicated secret with an encrypted grade', () => {
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
          env: envLive({ home: scene.repo.path, ssmUrl: scene.ssm.url, key: KEY }),
          logOnError: false,
        }),
      );

      then('the served value is the secret written at set', () => {
        expect(JSON.parse(result.stdout).grant.key.secret).toEqual(SECRET);
      });

      then('the grant vault source is aws.params + mech is PERMANENT_VIA_REPLICA', () => {
        const grant = JSON.parse(result.stdout).grant;
        expect(grant.source.vault).toEqual('aws.params');
        expect(grant.source.mech).toEqual('PERMANENT_VIA_REPLICA');
      });

      then('the grade protection is encrypted (keyrack wrote a KMS-encrypted copy)', () => {
        expect(JSON.parse(result.stdout).grant.key.grade.protection).toEqual(
          'encrypted',
        );
      });

      then('get --json matches snapshot', () => {
        expect(
          maskKeyrackGrantVolatiles({
            stdout: asSnapshotSafe(
              result.stdout.split(SECRET).join('__SECRET__'),
            ),
          }),
        ).toMatchSnapshot();
      });
    });

    when('[t3] del of the replica key destroys the SSM secret keyrack wrote', () => {
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
            '@all',
          ],
          cwd: scene.repo.path,
          env: envLive({ home: scene.repo.path, ssmUrl: scene.ssm.url, key: KEY }),
          logOnError: false,
        }),
      );

      then('the del is accepted', () => {
        expect(result.status).toEqual(0);
      });

      then('it reports the destroyed SSM secret (never a silent destructive delete)', () => {
        expect(result.stdout).toContain('destroyed');
      });

      then('stdout matches snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case11] a SPECIFIC-org set fails loud when the org declares no AWS_PROFILE (the hardcut)', () => {
    // the crux of the org-scope hardcut on the WRITE path: a scoped-org (non-@all) set
    // authenticates as that org's keyrack-declared AWS_PROFILE — NOT the machine's ambient one. so
    // when the manifest declares no AWS_PROFILE for the org, the set must FAIL LOUD and name the fix
    // (declare the profile, or use --org @all), never silently fall back to an ambient identity.
    // this is the exact defect the human hit inverted: the set now refuses to guess an identity.
    // creds-free: the identity decision is a pure manifest lookup that throws BEFORE any SSM call,
    // so no AWS + no SSM stand-in is needed. the scene's init declares no <org>.test.AWS_PROFILE key
    const repo = useBeforeAll(async () => genAwsParamsScene());

    when('[t0] set --org testorg --mech REPLICA with no AWS_PROFILE declared for testorg', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'XAI_API_KEY',
            '--vault',
            'aws.params',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--owner',
            'mechanic',
            '--env',
            'test',
            '--org',
            'testorg',
          ],
          cwd: repo.path,
          // AWS_REGION present (so the region gate passes) but AWS_PROFILE stripped — the human has
          // NOT exported one. the hardcut must still refuse to guess, not grab an ambient profile
          env: {
            HOME: repo.path,
            AWS_REGION: 'us-east-1',
            AWS_PROFILE: undefined,
          },
          logOnError: false,
        }),
      );

      then('it fails loud (non-zero) — never a silent ambient-identity fallback', () => {
        expect(result.status).not.toEqual(0);
      });

      then('the error names the missing org AWS_PROFILE + the fix', () => {
        const output = `${result.stdout}${result.stderr}`;
        expect(output).toContain('no AWS_PROFILE declared for org');
        expect(output).toContain('testorg');
      });

      then('stderr matches snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });
});
