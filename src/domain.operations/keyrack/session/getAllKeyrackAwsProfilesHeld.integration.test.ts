import { asIsoTimeStamp } from 'iso-time';
import { given, then, useBeforeAll, when } from 'test-fns';

import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import { daemonAccessUnlock } from '@src/domain.operations/keyrack/daemon/sdk';
import { createKeyrackDaemonServer } from '@src/domain.operations/keyrack/daemon/svc';

import { existsSync, unlinkSync } from 'node:fs';
import { getAllKeyrackAwsProfilesHeld } from './getAllKeyrackAwsProfilesHeld';

/**
 * .what = a grant held by the test daemon
 * .why = each case holds aws.config grants beside a peer vault's grant
 */
const genGrant = (input: {
  slug: string;
  env: string;
  vault: 'aws.config' | 'os.secure';
  secret: string;
}): KeyrackKeyGrant =>
  new KeyrackKeyGrant({
    slug: input.slug,
    key: {
      secret: input.secret,
      grade: { protection: 'encrypted', duration: 'ephemeral' },
    },
    source:
      input.vault === 'aws.config'
        ? { vault: 'aws.config', mech: 'EPHEMERAL_VIA_AWS_SSO' }
        : { vault: 'os.secure', mech: 'PERMANENT_VIA_REPLICA' },
    env: input.env,
    org: 'testorg',
    expiresAt: asIsoTimeStamp(new Date(Date.now() + 60_000)),
  });

describe('getAllKeyrackAwsProfilesHeld', () => {
  const socketPath = `/tmp/keyrack-profiles-held-${process.pid}.sock`;
  const pidPath = socketPath.replace(/\.sock$/, '.pid');

  beforeAll(() => {
    if (existsSync(socketPath)) unlinkSync(socketPath);
    if (existsSync(pidPath)) unlinkSync(pidPath);
  });
  afterAll(() => {
    if (existsSync(socketPath)) unlinkSync(socketPath);
    if (existsSync(pidPath)) unlinkSync(pidPath);
  });

  given(
    '[case1] a daemon that holds aws.config grants beside a peer vault grant',
    () => {
      const scene = useBeforeAll(async () => {
        const daemon = await createKeyrackDaemonServer({
          socketPath,
          homeHash: 'a1b2c3d4',
        });
        await daemonAccessUnlock({
          socketPath,
          keys: [
            genGrant({
              slug: 'testorg.test.AWS_PROFILE',
              env: 'test',
              vault: 'aws.config',
              secret: 'testorg.dev',
            }),
            genGrant({
              slug: 'testorg.prep.AWS_PROFILE',
              env: 'prep',
              vault: 'aws.config',
              secret: 'testorg.prep',
            }),
            genGrant({
              slug: 'testorg.test.API_KEY',
              env: 'test',
              vault: 'os.secure',
              secret: 'value-never-a-profile',
            }),
          ],
        });
        return daemon;
      });
      afterAll(() => scene.server.close());

      when('[t0] the relock names no slug and no env', () => {
        then(
          'every held aws.config key yields its profile, the peer vault key none',
          async () => {
            const held = await getAllKeyrackAwsProfilesHeld({
              socketPath,
              slugs: null,
              env: null,
            });
            expect(
              [...held].sort((a, b) => a.slug.localeCompare(b.slug)),
            ).toEqual([
              { slug: 'testorg.prep.AWS_PROFILE', profile: 'testorg.prep' },
              { slug: 'testorg.test.AWS_PROFILE', profile: 'testorg.dev' },
            ]);
          },
        );
      });

      when('[t1] the relock names an env', () => {
        then('only the held aws.config keys of that env yield', async () => {
          const held = await getAllKeyrackAwsProfilesHeld({
            socketPath,
            slugs: null,
            env: 'test',
          });
          expect(held).toEqual([
            { slug: 'testorg.test.AWS_PROFILE', profile: 'testorg.dev' },
          ]);
        });
      });

      when(
        '[t2] the relock names slugs, one a peer vault key and one not held',
        () => {
          then('only the named aws.config key yields', async () => {
            const held = await getAllKeyrackAwsProfilesHeld({
              socketPath,
              slugs: [
                'testorg.prep.AWS_PROFILE',
                'testorg.test.API_KEY',
                'testorg.test.ABSENT',
              ],
              env: null,
            });
            expect(held).toEqual([
              { slug: 'testorg.prep.AWS_PROFILE', profile: 'testorg.prep' },
            ]);
          });
        },
      );

      when('[t3] the relock names an env that holds no key', () => {
        then('it yields none', async () => {
          const held = await getAllKeyrackAwsProfilesHeld({
            socketPath,
            slugs: null,
            env: 'prod',
          });
          expect(held).toEqual([]);
        });
      });
    },
  );

  given('[case2] no daemon at the socket path', () => {
    when('[t0] the relock names no slug', () => {
      then('it yields none, since no daemon holds a grant', async () => {
        const held = await getAllKeyrackAwsProfilesHeld({
          socketPath: `/tmp/keyrack-profiles-held-absent-${process.pid}.sock`,
          slugs: null,
          env: null,
        });
        expect(held).toEqual([]);
      });
    });

    when('[t1] the relock names a slug', () => {
      then('it yields none', async () => {
        const held = await getAllKeyrackAwsProfilesHeld({
          socketPath: `/tmp/keyrack-profiles-held-absent-${process.pid}.sock`,
          slugs: ['testorg.test.AWS_PROFILE'],
          env: null,
        });
        expect(held).toEqual([]);
      });
    });
  });
});
