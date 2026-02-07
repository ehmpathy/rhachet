import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';
import { getGitRepoRoot } from 'rhachet-artifact-git';

import type {
  KeyrackGrantMechanism,
  KeyrackHostVault,
} from '@src/domain.objects/keyrack';
import {
  genKeyrackGrantContext,
  genKeyrackHostContext,
  getKeyrackKeyGrant,
  setKeyrackKeyHost,
} from '@src/domain.operations/keyrack';
import { getKeyrackStatus } from '@src/domain.operations/keyrack/session/getKeyrackStatus';
import { relockKeyrack } from '@src/domain.operations/keyrack/session/relockKeyrack';
import { unlockKeyrack } from '@src/domain.operations/keyrack/session/unlockKeyrack';

/**
 * .what = adds the "keyrack" command group to the CLI
 * .why = enables credential management via keyrack get/set/unlock
 *
 * .note = does not require rhachet.use.ts config
 * .note = works with host manifest (~/.rhachet/) and repo manifest (.agent/keyrack.yml)
 */
export const invokeKeyrack = ({ program }: { program: Command }): void => {
  const keyrack = program
    .command('keyrack')
    .description('manage credentials via keyrack');

  // keyrack get --for repo
  // keyrack get --key $key
  keyrack
    .command('get')
    .description('grant credentials from keyrack')
    .option('--for <scope>', 'grant scope: "repo" for all keys')
    .option('--key <slug>', 'grant specific key by slug')
    .option('--json', 'output as json (robot mode)')
    .action(async (opts: { for?: string; key?: string; json?: boolean }) => {
      // validate: must specify either --for repo or --key
      if (!opts.for && !opts.key) {
        throw new BadRequestError('must specify --for repo or --key <slug>');
      }
      if (opts.for && opts.for !== 'repo') {
        throw new BadRequestError('--for must be "repo"');
      }

      // get gitroot for repo manifest
      const gitroot = await getGitRepoRoot({ from: process.cwd() });

      // generate context
      const context = await genKeyrackGrantContext({ gitroot });

      // handle grant
      if (opts.for === 'repo') {
        const attempts = await getKeyrackKeyGrant(
          { for: { repo: true } },
          context,
        );

        // output results
        if (opts.json) {
          console.log(JSON.stringify(attempts, null, 2));
        } else {
          // count stats
          const granted = attempts.filter((a) => a.status === 'granted');
          const blocked = attempts.filter((a) => a.status === 'blocked');
          const absent = attempts.filter((a) => a.status === 'absent');

          console.log('');
          console.log('🔐 rhachet/keyrack');
          for (let i = 0; i < attempts.length; i++) {
            const attempt = attempts[i]!;
            const isLast = i === attempts.length - 1;
            const prefix = isLast ? '   └─' : '   ├─';
            const indent = isLast ? '      ' : '   │  ';

            if (attempt.status === 'granted') {
              console.log(`${prefix} ${attempt.grant.slug}`);
              console.log(`${indent}├─ vault: ${attempt.grant.source.vault}`);
              console.log(`${indent}├─ mech: ${attempt.grant.source.mech}`);
              console.log(`${indent}└─ status: granted 🔑`);
            } else if (attempt.status === 'blocked') {
              console.log(`${prefix} ${attempt.slug}`);
              console.log(`${indent}└─ status: blocked 🚫`);
              console.log(`${indent}   └─ ${attempt.message}`);
            } else {
              console.log(`${prefix} ${attempt.slug}`);
              console.log(`${indent}└─ status: absent 🫧`);
              if (attempt.fix) {
                console.log(`${indent}   └─ fix: ${attempt.fix}`);
              }
            }
          }
          console.log(
            `done. ${granted.length} granted, ${blocked.length} blocked, ${absent.length} absent.`,
          );
          console.log('');
        }
      } else if (opts.key) {
        const attempt = await getKeyrackKeyGrant(
          { for: { key: opts.key } },
          context,
        );

        // output results
        if (opts.json) {
          console.log(JSON.stringify(attempt, null, 2));
        } else {
          console.log('');
          console.log('🔐 rhachet/keyrack');
          if (attempt.status === 'granted') {
            console.log(`   └─ ${attempt.grant.slug}`);
            console.log(`      ├─ vault: ${attempt.grant.source.vault}`);
            console.log(`      ├─ mech: ${attempt.grant.source.mech}`);
            console.log(`      └─ status: granted 🔑`);
            console.log('done. 1 granted.');
          } else if (attempt.status === 'blocked') {
            console.log(`   └─ ${attempt.slug}`);
            console.log(`      └─ status: blocked 🚫`);
            console.log(`         └─ ${attempt.message}`);
            console.log('done. 1 blocked.');
          } else if (attempt.status === 'locked') {
            console.log(`   └─ ${attempt.slug}`);
            console.log(`      └─ status: locked 🔒`);
            if (attempt.fix) {
              console.log(`         └─ fix: ${attempt.fix}`);
            }
            console.log('done. 1 locked.');
          } else {
            console.log(`   └─ ${attempt.slug}`);
            console.log(`      └─ status: absent 🫧`);
            if (attempt.fix) {
              console.log(`         └─ fix: ${attempt.fix}`);
            }
            console.log('done. 1 absent.');
          }
          console.log('');
        }
      }
    });

  // keyrack set --key $key --mech $mech --vault $vault
  keyrack
    .command('set')
    .description('configure storage for a credential key')
    .requiredOption('--key <slug>', 'key slug to configure')
    .requiredOption(
      '--mech <mechanism>',
      'grant mechanism: PERMANENT_VIA_REPLICA, EPHEMERAL_VIA_GITHUB_APP, EPHEMERAL_VIA_AWS_SSO',
    )
    .requiredOption(
      '--vault <vault>',
      'storage vault: os.direct, os.secure, 1password',
    )
    .option('--exid <exid>', 'external id (vault-specific reference)')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        key: string;
        mech: string;
        vault: string;
        exid?: string;
        json?: boolean;
      }) => {
        // validate mechanism (accept new and deprecated names)
        const validMechs: KeyrackGrantMechanism[] = [
          'PERMANENT_VIA_REPLICA',
          'EPHEMERAL_VIA_GITHUB_APP',
          'EPHEMERAL_VIA_AWS_SSO',
          'EPHEMERAL_VIA_GITHUB_OIDC',
          // deprecated aliases (still accepted for backwards compat)
          'REPLICA',
          'GITHUB_APP',
          'AWS_SSO',
        ];
        if (!validMechs.includes(opts.mech as KeyrackGrantMechanism)) {
          throw new BadRequestError(
            `invalid --mech: must be one of PERMANENT_VIA_REPLICA, EPHEMERAL_VIA_GITHUB_APP, EPHEMERAL_VIA_AWS_SSO`,
          );
        }

        // validate vault
        const validVaults: KeyrackHostVault[] = [
          'os.direct',
          'os.secure',
          'os.daemon',
          '1password',
        ];
        if (!validVaults.includes(opts.vault as KeyrackHostVault)) {
          throw new BadRequestError(
            `invalid --vault: must be one of ${validVaults.join(', ')}`,
          );
        }

        // generate context
        const context = await genKeyrackHostContext();

        // set the key host
        const keyHost = await setKeyrackKeyHost(
          {
            slug: opts.key,
            mech: opts.mech as KeyrackGrantMechanism,
            vault: opts.vault as KeyrackHostVault,
            exid: opts.exid,
          },
          context,
        );

        // output results
        if (opts.json) {
          console.log(JSON.stringify(keyHost, null, 2));
        } else {
          console.log('');
          console.log('🔐 rhachet/keyrack set');
          console.log(`   └─ ${opts.key}`);
          console.log(`      ├─ mech: ${keyHost.mech}`);
          console.log(`      ├─ vault: ${keyHost.vault}`);
          if (keyHost.exid) {
            console.log(`      ├─ exid: ${keyHost.exid}`);
          }
          console.log(`      └─ status: configured ✨`);
          console.log('done.');
          console.log('');
        }
      },
    );

  // keyrack unlock [--duration 9h] [--passphrase <passphrase>]
  keyrack
    .command('unlock')
    .description('unlock keys and send them to daemon for session access')
    .option(
      '--duration <duration>',
      'TTL for unlocked keys (e.g., 9h, 30m)',
      '9h',
    )
    .option('--passphrase <passphrase>', 'passphrase for encrypted vaults')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        duration?: string;
        passphrase?: string;
        json?: boolean;
      }) => {
        // get gitroot for repo manifest
        const gitroot = await getGitRepoRoot({ from: process.cwd() });

        // generate context
        const context = await genKeyrackGrantContext({ gitroot });

        // unlock keys and send to daemon
        const { unlocked } = await unlockKeyrack(
          { duration: opts.duration, passphrase: opts.passphrase },
          context,
        );

        // output results
        if (opts.json) {
          console.log(JSON.stringify({ unlocked }, null, 2));
        } else {
          console.log('');
          console.log('🔓 rhachet/keyrack unlock');
          for (let i = 0; i < unlocked.length; i++) {
            const key = unlocked[i]!;
            const isLast = i === unlocked.length - 1;
            const prefix = isLast ? '   └─' : '   ├─';
            const indent = isLast ? '      ' : '   │  ';
            const expiresIn = Math.round(
              (key.expiresAt - Date.now()) / 1000 / 60,
            );
            console.log(`${prefix} ${key.slug}`);
            console.log(`${indent}├─ vault: ${key.vault}`);
            console.log(`${indent}└─ expires in: ${expiresIn}m`);
          }
          console.log(`done. ${unlocked.length} keys unlocked.`);
          console.log('');
        }
      },
    );

  // keyrack relock [--key <slug>]
  keyrack
    .command('relock')
    .description('purge keys from daemon memory')
    .option('--key <slug>', 'relock specific key (default: all keys)')
    .option('--json', 'output as json (robot mode)')
    .action(async (opts: { key?: string; json?: boolean }) => {
      // relock keys
      const slugs = opts.key ? [opts.key] : undefined;
      const { relocked } = await relockKeyrack({ slugs });

      // output results
      if (opts.json) {
        console.log(JSON.stringify({ relocked }, null, 2));
      } else {
        console.log('');
        console.log('🔒 rhachet/keyrack relock');
        if (relocked.length === 0) {
          console.log('   └─ (no keys to purge)');
        } else {
          for (let i = 0; i < relocked.length; i++) {
            const slug = relocked[i]!;
            const isLast = i === relocked.length - 1;
            const prefix = isLast ? '   └─' : '   ├─';
            console.log(`${prefix} ${slug}: purged 🔒`);
          }
        }
        console.log(`done. ${relocked.length} keys purged.`);
        console.log('');
      }
    });

  // keyrack status
  keyrack
    .command('status')
    .description('show status of unlocked keys in daemon')
    .option('--json', 'output as json (robot mode)')
    .action(async (opts: { json?: boolean }) => {
      // get status
      const status = await getKeyrackStatus();

      // output results
      if (opts.json) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log('');
        console.log('🔐 rhachet/keyrack status');
        if (!status) {
          console.log('   └─ daemon: not found');
          console.log('      └─ run `rhx keyrack unlock` to start session');
        } else if (status.keys.length === 0) {
          console.log('   └─ daemon: active ✨');
          console.log('      └─ (no keys unlocked)');
        } else {
          console.log('   ├─ daemon: active ✨');
          for (let i = 0; i < status.keys.length; i++) {
            const key = status.keys[i]!;
            const isLast = i === status.keys.length - 1;
            const prefix = isLast ? '   └─' : '   ├─';
            const indent = isLast ? '      ' : '   │  ';
            const ttlMinutes = Math.round(key.ttlLeftMs / 1000 / 60);
            console.log(`${prefix} ${key.slug}`);
            console.log(`${indent}└─ expires in: ${ttlMinutes}m`);
          }
        }
        console.log('');
      }
    });

  // keyrack list
  keyrack
    .command('list')
    .description('list configured keys on this host')
    .option('--json', 'output as json (robot mode)')
    .action(async (opts: { json?: boolean }) => {
      // generate context
      const context = await genKeyrackHostContext();

      const hosts = context.hostManifest.hosts;
      const slugs = Object.keys(hosts);

      // output results
      if (opts.json) {
        console.log(JSON.stringify(hosts, null, 2));
      } else {
        console.log('');
        console.log('🔐 rhachet/keyrack');
        if (slugs.length === 0) {
          console.log('   └─ (no keys configured)');
        } else {
          for (let i = 0; i < slugs.length; i++) {
            const slug = slugs[i]!;
            const host = hosts[slug]!;
            const isLast = i === slugs.length - 1;
            const prefix = isLast ? '   └─' : '   ├─';
            const indent = isLast ? '      ' : '   │  ';
            console.log(`${prefix} ${slug}`);
            console.log(`${indent}├─ mech: ${host.mech}`);
            console.log(`${indent}└─ vault: ${host.vault}`);
          }
        }
        console.log(`done. ${slugs.length} keys configured.`);
        console.log('');
      }
    });
};
