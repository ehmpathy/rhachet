import {
  chmodSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { MalfunctionError } from 'helpful-errors';
import { type IsoDuration, toMilliseconds } from 'iso-time';
import { given, then, useBeforeAll, when } from 'test-fns';

import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asKeyrackStatusSnapshotSafe,
  asSnapshotSafe,
  invokeRhachetCliBinary,
  invokeRhachetCliBinaryAsync,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = path to the mock aws cli, placed on PATH ahead of any real one
 * .mock = the aws cli and the sso sdk gate (`AWS_SDK_MOCK`)
 * .why = a renew needs a live sso portal session, and that session exists only after
 *        a human finishes a browser login. no ci runner holds one, and the journey must
 *        also end and restore the portal at will, which no real portal permits
 * .real = the live two-expiry proof in the 5.1 execution yield (a real portal, a real
 *        role, two renews), and `getOneAwsSsoSessionProof.integration.test.ts`,
 *        which drives the real aws cli and sdk through the absent-session case
 */
const MOCK_AWS_CLI_DIR = join(__dirname, '../.test/assets/mock-aws-cli');

/**
 * .what = the key this journey holds
 */
const SLUG = 'testorg.test.AWS_PROFILE';

/**
 * .what = env for every cli call, so the daemon the first unlock spawns inherits it
 * .why = the daemon renews from the env it was spawned with: the mock cli on PATH,
 *        a short tick, role creds that expire 7m out (inside the renew window, so each
 *        tick renews), and a state file whose content sets the portal session state
 */
const envForRenew = (input: { home: string; portalStateFile: string }) => ({
  ...envIsolated(input.home),
  PATH: `${MOCK_AWS_CLI_DIR}:${process.env.PATH}`,
  AWS_SDK_MOCK: '1',
  MOCK_AWS_CREDENTIAL_TTL_S: '420',
  MOCK_AWS_PORTAL_STATE_FILE: input.portalStateFile,
  MOCK_AWS_LOGIN_LOG: asLoginLogPath({ home: input.home }),
  // .why = a login names a person, as a real one does; the mock default reads `session`
  MOCK_AWS_IDENTITY: 'alice',
  KEYRACK_DAEMON_RENEW_TICK_MS: '250',
});

/**
 * .what = the file the mock aws cli appends a line to on each browser login
 * .why = a renew must never open a browser, so a lapse step proves the file stays absent
 */
const asLoginLogPath = (input: { home: string }): string =>
  `${input.home}/.mock-aws-login.log`;

/**
 * .what = mask the values a renew moves on every tick
 * .why = the minutes left differ per run; the shape is what the snapshot pins
 */
const asRenewSnapshotSafe = (output: string): string =>
  asSnapshotSafe(output)
    .replace(
      /expires in: (\d+)m/g,
      (_, minutes: string) => `expires in: ${asMinutesBand({ minutes: Number(minutes) })}m`,
    );

/**
 * .what = a coarse band for a minute count: `0` stays exact, the rest fall in a band
 * .why = the count drifts per run, yet the band is what parts the journey's states: a
 *        grant at its max (1-5), the daemon's 7m role creds (6-15), a far expiry (16+). an
 *        exact `0` keeps the old "already dead" bug visible
 */
const asMinutesBand = (input: { minutes: number }): string => {
  if (input.minutes === 0) return '0';
  if (input.minutes <= 5) return '__1-5__';
  if (input.minutes <= 15) return '__6-15__';
  return '__16+__';
};

/**
 * .what = the `keys` of a `status --json` payload, with per-run values masked
 * .why = the shared `asKeyrackStatusSnapshotSafe` masks what every status payload moves
 *        (expiry, time left, socket); the renewal adds one more per-run value, its count
 * .note = a halt's error is pinned whole — its metadata, argv and cause — with only its
 *         per-run fragments (temp paths) masked, so a loss of the cause goes red
 * .note = a `null` expiresIn (a key that never expires) and a zero one (expired) stay
 *         exact; only a live duration is masked, so the snap still parts the three
 * .note = the `as` sits at a json boundary (the shared masker returns a parsed payload);
 *         the shape is the cli's `status --json` contract, which the snapshot itself pins
 */
const asRenewKeysSnapshotSafe = (input: {
  stdout: string;
}): Array<Record<string, unknown>> => {
  // the raw keys, read before the shared masker hides the time left
  const keysRaw = (JSON.parse(input.stdout).keys ?? []) as StatusKey[];
  return (
    (asKeyrackStatusSnapshotSafe({ stdout: input.stdout }).keys ?? []) as Array<
      Record<string, unknown> & { renewal?: StatusKey['renewal'] }
    >
  ).map((key, index) => {
    const expiresInMs = asExpiresInMs({ key: keysRaw[index]! });
    return {
      ...key,
      expiresIn:
        expiresInMs === null || expiresInMs === 0
          ? keysRaw[index]!.expiresIn
          : key.expiresIn,
      ...(key.renewal
        ? {
            renewal: {
              ...key.renewal,
              // .why = `0` stays exact: it is the one count that says "will renew, not yet run"
              count: {
                renewed: key.renewal.count.renewed === 0 ? 0 : '__N__',
              },
              error:
                key.renewal.error === null
                  ? null
                  : asSnapshotSafe(key.renewal.error),
            },
          }
        : {}),
    };
  });
};

/**
 * .what = the hint every journey setup throw carries
 * .why = a red setup step names its own next move (rule.require.failloud)
 */
const HINT_SETUP =
  'read the cli stderr in this error; re-run this file alone to rule out a cold spawn. the daemon spawns with no log, so its own trace is the status key';

/**
 * .what = the status key of this journey's key, from `status --json`
 */
type StatusKey = {
  slug: string;
  expiresIn: IsoDuration | null;
  renewal?: {
    status: 'on' | 'off' | 'lapsed' | 'halted';
    count: { renewed: number };
    error: string | null;
  };
};

/**
 * .what = the time a status key has left, in milliseconds, or null if it never expires
 * .why = a poll compares time left against a bound; the wire carries a duration
 */
const asExpiresInMs = (input: { key: StatusKey }): number | null =>
  input.key.expiresIn === null ? null : toMilliseconds(input.key.expiresIn);

/**
 * .what = poll `keyrack status --json` until the journey's key meets a predicate
 * .why = the renew runs on the daemon's own tick; a poll waits exactly as long as the
 *        tick takes, never a guessed sleep
 */
const pollStatusKeyUntil = async (input: {
  cwd: string;
  env: Record<string, string | undefined>;
  until: (key: StatusKey) => boolean;
  label: string;
}): Promise<StatusKey> => {
  const deadline = Date.now() + 30_000;
  // .note = deliberate mutation: each poll's key is kept, so a timeout can name the last
  const keysSeen: Array<StatusKey | null> = [];
  while (Date.now() < deadline) {
    const result = await invokeRhachetCliBinaryAsync({
      args: ['keyrack', 'status', '--json'],
      cwd: input.cwd,
      env: input.env,
    });
    // .note = a json boundary: JSON.parse yields any. the shape is the cli's `status --json`
    //         contract; a drift fails the key lookup or the predicate, never passes silently
    const parsed = JSON.parse(result.stdout) as { keys?: StatusKey[] };
    const key = (parsed.keys ?? []).find((it) => it.slug === SLUG) ?? null;
    keysSeen.push(key);
    if (key && input.until(key)) return key;
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new MalfunctionError('status never reached the awaited renewal state', {
    label: input.label,
    keyLast: keysSeen.at(-1) ?? null,
    hint: 'read keyLast in this error; the tick may not have fired, or the journey state an earlier `when` left may differ — run the whole [case1] journey, not one step',
  });
};

/**
 * .what = the daemon renews an sso key on its own tick, and `keyrack status` shows it
 * .why = proves the renew, the halt, the cure, and the lapse through the real cli and
 *        the real daemon, with the mock aws cli as the only stand-in
 */
describe('keyrack status: sso renew', () => {
  beforeAll(() => chmodSync(`${MOCK_AWS_CLI_DIR}/aws`, 0o755));
  beforeAll(() => killKeyrackDaemonForTests({ owner: null }));
  afterAll(() => killKeyrackDaemonForTests({ owner: null }));

  given('[case1] an sso key held by the daemon, through renew, halt, cure, lapse', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'minimal' });
      const portalStateFile = `${repo.path}/.mock-aws-portal-state`;
      const env = envForRenew({ home: repo.path, portalStateFile });

      // keyrack init
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: repo.path,
        env: envIsolated(repo.path),
      });

      // repo manifest, so the org is known
      const agentDir = `${repo.path}/.agent`;
      if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        `${agentDir}/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - AWS_PROFILE\n',
        'utf-8',
      );

      // an sso profile in ~/.aws/config
      mkdirSync(`${repo.path}/.aws`, { recursive: true });
      writeFileSync(
        `${repo.path}/.aws/config`,
        [
          '[profile testorg-test]',
          'sso_session = mock-portal',
          'sso_account_id = 123456789012',
          'sso_role_name = AdministratorAccess',
          'region = us-east-1',
          '',
          '[sso-session mock-portal]',
          'sso_start_url = https://mock-portal.awsapps.com/start',
          'sso_region = us-east-1',
          '',
        ].join('\n'),
        'utf-8',
      );

      // set the key into the aws.config vault
      const setResult = invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'AWS_PROFILE',
          '--env',
          'test',
          '--vault',
          'aws.config',
          '--exid',
          'testorg-test',
          '--json',
        ],
        cwd: repo.path,
        env,
      });
      expect(setResult.status).toEqual(0);

      return { repo, env, portalStateFile };
    });

    when('[t0] the key is unlocked while the portal session is live', () => {
      const unlockResult = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
          cwd: scene.repo.path,
          env: scene.env,
        }),
      );

      const key = useBeforeAll(async () =>
        pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) => (k.renewal?.count.renewed ?? 0) >= 1,
          label: 'renewed',
        }),
      );

      const human = useBeforeAll(async () =>
        invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status'],
          cwd: scene.repo.path,
          env: scene.env,
        }),
      );

      then('the unlock succeeds', () => {
        expect(unlockResult.status).toEqual(0);
      });

      then('unlock stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(unlockResult.stdout)).toMatchSnapshot();
      });

      then('the daemon renews the key on its own tick, its renewal `on`', () => {
        expect(key.renewal?.count.renewed).toBeGreaterThanOrEqual(1);
        expect(key.renewal?.status).toEqual('on');
      });

      then('status reads `renewal = on`, and no count', () => {
        expect(human.status).toEqual(0);
        expect(human.stdout).toContain('renewal = on');
        expect(human.stdout).not.toMatch(/renewed/);
      });

      // .why = the snapshot masks every minute count, so a live renewed key that reads
      //        `0m` (the render's old bug) needs its own assert
      then('a renewed key never reads as already dead', () => {
        expect(human.stdout).not.toContain('expires in: 0m');
      });

      then('status stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(human.stdout)).toMatchSnapshot();
      });

      const json = useBeforeAll(async () =>
        invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status', '--json'],
          cwd: scene.repo.path,
          env: scene.env,
        }),
      );

      then('status --json carries the renewal, `on`, with no error', () => {
        expect(json.status).toEqual(0);
        const [keyMasked] = asRenewKeysSnapshotSafe({ stdout: json.stdout });
        expect(keyMasked).toMatchObject({
          slug: SLUG,
          renewal: { status: 'on', error: null },
        });
      });

      then('status --json matches snapshot', () => {
        expect(asRenewKeysSnapshotSafe({ stdout: json.stdout })).toMatchSnapshot();
      });
    });

    when('[t1] the renew faults every tick', () => {
      const key = useBeforeAll(async () => {
        writeFileSync(scene.portalStateFile, 'fault', 'utf-8');
        return pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) => k.renewal?.status === 'halted',
          label: 'halted',
        });
      });

      const human = useBeforeAll(async () =>
        invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status'],
          cwd: scene.repo.path,
          env: scene.env,
        }),
      );

      const json = useBeforeAll(async () =>
        invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status', '--json'],
          cwd: scene.repo.path,
          env: scene.env,
        }),
      );

      then('the renewal halts, with the fault named in --json', () => {
        expect(key.renewal?.status).toEqual('halted');
        expect(key.renewal?.error).toContain('export-credentials');
      });

      then('the json error keeps the whole cause, below its headline', () => {
        expect(key.renewal?.error).toContain('mock aws: connection reset by peer');
      });

      then('status reads `renewal = halted`, with the cause left to --json', () => {
        expect(human.stdout).toContain('renewal = halted');
        expect(human.stdout).not.toContain('export-credentials');
      });

      then('status stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(human.stdout)).toMatchSnapshot();
      });

      then('status --json matches snapshot', () => {
        expect(asRenewKeysSnapshotSafe({ stdout: json.stdout })).toMatchSnapshot();
      });
    });

    when('[t2] the human unlocks the key once the fault clears', () => {
      const fix = useBeforeAll(async () => {
        rmSync(scene.portalStateFile, { force: true });
        return invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: scene.repo.path,
          env: scene.env,
        });
      });

      const key = useBeforeAll(async () =>
        pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          // .why = the unlock resets the count to 0; wait for a renew to land after it,
          //        so the cure is proven and the next step starts from a renewed key
          until: (k) =>
            k.renewal?.status === 'on' && k.renewal.count.renewed >= 1,
          label: 'cured',
        }),
      );

      then('the unlock succeeds', () => {
        expect(fix.status).toEqual(0);
      });

      then('the cure unlock stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(fix.stdout)).toMatchSnapshot();
      });

      then('the halt is cured and the renewal resumes', () => {
        expect(key.renewal?.status).toEqual('on');
        expect(key.renewal?.count.renewed).toBeGreaterThanOrEqual(1);
      });
    });

    when('[t3] the portal session ends', () => {
      const key = useBeforeAll(async () => {
        writeFileSync(scene.portalStateFile, 'lapsed', 'utf-8');
        return pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) => k.renewal?.status === 'lapsed',
          label: 'lapsed',
        });
      });

      const human = useBeforeAll(async () =>
        invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status'],
          cwd: scene.repo.path,
          env: scene.env,
        }),
      );

      const json = useBeforeAll(async () =>
        invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status', '--json'],
          cwd: scene.repo.path,
          env: scene.env,
        }),
      );

      // .why = a lapse stops the renew, never the access: the live grant still serves
      const gotUnderLapse = useBeforeAll(async () =>
        invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'get', '--key', SLUG, '--json'],
          cwd: scene.repo.path,
          env: scene.env,
        }),
      );

      then('a consumer get is still granted while the grant lives', () => {
        expect(gotUnderLapse.status).toEqual(0);
        expect(JSON.parse(gotUnderLapse.stdout).status).toEqual('granted');
      });

      then('the renewal lapses, with no browser opened', () => {
        expect(key.renewal?.status).toEqual('lapsed');
        expect(key.renewal?.error).toEqual(null);
        expect(existsSync(asLoginLogPath({ home: scene.repo.path }))).toBe(false);
      });

      then('status reads `renewal = lapsed`', () => {
        expect(human.stdout).toContain('renewal = lapsed');
      });

      then('status stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(human.stdout)).toMatchSnapshot();
      });

      then('status --json matches snapshot', () => {
        expect(asRenewKeysSnapshotSafe({ stdout: json.stdout })).toMatchSnapshot();
      });
    });

    when('[t4] the grant expires while the portal session stays ended', () => {
      // .why = the view after a night away: the role creds run out under a lapse. a fresh
      //        unlock from a cli whose own portal reads live (a separate state file, absent)
      //        files a grant that expires in 2s; the daemon's portal still reads lapsed, so
      //        the renewal lapses and the grant expires out of the store
      const unlockResult = useBeforeAll(async () =>
        invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: scene.repo.path,
          env: {
            ...scene.env,
            MOCK_AWS_PORTAL_STATE_FILE: `${scene.repo.path}/.mock-aws-portal-state.cli`,
            MOCK_AWS_CREDENTIAL_TTL_S: '2',
          },
        }),
      );

      const key = useBeforeAll(async () =>
        pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) =>
            k.renewal?.status === 'lapsed' && asExpiresInMs({ key: k }) === 0,
          label: 'expired and lapsed',
        }),
      );

      const human = useBeforeAll(async () =>
        invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status'],
          cwd: scene.repo.path,
          env: scene.env,
        }),
      );

      const json = useBeforeAll(async () =>
        invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status', '--json'],
          cwd: scene.repo.path,
          env: scene.env,
        }),
      );

      const got = useBeforeAll(async () =>
        invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'get', '--key', SLUG, '--json'],
          cwd: scene.repo.path,
          env: scene.env,
        }),
      );

      then('the unlock succeeds', () => {
        expect(unlockResult.status).toEqual(0);
      });

      then('the key outlives its grant in status, its renewal lapsed', () => {
        expect(asExpiresInMs({ key })).toEqual(0);
        expect(key.renewal?.status).toEqual('lapsed');
      });

      then('the renew still opened no browser', () => {
        expect(existsSync(asLoginLogPath({ home: scene.repo.path }))).toBe(false);
      });

      then('status reads `expired` alone', () => {
        expect(human.stdout).toContain('└─ expired');
        expect(human.stdout).not.toContain('renewal =');
        expect(human.stdout).not.toContain('expires in: 0m');
      });

      then('status stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(human.stdout)).toMatchSnapshot();
      });

      then('status --json matches snapshot', () => {
        expect(asRenewKeysSnapshotSafe({ stdout: json.stdout })).toMatchSnapshot();
      });

      then('a consumer get finds no live key', () => {
        expect(got.stdout).not.toContain('MOCKACCESSKEYID');
        expect(got.stdout).not.toContain('MockSecretAccessKey');
      });

      then('keyrack get matches snapshot', () => {
        expect({
          status: got.status,
          // .why = parsed, so the snap reads as the json object it is, not a quoted string
          stdout: JSON.parse(asSnapshotSafe(got.stdout)),
        }).toMatchSnapshot();
      });
    });

    when('[t5] the human unlocks the key after the lapse', () => {
      // .why = the unlock runs the browser login (the mock `sso login` starts a fresh
      //        portal session), then the daemon renews again from it
      const fix = useBeforeAll(async () =>
        invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: scene.repo.path,
          env: scene.env,
        }),
      );

      const key = useBeforeAll(async () =>
        pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) =>
            k.renewal?.status === 'on' && k.renewal.count.renewed >= 1,
          label: 'cured from lapse',
        }),
      );

      then('the unlock runs the browser login and succeeds', () => {
        expect(fix.status).toEqual(0);
        expect(fix.stdout).toContain('authenticated as');
      });

      then('the cure unlock stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(fix.stdout)).toMatchSnapshot();
      });

      then('the lapse is cured and the renewal resumes', () => {
        expect(key.renewal?.status).toEqual('on');
        expect(key.renewal?.count.renewed).toBeGreaterThanOrEqual(1);
        expect(asExpiresInMs({ key })).toBeGreaterThan(0);
      });
    });

    when('[t6] the key is unlocked with a duration shorter than its role creds', () => {
      // .why = a 5m bound against 7m role creds stores the grant at its max, so no renew
      //        can move it; status must read `renewal = off`, never `renewal = on`
      const unlockResult = useBeforeAll(async () =>
        invokeRhachetCliBinaryAsync({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'test',
            '--key',
            'AWS_PROFILE',
            '--duration',
            '5m',
          ],
          cwd: scene.repo.path,
          env: scene.env,
        }),
      );

      const key = useBeforeAll(async () => {
        if (unlockResult.status !== 0)
          throw new MalfunctionError('the bounded unlock failed', {
            unlockResult,
            hint: HINT_SETUP,
          });
        return pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) => k.renewal?.status === 'off',
          label: 'at max',
        });
      });

      // .note = beforeAll hooks run in order, so this reads status after the key is at max
      const human = useBeforeAll(async () =>
        invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status'],
          cwd: scene.repo.path,
          env: scene.env,
        }),
      );

      then('the key reads renewal `off`, within its bound', () => {
        expect(key.renewal?.status).toEqual('off');
        expect(asExpiresInMs({ key })).toBeLessThanOrEqual(5 * 60_000);
      });

      then('status reads `renewal = off`, never `renewal = on`', () => {
        expect(human.stdout).toContain('renewal = off');
        expect(human.stdout).not.toContain('renewal = on');
      });

      then('status stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(human.stdout)).toMatchSnapshot();
      });

      then('status --json matches snapshot', async () => {
        const json = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status', '--json'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        expect(asRenewKeysSnapshotSafe({ stdout: json.stdout })).toMatchSnapshot();
      });
    });

    when('[t7] the human relocks the key', () => {
      // .why = a relock must win over the renew: past several ticks, the daemon holds
      //        neither the key nor its renew entry, so no renew revives it
      const relockResult = useBeforeAll(async () =>
        invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'relock', '--env', 'test'],
          cwd: scene.repo.path,
          env: scene.env,
        }),
      );

      const after = useBeforeAll(async () => {
        // wait out several daemon ticks (the tick is 250ms)
        await new Promise((done) => setTimeout(done, 2_000));
        const json = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status', '--json'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        const got = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'get', '--key', SLUG, '--json'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        return { json, got };
      });

      then('the relock succeeds', () => {
        expect(relockResult.status).toEqual(0);
      });

      // .why = relock now finds a key in the renew record as well as the store
      then('the relock stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(relockResult.stdout)).toMatchSnapshot();
      });

      then('past several ticks, status holds the key no more', () => {
        // .note = a json boundary, as in pollStatusKeyUntil
        const parsed = JSON.parse(after.json.stdout) as { keys?: StatusKey[] };
        expect((parsed.keys ?? []).some((key) => key.slug === SLUG)).toBe(
          false,
        );
      });

      then('a consumer get stays locked', () => {
        expect(after.got.status).toEqual(2);
        expect(after.got.stdout).toContain('locked');
        expect(after.got.stdout).not.toContain('MOCKACCESSKEYID');
      });
    });

    when('[t8] the human relocks a key whose renewal lapsed', () => {
      // .why = a lapsed entry outlives its grant in status (F5), so a relock must clear
      //        it too, or the key would still be named after the human locked it.
      //        the grant expires first, so the relock finds the key in the renewal record
      //        alone, as in [t4]: the daemon's portal reads lapsed, the cli's reads live
      const lapsed = useBeforeAll(async () => {
        writeFileSync(scene.portalStateFile, 'lapsed');
        const unlocked = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
          cwd: scene.repo.path,
          env: {
            ...scene.env,
            MOCK_AWS_PORTAL_STATE_FILE: `${scene.repo.path}/.mock-aws-portal-state.cli`,
            MOCK_AWS_CREDENTIAL_TTL_S: '2',
          },
        });
        if (unlocked.status !== 0)
          throw new MalfunctionError('the unlock before the lapse failed', {
            unlocked,
            hint: HINT_SETUP,
          });
        return pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) =>
            k.renewal?.status === 'lapsed' && asExpiresInMs({ key: k }) === 0,
          label: 'expired and lapsed before the relock',
        });
      });

      const after = useBeforeAll(async () => {
        const relocked = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'relock', '--env', 'test'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        // wait out several daemon ticks (the tick is 250ms)
        await new Promise((done) => setTimeout(done, 2_000));
        const json = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status', '--json'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        return { relocked, json };
      });

      then('the key was expired and its renewal lapsed before the relock', () => {
        expect(lapsed.renewal?.status).toEqual('lapsed');
        expect(asExpiresInMs({ key: lapsed })).toEqual(0);
      });

      then('the relock succeeds', () => {
        expect(after.relocked.status).toEqual(0);
      });

      // .why = the key lives in the renewal record alone here; the relock still names it
      then('the relock stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(after.relocked.stdout)).toMatchSnapshot();
      });

      then('past several ticks, status names the key no more', () => {
        // .note = a json boundary, as in pollStatusKeyUntil
        const parsed = JSON.parse(after.json.stdout) as { keys?: StatusKey[] };
        expect((parsed.keys ?? []).some((key) => key.slug === SLUG)).toBe(
          false,
        );
      });
    });

    when('[t9] a renew faults for a few ticks, then the fault clears (a blip)', () => {
      // .why = a blip must never stop the renewal: the renew retries on the next tick and
      //        lands once the fault clears (c9)
      const blip = useBeforeAll(async () => {
        // a fresh unlock; the mock login starts a live portal session
        const unlocked = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        if (unlocked.status !== 0)
          throw new MalfunctionError('the unlock before the blip failed', {
            unlocked,
            hint: HINT_SETUP,
          });
        writeFileSync(scene.portalStateFile, '');
        const before = await pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) => (k.renewal?.count.renewed ?? 0) >= 1,
          label: 'renewed before the blip',
        });

        // three ticks of faults, well short of the ten that halt, then clear
        writeFileSync(scene.portalStateFile, 'fault');
        await new Promise((done) => setTimeout(done, 750));
        writeFileSync(scene.portalStateFile, '');
        const after = await pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) =>
            (k.renewal?.count.renewed ?? 0) >
            (before.renewal?.count.renewed ?? 0),
          label: 'renewed after the blip',
        });
        return { after };
      });

      then('the renewal resumes, still `on`', () => {
        expect(blip.after.renewal?.status).toEqual('on');
        expect(asExpiresInMs({ key: blip.after })).toBeGreaterThan(0);
      });
    });

    /**
     * .what = the cli's own unlock env, with its portal state apart from the daemon's
     * .why = the daemon reads `scene.portalStateFile`; the cli reads its own, so a step
     *        can fault the daemon's renew while the cli's unlock stays live, and can hand
     *        the daemon a grant with a short role ttl
     */
    const genEnvForCliUnlock = (input: { ttlS: string }) => {
      const cliStateFile = `${scene.repo.path}/.mock-aws-portal-state.cli`;
      writeFileSync(cliStateFile, '');
      return {
        ...scene.env,
        MOCK_AWS_PORTAL_STATE_FILE: cliStateFile,
        MOCK_AWS_CREDENTIAL_TTL_S: input.ttlS,
      };
    };

    when('[t10] the grant expires before any renew lands (a late wake)', () => {
      // .why = a laptop that sleeps past the expiry wakes to a grant already dead; the
      //        first renew after the wake must revive it (c3). a fault on the daemon's
      //        renew holds the renew off past the expiry, as the sleep would
      const wake = useBeforeAll(async () => {
        writeFileSync(scene.portalStateFile, 'fault');
        const unlocked = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
          cwd: scene.repo.path,
          env: genEnvForCliUnlock({ ttlS: '1' }),
        });
        if (unlocked.status !== 0)
          throw new MalfunctionError('the unlock before the late wake failed', {
            unlocked,
            hint: HINT_SETUP,
          });

        // past the 1s grant, well short of the ten 250ms ticks of faults that halt
        // .note = no cli call sits in this span: each costs about a second of ticks
        await new Promise((done) => setTimeout(done, 1_200));

        // the wake: the fault clears, and the next tick renews past the expiry
        // .note = every renew before this point faulted, so the first one that lands
        //         lands after the grant's own expiry, by construction
        writeFileSync(scene.portalStateFile, '');
        const key = await pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) =>
            (k.renewal?.count.renewed ?? 0) >= 1 &&
            (asExpiresInMs({ key: k }) ?? 0) > 0,
          label: 'revived after the late wake',
        });
        const gotAwake = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'get', '--key', SLUG, '--json'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        return { key, gotAwake };
      });

      then('after the wake, the renew revives the key, its renewal `on`', () => {
        expect(wake.key.renewal?.status).toEqual('on');
        expect(wake.gotAwake.status).toEqual(0);
        expect(wake.gotAwake.stdout).toContain('"status": "granted"');
      });
    });

    when('[t11] a renew clips the grant to a max expiry seconds out', () => {
      // .why = the max expiry is the human's bound: a renew never moves a key past it, and
      //        at the max the key locks as it would with no renew (c8)
      const clip = useBeforeAll(async () => {
        const unlocked = await invokeRhachetCliBinaryAsync({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'test',
            '--key',
            'AWS_PROFILE',
            '--duration',
            '6s',
          ],
          cwd: scene.repo.path,
          env: genEnvForCliUnlock({ ttlS: '2' }),
        });
        if (unlocked.status !== 0)
          throw new MalfunctionError('the bounded unlock failed', {
            unlocked,
            hint: HINT_SETUP,
          });
        const key = await pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) =>
            (k.renewal?.count.renewed ?? 0) >= 1 && k.renewal?.status === 'off',
          label: 'renewed up to the max',
        });

        // past the 6s max
        await new Promise((done) => setTimeout(done, 6_500));
        const gotPastMax = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'get', '--key', SLUG, '--json'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        return { key, gotPastMax };
      });

      then('the renew lands and stops at the max: the renewal reads `off`', () => {
        expect(clip.key.renewal?.status).toEqual('off');
        expect(asExpiresInMs({ key: clip.key })).toBeLessThanOrEqual(6_000);
      });

      then('past the max, a consumer get is locked — the max held', () => {
        expect(clip.gotPastMax.status).toEqual(2);
        expect(clip.gotPastMax.stdout).toContain('"status": "locked"');
      });
    });

    when('[t12] the key is unlocked with role creds far from their expiry', () => {
      // .why = a key outside the renew window, under its max, waits for its window; the
      //        human must read that the daemon WILL renew it, before any renew lands (c1)
      const far = useBeforeAll(async () => {
        const unlocked = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
          cwd: scene.repo.path,
          env: genEnvForCliUnlock({ ttlS: '3600' }),
        });
        if (unlocked.status !== 0)
          throw new MalfunctionError('the far-expiry unlock failed', {
            unlocked,
            hint: HINT_SETUP,
          });
        await pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) => (asExpiresInMs({ key: k }) ?? 0) > 30 * 60_000,
          label: 'held far from expiry',
        });

        // past more than ten ticks: a renew that fired outside its window would read the
        // daemon's 420s role creds as no later expiry, a fault, and halt the key by now
        await new Promise((done) => setTimeout(done, 3_000));
        const key = await pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) => (asExpiresInMs({ key: k }) ?? 0) > 30 * 60_000,
          label: 'still held far from expiry, past ten ticks',
        });
        const human = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        const json = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status', '--json'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        return { key, human, json };
      });

      then('the key carries a renewal `on`, not yet run', () => {
        expect(far.key.renewal?.count.renewed).toEqual(0);
        expect(far.key.renewal?.status).toEqual('on');
      });

      then('status says the daemon will renew it', () => {
        expect(far.human.status).toEqual(0);
        expect(far.human.stdout).toContain('renewal = on');
      });

      then('status stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(far.human.stdout)).toMatchSnapshot();
      });

      // .why = `status: 'on'` with `count.renewed: 0` is the wire shape that says "will renew"
      then('status --json matches snapshot', () => {
        expect(asRenewKeysSnapshotSafe({ stdout: far.json.stdout })).toMatchSnapshot();
      });
    });

    when('[t13] a consumer reads the key across its grant expiry', () => {
      // .why = the headline promise: access never drops. the cli unlock hands the daemon a
      //        3s grant; each get after those seconds must still be granted, by the renew
      //        alone (c2)
      // .note = 3s, not 1s: a 250ms tick renews it many times over, so a daemon stall under
      //         ci load has seconds of slack rather than a fraction of one
      const reads = useBeforeAll(async () => {
        const unlocked = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
          cwd: scene.repo.path,
          env: genEnvForCliUnlock({ ttlS: '3' }),
        });
        if (unlocked.status !== 0)
          throw new MalfunctionError('the short-grant unlock failed', {
            unlocked,
            hint: HINT_SETUP,
          });

        // .note = each cli call costs about a second, plus a 1s pause, so the third read
        //         lands past the 3s grant's expiry
        const getOne = async () => {
          const got = await invokeRhachetCliBinaryAsync({
            args: ['keyrack', 'get', '--key', SLUG, '--json'],
            cwd: scene.repo.path,
            env: scene.env,
          });
          await new Promise((done) => setTimeout(done, 1000));
          return got;
        };
        const gets = [await getOne(), await getOne(), await getOne()];
        const key = await pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) => (k.renewal?.count.renewed ?? 0) >= 1,
          label: 'renewed past the short grant',
        });
        return { gets, key };
      });

      then('every get is granted, past the first grant expiry', () => {
        expect(reads.gets.map((got) => got.status)).toEqual([0, 0, 0]);
        reads.gets.forEach((got) =>
          expect(got.stdout).toContain('"status": "granted"'),
        );
      });

      // .why = the consumer contract the wish exists for: a get granted past the expiry
      //        of the grant it began on. the secret is the profile name, so no mask is owed.
      //        the pair beside it shows the time: each get's verdict, and that a renew landed
      then('the get past expiry matches snapshot', () => {
        expect({
          verdicts: reads.gets.map((got) => JSON.parse(got.stdout).status),
          isRenewed: (reads.key.renewal?.count.renewed ?? 0) >= 1,
          getPastExpiry: JSON.parse(asSnapshotSafe(reads.gets[2]!.stdout)),
        }).toMatchSnapshot();
      });

      then('the renew carried it, its renewal still `on`', () => {
        expect(reads.key.renewal?.count.renewed).toBeGreaterThanOrEqual(1);
        expect(reads.key.renewal?.status).toEqual('on');
      });
    });

    when('[t14] the renew faults in the daemon own env, and a daemon prune cures it', () => {
      // .why = the daemon renews from the env it was spawned with, so a fault that lives
      //        there survives an unlock from a healthy cli (c19). the walk runs a daemon
      //        prune, then an unlock, and the renew resumes
      // .note = the daemon is respawned with a portal state path of its own; a fault in
      //         that file reaches the daemon's renew alone, as a stale config path would
      const sick = useBeforeAll(async () => {
        const pruned = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'daemon', 'prune'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        if (pruned.status !== 0)
          throw new MalfunctionError('the prune before the respawn failed', {
            pruned,
            hint: HINT_SETUP,
          });
        const daemonStateFile = `${scene.repo.path}/.mock-aws-portal-state.daemon`;
        writeFileSync(daemonStateFile, '');
        writeFileSync(scene.portalStateFile, '');
        const unlocked = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
          cwd: scene.repo.path,
          env: { ...scene.env, MOCK_AWS_PORTAL_STATE_FILE: daemonStateFile },
        });
        if (unlocked.status !== 0)
          throw new MalfunctionError('the unlock that respawns the daemon failed', {
            unlocked,
            hint: HINT_SETUP,
          });

        // the fault lands in the daemon's env alone; the cli's own path stays live
        writeFileSync(daemonStateFile, 'fault');
        const halted = await pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) => k.renewal?.status === 'halted',
          label: 'halted on a fault in the daemon env',
        });

        // an unlock from the healthy cli re-arms the key; the daemon still faults
        // .note = that an unlock clears a halt is [t2]'s proof; here the halt returns
        const rearmed = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        const haltedAgain = await pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) => k.renewal?.status === 'halted',
          label: 'halted again past a healthy unlock',
        });
        return { halted, rearmed, haltedAgain };
      });

      const cure = useBeforeAll(async () => {
        const pruned = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'daemon', 'prune'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        const unlocked = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        const key = await pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) =>
            k.renewal?.status === 'on' && k.renewal.count.renewed >= 1,
          label: 'renewed after the prune',
        });
        return { pruned, unlocked, key };
      });

      then('the fault halts the renewal', () => {
        expect(sick.halted.renewal?.status).toEqual('halted');
      });

      then('an unlock from a healthy cli does not clear it: the renewal halts again', () => {
        expect(sick.rearmed.status).toEqual(0);
        expect(sick.haltedAgain.renewal?.status).toEqual('halted');
      });

      then('the prune and its unlock succeed', () => {
        expect(cure.pruned.status).toEqual(0);
        expect(cure.unlocked.status).toEqual(0);
      });

      then('the respawned daemon renews the key, its renewal `on`', () => {
        expect(cure.key.renewal?.status).toEqual('on');
        expect(cure.key.renewal?.count.renewed).toBeGreaterThanOrEqual(1);
      });

      // .why = the one render where an unlock reads as success while the key stays broken
      then('the healthy-cli unlock stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(sick.rearmed.stdout)).toMatchSnapshot();
      });

      // .why = what the prune prints, and the unlock that follows it
      then('the prune and its unlock stdout match snapshot', () => {
        expect({
          pruned: asRenewSnapshotSafe(cure.pruned.stdout).replace(
            /pid: \d+/g,
            'pid: __PID__',
          ),
          unlocked: asRenewSnapshotSafe(cure.unlocked.stdout),
        }).toMatchSnapshot();
      });
    });

    when('[t15] the portal session ends while the key waits on a halt', () => {
      // .why = a halt stops every probe, so the portal can lapse while it waits; the
      //        unlock that cures the halt then opens a browser login, and must succeed
      const walk = useBeforeAll(async () => {
        writeFileSync(scene.portalStateFile, 'fault');
        const halted = await pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) => k.renewal?.status === 'halted',
          label: 'halted before the portal lapse',
        });
        writeFileSync(scene.portalStateFile, 'lapsed');
        const human = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        const loginLog = `${scene.repo.path}/.mock-aws-login.log`;
        rmSync(loginLog, { force: true });
        const fixed = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: scene.repo.path,
          env: { ...scene.env, MOCK_AWS_LOGIN_LOG: loginLog },
        });
        const key = await pollStatusKeyUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (k) =>
            k.renewal?.status === 'on' && k.renewal.count.renewed >= 1,
          label: 'renewed after the login',
        });
        return { halted, human, fixed, isLoginRun: existsSync(loginLog), key };
      });

      then('the renewal stays halted, not lapsed: the halt stopped the probes', () => {
        expect(walk.halted.renewal?.status).toEqual('halted');
        expect(walk.human.stdout).toContain('renewal = halted');
      });

      then('the unlock ran a browser login, and succeeded', () => {
        expect(walk.isLoginRun).toBe(true);
        expect(walk.fixed.status).toEqual(0);
      });

      then('the fix stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(walk.fixed.stdout)).toMatchSnapshot();
      });

      then('the renewal resumes, `on`', () => {
        expect(walk.key.renewal?.status).toEqual('on');
        expect(walk.key.renewal?.count.renewed).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
