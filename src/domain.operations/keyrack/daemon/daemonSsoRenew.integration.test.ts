import { MalfunctionError } from 'helpful-errors';
import { asIsoTimeStamp } from 'iso-time';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  daemonAccessGet,
  daemonAccessStatus,
  daemonAccessUnlock,
  isDaemonReachable,
  killKeyrackDaemon,
} from './sdk';
import { spawnKeyrackDaemonBackground } from './svc';

/**
 * .what = the shared mock aws cli the renew path shells out to
 * .why = placed on PATH ahead of any real aws cli, so the silent renew runs end to end
 *        through the real proof and the real mech, with no aws credentials in reach.
 *        its renew knobs: MOCK_AWS_CREDENTIAL_TTL_S, MOCK_AWS_PORTAL_STATE_FILE,
 *        MOCK_AWS_LOGIN_LOG
 * .mock = the aws cli and the sso sdk gate (`AWS_SDK_MOCK`)
 * .why = a renew needs a live sso portal session, and that session exists only after
 *        a human finishes a browser login. no ci runner holds one, so a real-sso case
 *        here would fail in every ci run
 * .real = the live two-expiry proof in the 5.1 execution yield (a real portal, a real
 *        role, two renews), and `getOneAwsSsoSessionProof.integration.test.ts`,
 *        which drives the real aws cli and sdk through the absent-session case
 */
const MOCK_AWS_CLI_DIR = join(
  __dirname,
  '../../../../blackbox/.test/assets/mock-aws-cli',
);

/**
 * .what = a short tick and window, so a renew lands in seconds, not minutes
 */
const TICK_MS = 200;
const WINDOW_MS = 2_000;

/**
 * .what = the max polls (100ms apart) a test waits for a spawned daemon to answer
 * .why = a cold daemon spawn under a full parallel suite takes seconds
 */
const DAEMON_REACHABLE_POLL_LIMIT = 200;

/**
 * .what = the env keys a spawned daemon reads for this suite
 * .why = the daemon spawn passes process.env, so the suite sets these and restores each
 */
const ENV_KEYS_FOR_RENEW = [
  'PATH',
  'AWS_SDK_MOCK',
  'MOCK_AWS_PORTAL_STATE_FILE',
  'MOCK_AWS_LOGIN_LOG',
  'MOCK_AWS_CREDENTIAL_TTL_S',
  'KEYRACK_DAEMON_RENEW_TICK_MS',
  'KEYRACK_DAEMON_RENEW_WINDOW_MS',
] as const;

/**
 * .what = wait a span of real time
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((done) => setTimeout(done, ms));

/**
 * .what = an sso grant for a mock profile that dies `expiresInMs` from now
 */
const genSsoGrant = (input: { expiresInMs: number }): KeyrackKeyGrant =>
  new KeyrackKeyGrant({
    slug: 'mockorg.camp.AWS_PROFILE',
    key: {
      secret: 'mockorg.camp',
      grade: { protection: 'reference', duration: 'ephemeral' },
    },
    source: { vault: 'aws.config', mech: 'EPHEMERAL_VIA_AWS_SSO' },
    env: 'camp',
    org: 'mockorg',
    expiresAt: asIsoTimeStamp(new Date(Date.now() + input.expiresInMs)),
  });

/**
 * .what = spawn a real daemon process whose renew tick runs against the mock aws cli
 * .why = the daemon is a separate process in prod, and its renew shells out to aws
 *        under its own env. a spawned daemon inherits this env verbatim, so the mock
 *        cli, the session state, and the short tick reach it exactly as a real
 *        daemon would read them
 */
const genDaemonForRenew = async (input: {
  slug: string;
  portalState: string;
}) => {
  const dir = genTempDir({ slug: `keyrack-sso-renew-${input.slug}` });
  const portalStateFile = join(dir, 'portal.state');
  const loginLog = join(dir, 'login.log');
  writeFileSync(portalStateFile, input.portalState);

  // the env the spawned daemon reads
  process.env.PATH = `${MOCK_AWS_CLI_DIR}:${process.env.PATH}`;
  process.env.AWS_SDK_MOCK = '1';
  process.env.MOCK_AWS_PORTAL_STATE_FILE = portalStateFile;
  process.env.MOCK_AWS_LOGIN_LOG = loginLog;
  process.env.MOCK_AWS_CREDENTIAL_TTL_S = '3600';
  process.env.KEYRACK_DAEMON_RENEW_TICK_MS = String(TICK_MS);
  process.env.KEYRACK_DAEMON_RENEW_WINDOW_MS = String(WINDOW_MS);

  // spawn, then wait for it to answer
  const socketPath = `/tmp/keyrack-renew-${input.slug}-${process.pid}.sock`;
  killKeyrackDaemon({ socketPath });
  spawnKeyrackDaemonBackground({ socketPath });
  const isReachable = await (async () => {
    for (const _ of Array.from({ length: DAEMON_REACHABLE_POLL_LIMIT })) {
      if (await isDaemonReachable({ socketPath })) return true;
      await sleep(100);
    }
    return false;
  })();
  if (!isReachable)
    throw new MalfunctionError('spawned daemon never answered', {
      socketPath,
      pollLimit: DAEMON_REACHABLE_POLL_LIMIT,
      hint: 'run this file alone to rule out a cold spawn under load; still dark → the daemon exits at start, so read its stderr via a foreground startKeyrackDaemon on this socketPath',
    });

  return { socketPath, loginLog, portalStateFile };
};

/**
 * .what = unlock an sso grant with a max expiry, an hour out unless named
 */
const unlockSsoGrant = async (input: {
  socketPath: string;
  grant: KeyrackKeyGrant;
  maxInMs?: number;
}): Promise<void> => {
  await daemonAccessUnlock({
    socketPath: input.socketPath,
    keys: [input.grant],
    renewals: [
      {
        slug: input.grant.slug,
        expiresAtMax: asIsoTimeStamp(
          new Date(Date.now() + (input.maxInMs ?? 3_600_000)),
        ),
      },
    ],
  });
};

/**
 * .what = clamps the daemon's silent renew of an aws sso grant
 * .why = the wish: a key the daemon holds via aws sso stays live past its role creds'
 *        expiry, with no hand unlock, while the portal session lives. red without the
 *        renew (the grant dies at its expiry), green with it
 */
describe('keyrack daemon sso renew', () => {
  // restore each key this suite sets, by name — never a swap of the env object
  const envBefore = Object.fromEntries(
    ENV_KEYS_FOR_RENEW.map((key) => [key, process.env[key]]),
  );
  afterAll(() => {
    ENV_KEYS_FOR_RENEW.forEach((key) => {
      if (envBefore[key] === undefined) delete process.env[key];
      if (envBefore[key] !== undefined) process.env[key] = envBefore[key];
    });
  });

  given(
    '[case1] an sso grant near expiry, portal live, max expiry ahead',
    () => {
      const scene = useBeforeAll(async () => {
        const daemon = await genDaemonForRenew({
          slug: 'live',
          portalState: '',
        });
        const grant = genSsoGrant({ expiresInMs: 2_500 });
        await unlockSsoGrant({ socketPath: daemon.socketPath, grant });

        // wait past the grant's own expiry
        await sleep(4_000);
        return { daemon, grant };
      });

      afterAll(() =>
        killKeyrackDaemon({ socketPath: scene.daemon.socketPath }),
      );

      when('[t0] a consumer gets the key after its original expiry', () => {
        // one socket read, shared by both asserts
        const result = useThen('the daemon answers the get', async () =>
          daemonAccessGet({
            socketPath: scene.daemon.socketPath,
            slugs: [scene.grant.slug],
          }),
        );

        then('the key is still granted — the renew kept it alive', () => {
          expect(result?.keys.map((key: { slug: string }) => key.slug)).toEqual(
            [scene.grant.slug],
          );
        });

        then('its expiry moved out to the renewed role creds', () => {
          const expiresAt = result?.keys[0]?.expiresAt;
          expect(expiresAt).toBeDefined();
          const expiresAtMs = new Date(expiresAt!).getTime();
          expect(expiresAtMs - Date.now()).toBeGreaterThan(50 * 60 * 1000);
        });
      });

      when('[t1] keyrack status runs', () => {
        then('the key shows renewal `on`, with a renew count', async () => {
          const status = await daemonAccessStatus({
            socketPath: scene.daemon.socketPath,
          });
          const key = status?.keys.find((it) => it.slug === scene.grant.slug);
          expect(key?.renewal?.count.renewed).toBeGreaterThanOrEqual(1);
          expect(key?.renewal?.status).toEqual('on');
        });

        then('the browser login was never invoked', () => {
          expect(existsSync(scene.daemon.loginLog)).toBe(false);
        });
      });
    },
  );

  given('[case2] an sso grant near expiry, portal lapsed', () => {
    const scene = useBeforeAll(async () => {
      const daemon = await genDaemonForRenew({
        slug: 'lapsed',
        portalState: 'lapsed',
      });
      const grant = genSsoGrant({ expiresInMs: 1_500 });
      await unlockSsoGrant({ socketPath: daemon.socketPath, grant });
      await sleep(3_000);
      return { daemon, grant };
    });

    afterAll(() => killKeyrackDaemon({ socketPath: scene.daemon.socketPath }));

    when('[t0] the grant has passed its expiry', () => {
      then('a consumer reads the key as locked', async () => {
        const result = await daemonAccessGet({
          socketPath: scene.daemon.socketPath,
          slugs: [scene.grant.slug],
        });
        expect(result?.keys).toEqual([]);
      });

      then(
        'status still names the key, expired, its renewal lapsed',
        async () => {
          const status = await daemonAccessStatus({
            socketPath: scene.daemon.socketPath,
          });
          const key = status?.keys.find((it) => it.slug === scene.grant.slug);
          expect(key?.expiresIn).toEqual({ seconds: 0 });
          expect(key?.renewal?.status).toEqual('lapsed');
          expect(key?.renewal?.error).toBeNull();
        },
      );

      then('the browser login was never invoked', () => {
        expect(existsSync(scene.daemon.loginLog)).toBe(false);
      });
    });
  });

  given('[case3] an sso grant whose renew faults on every tick', () => {
    const scene = useBeforeAll(async () => {
      const daemon = await genDaemonForRenew({
        slug: 'fault',
        portalState: 'fault',
      });
      const grant = genSsoGrant({ expiresInMs: 1_500 });
      await unlockSsoGrant({ socketPath: daemon.socketPath, grant });

      // ten ticks of faults, plus margin for the mock cli's own runtime
      await sleep(TICK_MS * 10 + 4_000);
      return { daemon, grant };
    });

    afterAll(() => killKeyrackDaemon({ socketPath: scene.daemon.socketPath }));

    when('[t0] ten faults have run in a row', () => {
      then('status names the key halted, with the last error', async () => {
        const status = await daemonAccessStatus({
          socketPath: scene.daemon.socketPath,
        });
        const key = status?.keys.find((it) => it.slug === scene.grant.slug);
        expect(key?.renewal?.status).toEqual('halted');
        expect(key?.renewal?.error).toContain('export-credentials');
      });

      then('the browser login was never invoked', () => {
        expect(existsSync(scene.daemon.loginLog)).toBe(false);
      });
    });
  });

  given('[case4] an sso grant whose cli names no expiry', () => {
    const scene = useBeforeAll(async () => {
      const daemon = await genDaemonForRenew({
        slug: 'noexpiry',
        portalState: 'noexpiry',
      });
      const grant = genSsoGrant({ expiresInMs: 1_500 });
      await unlockSsoGrant({ socketPath: daemon.socketPath, grant });

      // ten ticks of faults, plus margin for the mock cli's own runtime
      await sleep(TICK_MS * 10 + 4_000);
      return { daemon, grant };
    });

    afterAll(() => killKeyrackDaemon({ socketPath: scene.daemon.socketPath }));

    when('[t0] each renew reads live creds with no expiry', () => {
      then(
        'the renew never guesses an expiry; it halts and names why',
        async () => {
          const status = await daemonAccessStatus({
            socketPath: scene.daemon.socketPath,
          });
          const key = status?.keys.find((it) => it.slug === scene.grant.slug);
          expect(key?.renewal?.count.renewed).toEqual(0);
          expect(key?.renewal?.status).toEqual('halted');
          expect(key?.renewal?.error).toContain(
            'aws sso renew returned no expiry',
          );
        },
      );
    });
  });

  given('[case5] an sso grant unlocked into a current daemon', () => {
    const scene = useBeforeAll(async () => {
      const daemon = await genDaemonForRenew({
        slug: 'reply',
        portalState: '',
      });
      const grant = genSsoGrant({ expiresInMs: 60_000 });
      const reply = await daemonAccessUnlock({
        socketPath: daemon.socketPath,
        keys: [grant],
        renewals: [
          {
            slug: grant.slug,
            expiresAtMax: asIsoTimeStamp(new Date(Date.now() + 3_600_000)),
          },
        ],
      });
      return { daemon, grant, reply };
    });

    afterAll(() => killKeyrackDaemon({ socketPath: scene.daemon.socketPath }));

    when('[t0] the unlock reply is read', () => {
      then('it names the grant as renewable, so the cli sees no skew', () => {
        expect(scene.reply.renewable).toEqual([scene.grant.slug]);
      });
    });
  });

  given(
    '[case6] an sso grant whose first renews fault, then clear (a blip)',
    () => {
      const scene = useBeforeAll(async () => {
        const daemon = await genDaemonForRenew({
          slug: 'blip',
          portalState: 'fault',
        });
        // inside the window at once, so the first ticks try a renew and fault
        const grant = genSsoGrant({ expiresInMs: 1_500 });
        await unlockSsoGrant({ socketPath: daemon.socketPath, grant });

        // a few faulted ticks, well short of the ten that halt, then the fault clears
        await sleep(TICK_MS * 3);
        writeFileSync(daemon.portalStateFile, '');
        await sleep(2_000);
        return { daemon, grant };
      });

      afterAll(() =>
        killKeyrackDaemon({ socketPath: scene.daemon.socketPath }),
      );

      when('[t0] the fault has cleared', () => {
        then('the key renewed, its renewal still `on`', async () => {
          const status = await daemonAccessStatus({
            socketPath: scene.daemon.socketPath,
          });
          const key = status?.keys.find((it) => it.slug === scene.grant.slug);
          expect(key?.renewal?.count.renewed).toBeGreaterThanOrEqual(1);
          expect(key?.renewal?.status).toEqual('on');
        });
      });
    },
  );

  given(
    '[case7] an sso grant already past expiry at its first tick (a late wake)',
    () => {
      const scene = useBeforeAll(async () => {
        const daemon = await genDaemonForRenew({
          slug: 'latewake',
          portalState: '',
        });

        // the grant dies before the first tick, as after a sleep past its expiry
        const grant = genSsoGrant({ expiresInMs: 50 });
        await unlockSsoGrant({ socketPath: daemon.socketPath, grant });
        await sleep(2_000);
        return { daemon, grant };
      });

      afterAll(() =>
        killKeyrackDaemon({ socketPath: scene.daemon.socketPath }),
      );

      when('[t0] a consumer gets the key after the tick', () => {
        then('the key is granted again — the renew revived it', async () => {
          const result = await daemonAccessGet({
            socketPath: scene.daemon.socketPath,
            slugs: [scene.grant.slug],
          });
          expect(result?.keys.map((key) => key.slug)).toEqual([
            scene.grant.slug,
          ]);
        });
      });
    },
  );

  given('[case8] an sso grant whose max expiry lies seconds out', () => {
    const scene = useBeforeAll(async () => {
      const daemon = await genDaemonForRenew({
        slug: 'max',
        portalState: '',
      });
      const grant = genSsoGrant({ expiresInMs: 1_500 });
      await unlockSsoGrant({
        socketPath: daemon.socketPath,
        grant,
        maxInMs: 3_000,
      });

      // the renew lands before the grant expires, clipped to the max
      await sleep(1_500);
      const statusAtMax = await daemonAccessStatus({
        socketPath: daemon.socketPath,
      });

      // then wait past the max
      await sleep(3_000);
      return { daemon, grant, statusAtMax };
    });

    afterAll(() => killKeyrackDaemon({ socketPath: scene.daemon.socketPath }));

    when('[t0] the renew has clipped the grant to its max', () => {
      then('status says the renewal is `off`', () => {
        const key = scene.statusAtMax?.keys.find(
          (it) => it.slug === scene.grant.slug,
        );
        expect(key?.renewal?.count.renewed).toBeGreaterThanOrEqual(1);
        expect(key?.renewal?.status).toEqual('off');
      });
    });

    when('[t1] the max expiry has passed', () => {
      then('a consumer reads the key as locked — the max held', async () => {
        const result = await daemonAccessGet({
          socketPath: scene.daemon.socketPath,
          slugs: [scene.grant.slug],
        });
        expect(result?.keys).toEqual([]);
      });
    });
  });
});
