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
  asSnapshotSafe,
  invokeRhachetCliBinary,
  invokeRhachetCliBinaryAsync,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = path to the mock aws cli, placed on PATH ahead of any real one
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
  KEYRACK_DAEMON_RENEW_TICK_MS: '250',
});

/**
 * .what = mask the values a renew moves on every tick
 * .why = the count and the ttl differ per run; the shape is what the snapshot pins
 */
const asRenewSnapshotSafe = (output: string): string =>
  asSnapshotSafe(output)
    .replace(/renewed = \d+x/g, 'renewed = __N__x')
    .replace(/expires in: \d+m/g, 'expires in: __N__m');

/**
 * .what = the `keys` of a `status --json` payload, with per-run values masked
 * .why = the payload also carries the daemon socket path and the recipient pubkey,
 *        both per-run; the keys are what the renew moves
 */
const asRenewKeysSnapshotSafe = (
  stdout: string,
): Array<Record<string, unknown>> =>
  (JSON.parse(stdout) as { keys: StatusRow[] }).keys.map((key) => ({
    ...key,
    expiresAt: '__TIMESTAMP__',
    ttlLeftMs: key.ttlLeftMs === null ? null : -1,
    ...(key.renew
      ? { renew: { ...key.renew, renewedCount: -1 } }
      : {}),
  }));

/**
 * .what = the status row of this journey's key, from `status --json`
 */
type StatusRow = {
  slug: string;
  ttlLeftMs: number | null;
  renew?: {
    renewedCount: number;
    mark: { kind: 'lapsed' | 'halted'; error: string | null } | null;
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
}): Promise<StatusRow> => {
  const deadline = Date.now() + 30_000;
  const rowsSeen: Array<StatusRow | null> = [];
  while (Date.now() < deadline) {
    const result = await invokeRhachetCliBinaryAsync({
      args: ['keyrack', 'status', '--json'],
      cwd: input.cwd,
      env: input.env,
    });
    const parsed = JSON.parse(result.stdout) as { keys?: StatusRow[] };
    const row = (parsed.keys ?? []).find((key) => key.slug === SLUG) ?? null;
    rowsSeen.push(row);
    if (row && input.until(row)) return row;
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new MalfunctionError('status never reached the awaited renew state', {
    label: input.label,
    rowLast: rowsSeen.at(-1) ?? null,
    hint: 'read the daemon log under the test HOME; the tick may not have fired',
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

      then('the daemon renews the key on its own tick, with no mark', () => {
        expect(row.renew?.renewedCount).toBeGreaterThanOrEqual(1);
        expect(row.renew?.mark).toEqual(null);
      });

      then('status names the renew', () => {
        expect(human.status).toEqual(0);
        expect(human.stdout).toMatch(/renewed = \d+x/);
      });

      then('status stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(human.stdout)).toMatchSnapshot();
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

      then('status names the halt and its cause', () => {
        expect(human.stdout).toContain('halted');
        expect(human.stdout).toContain('renew failed 10 ticks in a row');
      });

      then('status stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(human.stdout)).toMatchSnapshot();
      });

      then('status --json matches snapshot', () => {
        expect(asRenewKeysSnapshotSafe(json.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] the human unlocks again once the fault clears', () => {
      const unlockResult = useBeforeAll(async () => {
        rmSync(scene.portalStateFile, { force: true });
        return invokeRhachetCliBinaryAsync({
          args: ['keyrack', 'unlock', '--env', 'test', '--key', 'AWS_PROFILE'],
          cwd: scene.repo.path,
          env: scene.env,
        });
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
        expect(unlockResult.status).toEqual(0);
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

      then('the key is marked lapsed, with no browser opened', () => {
        expect(row.renew?.mark).toEqual({ kind: 'lapsed', error: null });
      });

      then('status names the lapse', () => {
        expect(human.stdout).toContain('lapsed');
        expect(human.stdout).toContain('sso session ended, renew halted');
      });

      then('status stdout matches snapshot', () => {
        expect(asRenewSnapshotSafe(human.stdout)).toMatchSnapshot();
      });

      then('status --json matches snapshot', () => {
        expect(asRenewKeysSnapshotSafe(json.stdout)).toMatchSnapshot();
      });
    });
  });
});
