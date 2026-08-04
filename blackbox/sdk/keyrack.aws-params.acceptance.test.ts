import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

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
 * .what = SDK-contract acceptance for the aws.params read path — parity with the CLI journey.
 *   a REAL `keyrack unlock` first drives the aws.params SecureString from the SSM stand-in into
 *   the daemon; THEN the built SDK (`keyrack.get`, imported from dist) reads that daemon grant.
 *
 * .why = the rule.require.separate-cli-sdk-acceptance-tests parity rule: keyrack exposes BOTH a
 *   cli and an sdk surface, so every sdk-exposed scenario needs an sdk test. set/unlock are
 *   cli-only (the sdk never writes a vault or drives an unlock), so parity applies to the READ
 *   path — get. this proves the sdk `keyrack.get` serves an aws.params grant identically to the
 *   cli get (same value, same vault source), reading the daemon the cli unlock seeded.
 *
 * .not-vacuous = the GIVEN is a genuine aws.params exercise, NOT a value written straight into a
 *   daemon fixture: the value reaches the daemon only because a real `keyrack unlock` fetched it
 *   from the SSM stand-in through the full keyrack → declastruct → @aws-sdk/client-ssm → HTTP
 *   path. so the sdk read genuinely covers the aws.params unlock→daemon→read lane (c24).
 *
 * .backend = a DETACHED SSM stand-in (genFakeSsmServerDetached) — a jest-spawned CLI subprocess
 *   cannot reach an in-worker http listener, but can reach a separate detached process. the
 *   endpoint override is honored only under NODE_ENV=test. that is a backend SWAP, not a mock
 *   (rule.forbid.acceptance.mocks holds).
 *
 * .scope = org=@all (grove) + mech=PERMANENT_VIA_REPLICA, mirrors the CLI journey's [case1].
 */
const REGION = 'us-east-1';
// a synthetic key name guaranteed absent from the ambient env, so the os.envvar fallback can
// never shadow the aws.params vault path this test exists to prove
const KEY = 'SDK_AWS_PARAMS_SECRET';
const EXID = `/keyrack/sdk/${KEY}`;
const SECRET = 'sk-ant-sdk-seeded-fixture-value';

// a second key, registered but NEVER unlocked, so the sdk get reads it as locked — the
// locked-state read variant the cli journey proves (t1/t5), given sdk↔cli parity on the get path
const LOCKED_KEY = 'SDK_AWS_PARAMS_LOCKED';
const LOCKED_EXID = `/keyrack/sdk/${LOCKED_KEY}`;

// the built SDK entry the spawned module imports — an absolute path, so node loads the dist's
// own deps from the worktree node_modules
const rhachetDistPath = resolve(
  process.cwd(),
  'dist',
  'contract',
  'sdk.keyrack.js',
);

describe('keyrack vault aws.params read (sdk)', () => {
  beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

  given('[case1] a real unlock seeds the daemon, then the sdk reads the aws.params grant', () => {
    // a detached SSM stand-in seeded with the SecureString, a temp repo pinned to org=@all, its
    // host manifest inited, the reference key registered, and a REAL unlock that drives the value
    // into the daemon — all before the sdk read runs
    const scene = useBeforeAll(async () => {
      const ssm = await genFakeSsmServerDetached({ seed: [] });
      const repo = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });
      // pin the repo manifest to org=@all BEFORE init (init is findsert, won't overwrite it) — the
      // grove scope: @all routes the unlock identity to IMDS (the dummy env creds here), and the
      // repo-manifest hydration builds the same @all.<env>.<key> slug the set writes
      writeFileSync(join(repo.path, '.agent', 'keyrack.yml'), "org: '@all'\n");
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'mechanic', '--org', '@all'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
      // register the replica key — the secret (via stdin) writes into the stand-in at EXID + verifies
      await invokeRhachetCliBinary({
        args: [
          'keyrack', 'set',
          '--key', KEY,
          '--vault', 'aws.params',
          '--mech', 'PERMANENT_VIA_REPLICA',
          '--owner', 'mechanic',
          '--env', 'test',
          '--org', '@all',
          '--exid', EXID,
        ],
        cwd: repo.path,
        env: cliEnv(repo.path, ssm.url),
        stdin: SECRET,
        logOnError: false,
      });
      // the REAL unlock — fetches the SecureString from the stand-in and pushes it to the daemon
      await invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--owner', 'mechanic', '--env', 'test', '--key', KEY],
        cwd: repo.path,
        env: cliEnv(repo.path, ssm.url),
        logOnError: true,
        timeoutMs: 30_000,
      });
      return { ssm, repo };
    });

    afterAll(async () => {
      await scene.ssm.close();
      await killKeyrackDaemonForTests({ owner: null });
    });

    when('[t0] the built sdk keyrack.get reads the aws.params grant from the daemon', () => {
      const result = useBeforeAll(async () => {
        // a module that imports the built sdk and reads the key — NO ssm env, because the sdk get
        // reads the DAEMON (the cli unlock already seeded it), never the vault
        const modulePath = join(scene.repo.path, 'sdk-get-aws-params.mjs');
        writeFileSync(
          modulePath,
          [
            `import { keyrack } from '${rhachetDistPath}';`,
            `const out = await keyrack.get({ for: { key: '${KEY}' }, env: 'test', org: '@all', owner: 'mechanic' });`,
            `console.log(JSON.stringify(out, null, 2));`,
          ].join('\n'),
        );
        return spawnSync('node', [modulePath], {
          cwd: scene.repo.path,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: scene.repo.path,
            // strip any inherited collision so the os.envvar fallback can never shadow the
            // daemon-served aws.params grant
            [KEY]: undefined,
          },
        });
      });

      then('the sdk process exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the grant status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.attempt.status).toEqual('granted');
      });

      then('the served value is the seeded SSM SecureString', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.attempt.grant.key.secret).toEqual(SECRET);
      });

      then('the grant vault source is aws.params (sdk↔cli read parity)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.attempt.grant.source.vault).toEqual('aws.params');
      });

      then('the grant slug is the @all grove slug', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.attempt.grant.slug).toEqual(`@all.test.${KEY}`);
      });

      then('emit.stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        // redact the secret + mask volatile grant fields for a stable contract snapshot
        const snapped = maskKeyrackGrantVolatiles({
          stdout: asSnapshotSafe(
            parsed.emit.stdout.split(SECRET).join('__SECRET__'),
          ),
        });
        expect(snapped).toMatchSnapshot();
      });
    });
  });

  given('[case2] an aws.params key registered but never unlocked reads as locked (sdk↔cli locked-get parity)', () => {
    // the cli journey proves the locked-get variant at [t1] (before unlock) and [t5] (after
    // relock). the get path is a DUAL surface (cli + sdk), so parity requires the sdk to prove
    // the same locked-state read. this case registers a replica key and NEVER unlocks it, so
    // the daemon holds no grant and the sdk get reads it as locked. a replica set WRITES the
    // secret (via stdin) into the stand-in + roundtrip-verifies at set time — but the later sdk
    // get still reads the DAEMON (empty, since no unlock followed), so it reads locked, never a
    // read of the vault
    const scene = useBeforeAll(async () => {
      const ssm = await genFakeSsmServerDetached({ seed: [] });
      const repo = await genTestTempRepo({ fixture: 'with-keyrack-manifest' });
      writeFileSync(join(repo.path, '.agent', 'keyrack.yml'), "org: '@all'\n");
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'mechanic', '--org', '@all'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });
      // register the replica key — the secret (via stdin) writes into the stand-in at LOCKED_EXID +
      // roundtrip-verifies at set. crucially, NO unlock follows, so the daemon holds no grant and
      // the later sdk get reads it as locked
      await invokeRhachetCliBinary({
        args: [
          'keyrack', 'set',
          '--key', LOCKED_KEY,
          '--vault', 'aws.params',
          '--mech', 'PERMANENT_VIA_REPLICA',
          '--owner', 'mechanic',
          '--env', 'test',
          '--org', '@all',
          '--exid', LOCKED_EXID,
        ],
        cwd: repo.path,
        env: { ...cliEnv(repo.path, ssm.url), [LOCKED_KEY]: undefined },
        stdin: SECRET,
        logOnError: false,
      });
      return { ssm, repo };
    });

    afterAll(async () => {
      await scene.ssm.close();
      await killKeyrackDaemonForTests({ owner: null });
    });

    when('[t0] the built sdk keyrack.get reads the never-unlocked aws.params key', () => {
      const result = useBeforeAll(async () => {
        const modulePath = join(scene.repo.path, 'sdk-get-aws-params-locked.mjs');
        writeFileSync(
          modulePath,
          [
            `import { keyrack } from '${rhachetDistPath}';`,
            `const out = await keyrack.get({ for: { key: '${LOCKED_KEY}' }, env: 'test', org: '@all', owner: 'mechanic' });`,
            `console.log(JSON.stringify(out, null, 2));`,
          ].join('\n'),
        );
        return spawnSync('node', [modulePath], {
          cwd: scene.repo.path,
          encoding: 'utf8', // eslint-disable-line @cspell/spellchecker -- node api
          env: {
            ...process.env,
            HOME: scene.repo.path,
            [LOCKED_KEY]: undefined,
          },
        });
      });

      then('the sdk process exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the grant status is locked (sdk↔cli locked-get parity)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.attempt.status).toEqual('locked');
      });

      then('emit.stdout matches snapshot', () => {
        const parsed = JSON.parse(result.stdout);
        expect(asSnapshotSafe(parsed.emit.stdout)).toMatchSnapshot();
      });
    });
  });
});

/**
 * .what = the env every aws.params CLI step (set/unlock) shares
 * .why = HOME isolates the manifest + daemon, dummy static creds satisfy the SDK default chain
 *        (the @all/IMDS identity), NODE_ENV=test opts into the endpoint override, and
 *        KEYRACK_AWS_SSM_ENDPOINT points the SDK at the detached stand-in
 */
const cliEnv = (home: string, ssmUrl: string): Record<string, string | undefined> => ({
  HOME: home,
  AWS_REGION: REGION,
  AWS_ACCESS_KEY_ID: 'test-akid',
  AWS_SECRET_ACCESS_KEY: 'test-secret',
  NODE_ENV: 'test',
  KEYRACK_AWS_SSM_ENDPOINT: ssmUrl,
  [KEY]: undefined,
});
