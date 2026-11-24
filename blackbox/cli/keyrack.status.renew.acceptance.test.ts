import {
  chmodSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { MalfunctionError } from 'helpful-errors';
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
 *        role, `renewedCount: 2`), and `getOneAwsSsoSessionProof.integration.test.ts`,
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
 * .why = the count and the ttl differ per run; the shape is what the snapshot pins
 */
const asRenewSnapshotSafe = (output: string): string =>
  asSnapshotSafe(output)
    .replace(/renewed = \d+x/g, 'renewed = __N__x')
    .replace(
      /expires in: (\d+)m/g,
      (_, minutes: string) => `expires in: ${asMinutesBand({ minutes: Number(minutes) })}m`,
    );

/**
 * .what = a coarse band for a minute count: `0` stays exact, the rest fall in a band
 * .why = the count drifts per run, yet the band is what parts the journey's states: a
 *        capped grant (1-5), the daemon's 7m role creds (6-15), a far expiry (16+). an
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
 *        (expiry, ttl, socket); the renew adds one more per-run value, its count
 * .note = a mark's error is pinned whole — its metadata, argv and cause — with only its
 *         per-run fragments (temp paths) masked, so a loss of the cause goes red
 * .note = a `null` ttl (a key that never expires) stays `null`; only a number is masked,
 *         so the snap still parts "never" from "some minutes"
 * .note = the `as` sits at a json boundary (the shared masker returns a parsed payload);
 *         the shape is the cli's `status --json` contract, which the snapshot itself pins
 */
const asRenewKeysSnapshotSafe = (input: {
  stdout: string;
}): Array<Record<string, unknown>> => {
  // the raw rows, read before the shared masker hides the ttl
  const keysRaw = (JSON.parse(input.stdout).keys ?? []) as StatusRow[];
  return (
    (asKeyrackStatusSnapshotSafe({ stdout: input.stdout }).keys ?? []) as Array<
      Record<string, unknown> & { renew?: StatusRow['renew'] }
    >
  ).map((key, index) => ({
    ...key,
    // .why = `null` (never expires) and `0` (expired) stay exact; only a live count masks
    ttlLeftMs:
      keysRaw[index]?.ttlLeftMs === null || keysRaw[index]?.ttlLeftMs === 0
        ? keysRaw[index]!.ttlLeftMs
        : key.ttlLeftMs,
    ...(key.renew
      ? {
          renew: {
            ...key.renew,
            // .why = `0` stays exact: it is the one count that says "will renew, not yet run"
            renewedCount: key.renew.renewedCount === 0 ? 0 : '__N__',
            mark: key.renew.mark
              ? {
                  ...key.renew.mark,
                  error:
                    key.renew.mark.error === null
                      ? null
                      : asSnapshotSafe(key.renew.mark.error),
                }
              : null,
          },
        }
      : {}),
  }));
};

/**
 * .what = the hint every journey setup throw carries
 * .why = a red setup step names its own next move (rule.require.failloud)
 */
const HINT_SETUP =
  'read the cli stderr in this error; re-run this file alone to rule out a cold spawn. the daemon spawns with no log, so its own trace is the status row';

/**
 * .what = the argv of the fix command a status render names, without its `rhx` head
 * .why = the journey cures with the exact command status tells the human to run, so a
 *        drift in the rendered command fails here, never at a human's keyboard
 */
const asFixArgsFromStatus = (input: {
  stdout: string;
  command: 'unlock' | 'daemon prune';
}): string[] => {
  const line = input.stdout
    .split('\n')
    .find((l) => l.match(/[├└]─ rhx keyrack (.+?)( --|$)/)?.[1] === input.command);
  if (!line)
    throw new MalfunctionError('status rendered no fix command', {
      command: input.command,
      stdout: input.stdout,
      hint: 'read the status stdout in this error; the mark leaf may have moved its fix',
    });
  return line.slice(line.indexOf('rhx ') + 'rhx '.length).trim().split(' ');
};

/**
 * .what = the status row of this journey's key, from `status --json`
 */
type StatusRow = {
  slug: string;
  ttlLeftMs: number | null;
  renew?: {
    renewedCount: number;
    mark: { kind: 'lapsed' | 'halted'; error: string | null } | null;
    isAtCap?: true;
  };
};

/**
 * .what = poll `keyrack status --json` until the key's row meets a predicate
 * .why = the renew runs on the daemon's own tick; a poll waits exactly as long as the
 *        tick takes, never a guessed sleep
 */
const pollStatusRowUntil = async (input: {
  cwd: string;
  env: Record<string, string | undefined>;
  until: (row: StatusRow) => boolean;
  label: string;
  owner?: string;
}): Promise<StatusRow> => {
  const deadline = Date.now() + 30_000;
  const argsOwner = input.owner ? ['--owner', input.owner] : [];
  // .note = deliberate mutation: each poll's row is kept, so a timeout can name the last
  const rowsSeen: Array<StatusRow | null> = [];
  while (Date.now() < deadline) {
    const result = await invokeRhachetCliBinaryAsync({
      args: ['keyrack', 'status', ...argsOwner, '--json'],
      cwd: input.cwd,
      env: input.env,
    });
    // .note = a json boundary: JSON.parse yields any. the shape is the cli's `status --json`
    //         contract; a drift fails the row lookup or the predicate, never passes silently
    const parsed = JSON.parse(result.stdout) as { keys?: StatusRow[] };
    const row = (parsed.keys ?? []).find((key) => key.slug === SLUG) ?? null;
    rowsSeen.push(row);
    if (row && input.until(row)) return row;
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new MalfunctionError('status never reached the awaited renew state', {
    label: input.label,
    rowLast: rowsSeen.at(-1) ?? null,
    hint: 'read rowLast in this error; the tick may not have fired, or the journey state an earlier `when` left may differ — run the whole [case1] journey, not one step',
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

      const row = useBeforeAll(async () =>
        pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) => (r.renew?.renewedCount ?? 0) >= 1,
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

      then('the daemon renews the key on its own tick, with no mark', () => {
        expect(row.renew?.renewedCount).toBeGreaterThanOrEqual(1);
        expect(row.renew?.mark).toEqual(null);
      });

      then('status names the renew', () => {
        expect(human.status).toEqual(0);
        expect(human.stdout).toMatch(/renewed = \d+x/);
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

      then('status --json carries the renew with no mark', () => {
        expect(json.status).toEqual(0);
        const [key] = asRenewKeysSnapshotSafe({ stdout: json.stdout });
        expect(key).toMatchObject({ slug: SLUG, renew: { mark: null } });
      });

      then('status --json matches snapshot', () => {
        expect(asRenewKeysSnapshotSafe({ stdout: json.stdout })).toMatchSnapshot();
      });
    });

    when('[t1] the renew faults every tick', () => {
      const row = useBeforeAll(async () => {
        writeFileSync(scene.portalStateFile, 'fault', 'utf-8');
        return pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) => r.renew?.mark?.kind === 'halted',
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

      then('the key is marked halted, with the fault named', () => {
        expect(row.renew?.mark?.kind).toEqual('halted');
        expect(row.renew?.mark?.error).toContain('export-credentials');
      });

      // .why = the snapshot pins the headline only; the cause below it rides the json in full
      then('the json mark keeps the whole cause, below its headline', () => {
        expect(row.renew?.mark?.error).toContain(
          'mock aws: connection reset by peer',
        );
      });

      then('status names the halt and its cause', () => {
        expect(human.stdout).toContain('halted');
        expect(human.stdout).toContain('renew stopped on a fault it could not clear');
      });

      then('status stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(human.stdout)).toMatchSnapshot();
      });

      then('status --json matches snapshot', () => {
        expect(asRenewKeysSnapshotSafe({ stdout: json.stdout })).toMatchSnapshot();
      });
    });

    when('[t2] the human runs the rendered fix once the fault clears', () => {
      // .note = one block reads the fix and runs it, so the argv reaches the cli as a plain array
      const fix = useBeforeAll(async () => {
        const halted = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        const args = asFixArgsFromStatus({
          stdout: halted.stdout,
          command: 'unlock',
        });
        rmSync(scene.portalStateFile, { force: true });
        const result = await invokeRhachetCliBinaryAsync({
          args,
          cwd: scene.repo.path,
          env: scene.env,
        });
        return { args, result };
      });

      then('the rendered fix is the unlock of the key env', () => {
        expect(fix.args).toEqual(['keyrack', 'unlock', '--env', 'test']);
      });

      const row = useBeforeAll(async () =>
        pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          // .why = the unlock resets the count to 0; wait for a renew to land after it,
          //        so the cure is proven and the next step starts from a renewed key
          until: (r) =>
            !!r.renew && r.renew.mark === null && r.renew.renewedCount >= 1,
          label: 'cured',
        }),
      );

      then('the unlock succeeds', () => {
        expect(fix.result.status).toEqual(0);
      });

      then('the cure unlock stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(fix.result.stdout)).toMatchSnapshot();
      });

      then('the mark is cured and the renew resumes', () => {
        expect(row.renew?.mark).toEqual(null);
        expect(row.renew?.renewedCount).toBeGreaterThanOrEqual(1);
      });
    });

    when('[t3] the portal session ends', () => {
      const row = useBeforeAll(async () => {
        writeFileSync(scene.portalStateFile, 'lapsed', 'utf-8');
        return pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) => r.renew?.mark?.kind === 'lapsed',
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

      // .why = a mark stops the renew, never the access: the live grant still serves
      const gotUnderMark = useBeforeAll(async () =>
        invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'get', '--key', SLUG, '--json'],
          cwd: scene.repo.path,
          env: scene.env,
        }),
      );

      then('a consumer get is still granted while the grant lives', () => {
        expect(gotUnderMark.status).toEqual(0);
        expect(JSON.parse(gotUnderMark.stdout).status).toEqual('granted');
      });

      then('the key is marked lapsed, with no browser opened', () => {
        expect(row.renew?.mark).toEqual({ kind: 'lapsed', error: null });
        expect(existsSync(asLoginLogPath({ home: scene.repo.path }))).toBe(false);
      });

      then('status names the lapse', () => {
        expect(human.stdout).toContain('lapsed');
        expect(human.stdout).toContain('sso session ended, no renew until the next unlock');
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
      //        the renew marks it and the grant expires out of the store
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

      const row = useBeforeAll(async () =>
        pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) => r.renew?.mark?.kind === 'lapsed' && r.ttlLeftMs === 0,
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

      then('the key outlives its grant, marked lapsed', () => {
        expect(row.ttlLeftMs).toEqual(0);
        expect(row.renew?.mark).toEqual({ kind: 'lapsed', error: null });
      });

      then('the renew still opened no browser', () => {
        expect(existsSync(asLoginLogPath({ home: scene.repo.path }))).toBe(false);
      });

      then('status names the key expired and lapsed, with the fix', () => {
        expect(human.stdout).toContain('expired');
        expect(human.stdout).toContain('sso session ended, no renew until the next unlock');
        expect(asFixArgsFromStatus({ stdout: human.stdout, command: 'unlock' })).toEqual([
          'keyrack',
          'unlock',
          '--env',
          'test',
        ]);
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

    when('[t5] the human runs the rendered fix from the lapse', () => {
      // .why = the fix runs the browser login (the mock `sso login` starts a fresh portal
      //        session), then the daemon renews again from it
      const fix = useBeforeAll(async () => {
        const lapsed = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        const args = asFixArgsFromStatus({
          stdout: lapsed.stdout,
          command: 'unlock',
        });
        const result = await invokeRhachetCliBinaryAsync({
          args,
          cwd: scene.repo.path,
          env: scene.env,
        });
        return { args, result };
      });

      const row = useBeforeAll(async () =>
        pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) =>
            !!r.renew && r.renew.mark === null && r.renew.renewedCount >= 1,
          label: 'cured from lapse',
        }),
      );

      then('the fix runs the browser login and succeeds', () => {
        expect(fix.args).toEqual(['keyrack', 'unlock', '--env', 'test']);
        expect(fix.result.status).toEqual(0);
        expect(fix.result.stdout).toContain('authenticated as');
      });

      then('the cure unlock stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(fix.result.stdout)).toMatchSnapshot();
      });

      then('the lapse is cured and the renew resumes', () => {
        expect(row.renew?.mark).toEqual(null);
        expect(row.renew?.renewedCount).toBeGreaterThanOrEqual(1);
        expect(row.ttlLeftMs).toBeGreaterThan(0);
      });
    });

    when('[t6] the key is unlocked with a duration shorter than its role creds', () => {
      // .why = a 5m bound against 7m role creds stores the grant at its cap, so no renew
      //        can move it; status must say where the key ends, never `renew = on`
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

      const row = useBeforeAll(async () => {
        if (unlockResult.status !== 0)
          throw new MalfunctionError('the bounded unlock failed', {
            unlockResult,
            hint: HINT_SETUP,
          });
        return pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) => r.renew?.isAtCap === true,
          label: 'at cap',
        });
      });

      // .note = beforeAll hooks run in order, so this reads status after the row is at cap
      const human = useBeforeAll(async () =>
        invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status'],
          cwd: scene.repo.path,
          env: scene.env,
        }),
      );

      then('the row says the grant is at its cap, with no mark', () => {
        expect(row.renew?.isAtCap).toEqual(true);
        expect(row.renew?.mark).toEqual(null);
        expect(row.ttlLeftMs).toBeLessThanOrEqual(5 * 60_000);
      });

      then('status names where the key ends, never renew = on', () => {
        expect(human.stdout).toContain(
          'at its cap — ends at expiry, unlock to extend',
        );
        expect(human.stdout).not.toContain('renew = on');
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

      then('past several ticks, status holds no row for the key', () => {
        // .note = a json boundary, as in pollStatusRowUntil
        const parsed = JSON.parse(after.json.stdout) as { keys?: StatusRow[] };
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

    when('[t8] the human relocks a key the renew has marked', () => {
      // .why = a marked entry outlives its grant in status (F5), so a relock must clear
      //        the mark too, or the key would still be named after the human locked it.
      //        the grant expires first, so the relock finds the key in the renew record
      //        alone, as in [t4]: the daemon's portal reads lapsed, the cli's reads live
      const marked = useBeforeAll(async () => {
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
          throw new MalfunctionError('the unlock before the mark failed', {
            unlocked,
            hint: HINT_SETUP,
          });
        return pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) => r.renew?.mark?.kind === 'lapsed' && r.ttlLeftMs === 0,
          label: 'expired and marked lapsed before the relock',
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

      then('the key was expired and marked lapsed before the relock', () => {
        expect(marked.renew?.mark?.kind).toEqual('lapsed');
        expect(marked.ttlLeftMs).toEqual(0);
      });

      then('the relock succeeds', () => {
        expect(after.relocked.status).toEqual(0);
      });

      // .why = the key lives in the renew record alone here; the relock still names it
      then('the relock stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(after.relocked.stdout)).toMatchSnapshot();
      });

      then('past several ticks, status names the key no more', () => {
        // .note = a json boundary, as in pollStatusRowUntil
        const parsed = JSON.parse(after.json.stdout) as { keys?: StatusRow[] };
        expect((parsed.keys ?? []).some((key) => key.slug === SLUG)).toBe(
          false,
        );
      });
    });

    when('[t9] a renew faults for a few ticks, then the fault clears (a blip)', () => {
      // .why = a blip must never mark the key: the renew retries on the next tick and
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
        const before = await pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) => (r.renew?.renewedCount ?? 0) >= 1,
          label: 'renewed before the blip',
        });

        // three ticks of faults, well short of the ten that halt, then clear
        writeFileSync(scene.portalStateFile, 'fault');
        await new Promise((done) => setTimeout(done, 750));
        writeFileSync(scene.portalStateFile, '');
        const after = await pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) =>
            (r.renew?.renewedCount ?? 0) > (before.renew?.renewedCount ?? 0),
          label: 'renewed after the blip',
        });
        return { after };
      });

      then('the renew resumes, with no mark', () => {
        expect(blip.after.renew?.mark).toEqual(null);
        expect(blip.after.ttlLeftMs).toBeGreaterThan(0);
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
        const row = await pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) =>
            (r.renew?.renewedCount ?? 0) >= 1 && (r.ttlLeftMs ?? 0) > 0,
          label: 'revived after the late wake',
        });
        const gotAwake = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'get', '--key', SLUG, '--json'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        return { row, gotAwake };
      });

      then('after the wake, the renew revives the key, with no mark', () => {
        expect(wake.row.renew?.mark).toEqual(null);
        expect(wake.gotAwake.status).toEqual(0);
        expect(wake.gotAwake.stdout).toContain('"status": "granted"');
      });
    });

    when('[t11] a renew clips the grant to a cap seconds out', () => {
      // .why = the cap is the human's bound: a renew never moves a key past it, and at
      //        the cap the key locks as it would with no renew (c8)
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
        const row = await pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) =>
            (r.renew?.renewedCount ?? 0) >= 1 && r.renew?.isAtCap === true,
          label: 'renewed up to the cap',
        });

        // past the 6s cap
        await new Promise((done) => setTimeout(done, 6_500));
        const gotPastCap = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'get', '--key', SLUG, '--json'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        return { row, gotPastCap };
      });

      then('the renew lands and stops at the cap', () => {
        expect(clip.row.renew?.isAtCap).toEqual(true);
        expect(clip.row.ttlLeftMs).toBeLessThanOrEqual(6_000);
      });

      then('past the cap, a consumer get is locked — the cap held', () => {
        expect(clip.gotPastCap.status).toEqual(2);
        expect(clip.gotPastCap.stdout).toContain('"status": "locked"');
      });
    });

    when('[t12] the key is unlocked with role creds far from their expiry', () => {
      // .why = a key outside the renew window, under its cap, waits for its window; the
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
        await pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) => (r.ttlLeftMs ?? 0) > 30 * 60_000,
          label: 'held far from expiry',
        });

        // past more than ten ticks: a renew that fired outside its window would read the
        // daemon's 420s role creds as no later expiry, a fault, and halt the key by now
        await new Promise((done) => setTimeout(done, 3_000));
        const row = await pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) => (r.ttlLeftMs ?? 0) > 30 * 60_000,
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
        return { row, human, json };
      });

      then('the row carries a renew not yet run, with no mark and no cap', () => {
        expect(far.row.renew?.renewedCount).toEqual(0);
        expect(far.row.renew?.mark).toEqual(null);
        expect(far.row.renew?.isAtCap).toBeUndefined();
      });

      then('status says the daemon will renew it', () => {
        expect(far.human.status).toEqual(0);
        expect(far.human.stdout).toContain('renew = on');
      });

      then('status stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(far.human.stdout)).toMatchSnapshot();
      });

      // .why = `renewedCount: 0, mark: null` is the one wire shape that says "will renew"
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
        const row = await pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) => (r.renew?.renewedCount ?? 0) >= 1,
          label: 'renewed past the short grant',
        });
        return { gets, row };
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
          isRenewed: (reads.row.renew?.renewedCount ?? 0) >= 1,
          getPastExpiry: JSON.parse(asSnapshotSafe(reads.gets[2]!.stdout)),
        }).toMatchSnapshot();
      });

      then('the renew carried it, with no mark', () => {
        expect(reads.row.renew?.renewedCount).toBeGreaterThanOrEqual(1);
        expect(reads.row.renew?.mark).toEqual(null);
      });
    });

    when('[t14] the renew faults in the daemon own env, and the rendered prune cures it', () => {
      // .why = the daemon renews from the env it was spawned with, so a fault that lives
      //        there survives an unlock from a healthy cli (c19). the walk runs the prune
      //        that status prints, then its unlock, and the renew resumes
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
        const halted = await pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) => r.renew?.mark?.kind === 'halted',
          label: 'halted on a fault in the daemon env',
        });

        // an unlock from the healthy cli re-arms the key; the daemon still faults
        // .note = that an unlock clears a halt is [t2]'s proof; here the halt returns
        const rearmed = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'unlock', '--env', 'test'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        const haltedAgain = await pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) => r.renew?.mark?.kind === 'halted',
          label: 'halted again past a healthy unlock',
        });
        const human = await invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'status'],
          cwd: scene.repo.path,
          env: scene.env,
        });
        return { halted, rearmed, haltedAgain, human };
      });

      const cure = useBeforeAll(async () => {
        const argsPrune = asFixArgsFromStatus({
          stdout: sick.human.stdout,
          command: 'daemon prune',
        });
        const argsUnlock = asFixArgsFromStatus({
          stdout: sick.human.stdout,
          command: 'unlock',
        });
        const pruned = await invokeRhachetCliBinaryAsync({
          args: argsPrune,
          cwd: scene.repo.path,
          env: scene.env,
        });
        const unlocked = await invokeRhachetCliBinaryAsync({
          args: argsUnlock,
          cwd: scene.repo.path,
          env: scene.env,
        });
        const row = await pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) =>
            !!r.renew && r.renew.mark === null && r.renew.renewedCount >= 1,
          label: 'renewed after the prune',
        });
        return { argsPrune, pruned, unlocked, row };
      });

      then('the fault halts the key', () => {
        expect(sick.halted.renew?.mark?.kind).toEqual('halted');
      });

      then('an unlock from a healthy cli does not clear it: the key halts again', () => {
        expect(sick.rearmed.status).toEqual(0);
        expect(sick.haltedAgain.renew?.mark?.kind).toEqual('halted');
      });

      then('the rendered prune is the daemon prune, with no owner', () => {
        expect(cure.argsPrune).toEqual(['keyrack', 'daemon', 'prune']);
      });

      then('the prune and its unlock succeed', () => {
        expect(cure.pruned.status).toEqual(0);
        expect(cure.unlocked.status).toEqual(0);
      });

      then('the respawned daemon renews the key, with no mark', () => {
        expect(cure.row.renew?.mark).toEqual(null);
        expect(cure.row.renew?.renewedCount).toBeGreaterThanOrEqual(1);
      });

      // .why = the one render where an unlock reads as success while the key stays broken
      then('the healthy-cli unlock stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(sick.rearmed.stdout)).toMatchSnapshot();
      });

      // .why = what the prune prints, beside the halt render's warn on its cost
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
      //        rendered fix then opens a browser login, which the halt render must name
      const walk = useBeforeAll(async () => {
        writeFileSync(scene.portalStateFile, 'fault');
        const halted = await pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) => r.renew?.mark?.kind === 'halted',
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
        const args = asFixArgsFromStatus({
          stdout: human.stdout,
          command: 'unlock',
        });
        const fixed = await invokeRhachetCliBinaryAsync({
          args,
          cwd: scene.repo.path,
          env: { ...scene.env, MOCK_AWS_LOGIN_LOG: loginLog },
        });
        const row = await pollStatusRowUntil({
          cwd: scene.repo.path,
          env: scene.env,
          until: (r) =>
            !!r.renew && r.renew.mark === null && r.renew.renewedCount >= 1,
          label: 'renewed after the login',
        });
        return { halted, human, fixed, isLoginRun: existsSync(loginLog), row };
      });

      then('the key is still marked halted, not lapsed: the halt stopped the probes', () => {
        expect(walk.halted.renew?.mark?.kind).toEqual('halted');
        expect(walk.human.stdout).toContain('halted');
      });

      then('the halt render says a human may need to finish a browser login', () => {
        expect(walk.human.stdout).toContain(
          'if the sso session ended meanwhile, a human must finish the browser login',
        );
      });

      then('the rendered fix ran a browser login, and succeeded', () => {
        expect(walk.isLoginRun).toBe(true);
        expect(walk.fixed.status).toEqual(0);
      });

      then('the fix stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(walk.fixed.stdout)).toMatchSnapshot();
      });

      then('the renew resumes, with no mark', () => {
        expect(walk.row.renew?.mark).toEqual(null);
        expect(walk.row.renew?.renewedCount).toBeGreaterThanOrEqual(1);
      });
    });
  });

  given('[case2] an sso key on a named owner rack, through a lapse', () => {
    // .why = the cli hands the rack's owner to the render, so the fix it prints reaches
    //        the same rack. a human on a named rack who runs a fix for the default rack
    //        unlocks the wrong one
    const OWNER = 'ehmpath.renew';
    beforeAll(() => killKeyrackDaemonForTests({ owner: OWNER }));
    afterAll(() => killKeyrackDaemonForTests({ owner: OWNER }));

    const walk = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'minimal' });
      const portalStateFile = `${repo.path}/.mock-aws-portal-state`;
      const env = envForRenew({ home: repo.path, portalStateFile });

      // an owner rack, a repo manifest, and an sso profile
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', OWNER],
        cwd: repo.path,
        env: envIsolated(repo.path),
      });
      mkdirSync(`${repo.path}/.agent`, { recursive: true });
      writeFileSync(
        `${repo.path}/.agent/keyrack.yml`,
        'org: testorg\n\nenv.test:\n  - AWS_PROFILE\n',
        'utf-8',
      );
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

      // set and unlock the key on the owner rack
      const setResult = invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--owner',
          OWNER,
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
      const unlocked = await invokeRhachetCliBinaryAsync({
        args: ['keyrack', 'unlock', '--owner', OWNER, '--env', 'test'],
        cwd: repo.path,
        env,
      });
      if (setResult.status !== 0 || unlocked.status !== 0)
        throw new MalfunctionError('the owner rack setup failed', {
          setResult,
          unlocked,
          hint: HINT_SETUP,
        });

      // the portal ends; the renew marks the key lapsed
      writeFileSync(portalStateFile, 'lapsed', 'utf-8');
      await pollStatusRowUntil({
        cwd: repo.path,
        env,
        owner: OWNER,
        until: (r) => r.renew?.mark?.kind === 'lapsed',
        label: 'lapsed on the owner rack',
      });
      const human = await invokeRhachetCliBinaryAsync({
        args: ['keyrack', 'status', '--owner', OWNER],
        cwd: repo.path,
        env,
      });
      return { human };
    });

    then('the rendered fix names the owner rack', () => {
      expect(asFixArgsFromStatus({ stdout: walk.human.stdout, command: 'unlock' })).toEqual(
        ['keyrack', 'unlock', '--owner', OWNER, '--env', 'test'],
      );
    });
  });
});
