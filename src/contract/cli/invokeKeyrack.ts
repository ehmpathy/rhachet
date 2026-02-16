import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';
import readline from 'readline';
import { getGitRepoRoot } from 'rhachet-artifact-git';

import type {
  KeyrackGrantMechanism,
  KeyrackHostVault,
} from '@src/domain.objects/keyrack';
import {
  genKeyrackGrantContext,
  genKeyrackHostContext,
  getKeyrackKeyGrant,
  initKeyrackRepoManifest,
  setKeyrackKey,
} from '@src/domain.operations/keyrack';
import { assertKeyrackOrgMatchesManifest } from '@src/domain.operations/keyrack/assertKeyrackOrgMatchesManifest';
import { initKeyrack } from '@src/domain.operations/keyrack/initKeyrack';
import { delKeyrackRecipient } from '@src/domain.operations/keyrack/recipient/delKeyrackRecipient';
import { getKeyrackRecipients } from '@src/domain.operations/keyrack/recipient/getKeyrackRecipients';
import { setKeyrackRecipient } from '@src/domain.operations/keyrack/recipient/setKeyrackRecipient';
import { getKeyrackStatus } from '@src/domain.operations/keyrack/session/getKeyrackStatus';
import { relockKeyrack } from '@src/domain.operations/keyrack/session/relockKeyrack';
import { unlockKeyrack } from '@src/domain.operations/keyrack/session/unlockKeyrack';
import { inferMechFromVault } from '@src/infra/inferMechFromVault';
import { promptHiddenInput } from '@src/infra/promptHiddenInput';

/**
 * .what = prompts user for input via readline
 * .why = interactive cli input for guided setup flows
 */
const promptUser = (question: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
};

/**
 * .what = prompts user to select from a list of options
 * .why = interactive selection for guided setup flows
 */
const promptSelect = async <T extends { label: string }>(
  question: string,
  options: T[],
): Promise<T> => {
  console.log(question);
  options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt.label}`));
  const answer = await promptUser('enter number: ');
  const index = parseInt(answer, 10) - 1;
  if (isNaN(index) || index < 0 || index >= options.length) {
    throw new BadRequestError(`invalid selection: ${answer}`);
  }
  return options[index]!;
};

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

  // keyrack init [--for owner] [--pubkey path] [--label label] [--org org]
  keyrack
    .command('init')
    .description('initialize keyrack with a recipient key')
    .option('--for <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--pubkey <path>', 'path to private key or .pub file')
    .option(
      '--label <label>',
      'label for the recipient key (default: "default")',
    )
    .option(
      '--org <org>',
      'org for repo manifest (required if keyrack.yml absent)',
    )
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        for?: string;
        pubkey?: string;
        label?: string;
        org?: string;
        json?: boolean;
      }) => {
        // get gitroot to check for repo manifest
        const gitroot = await getGitRepoRoot({ from: process.cwd() }).catch(
          () => null,
        );

        const result = await initKeyrack({
          owner: opts.for ?? null,
          pubkey: opts.pubkey,
          label: opts.label,
          gitroot,
          org: opts.org ?? null,
        });

        // display paths with ~/ instead of $HOME
        const asHomePath = (p: string) =>
          p.replace(process.env.HOME ?? '', '~');

        if (opts.json) {
          console.log(
            JSON.stringify(
              {
                host: {
                  effect: result.host.effect,
                  manifestPath: result.host.manifestPath,
                  owner: result.host.owner,
                  recipient: result.host.recipient,
                },
                repo: result.repo
                  ? {
                      effect: result.repo.effect,
                      manifestPath: result.repo.manifestPath,
                      org: result.repo.org,
                    }
                  : null,
              },
              null,
              2,
            ),
          );
        } else {
          const hostStatus =
            result.host.effect === 'created'
              ? 'freshly minted ✨'
              : 'already active 👌';
          console.log('');
          console.log('🔐 rhachet/keyrack init');
          console.log(`   ├─ host manifest: ${hostStatus}`);
          console.log(
            `   │   ├─ path: ${asHomePath(result.host.manifestPath)}`,
          );
          console.log(`   │   ├─ owner: ${result.host.owner ?? 'default'}`);
          console.log(`   │   └─ recipient: ${result.host.recipient.label}`);
          if (result.repo) {
            const repoStatus =
              result.repo.effect === 'created'
                ? 'freshly minted ✨'
                : 'already active 👌';
            // show relative path from cwd
            const repoPathRelative = gitroot
              ? result.repo.manifestPath.replace(`${gitroot}/`, './')
              : result.repo.manifestPath;
            console.log(`   └─ repo manifest: ${repoStatus}`);
            console.log(`       ├─ path: ${repoPathRelative}`);
            console.log(`       └─ org: ${result.repo.org}`);
          } else {
            console.log(`   └─ repo manifest: not in repo`);
            console.log(
              `       └─ run 'rhachet keyrack init --org <org>' to init one`,
            );
          }
          console.log('');
        }
      },
    );

  // keyrack recipient set|get|del
  const recipient = keyrack
    .command('recipient')
    .description('manage recipients who can decrypt the host manifest');

  // keyrack recipient set --pubkey <pubkey> --label <label> [--for owner] [--stanza ssh]
  recipient
    .command('set')
    .description('add a recipient to the host manifest')
    .requiredOption('--pubkey <pubkey>', 'age pubkey (age1...) or ssh pubkey')
    .requiredOption('--label <label>', 'label for this recipient')
    .option('--for <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option(
      '--stanza <format>',
      'force stanza format: ssh (for ssh-keygen -p prevention flow)',
    )
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        pubkey: string;
        label: string;
        for?: string;
        stanza?: string;
        json?: boolean;
      }) => {
        // validate --stanza if provided
        if (opts.stanza && opts.stanza !== 'ssh')
          throw new BadRequestError('--stanza must be "ssh" if specified');

        const recipientAdded = await setKeyrackRecipient({
          owner: opts.for ?? null,
          pubkey: opts.pubkey,
          label: opts.label,
          stanza: opts.stanza as 'ssh' | undefined,
        });

        if (opts.json) {
          console.log(JSON.stringify(recipientAdded, null, 2));
        } else {
          console.log('');
          console.log('🔐 rhachet/keyrack recipient set');
          console.log(`   └─ added recipient`);
          console.log(`      ├─ label: ${recipientAdded.label}`);
          console.log(`      ├─ mech: ${recipientAdded.mech}`);
          console.log(
            `      └─ pubkey: ${recipientAdded.pubkey.slice(0, 20)}...`,
          );
          console.log('done. recipient added ✨');
          console.log('');
        }
      },
    );

  // keyrack recipient get [--for owner]
  recipient
    .command('get')
    .description('list recipients from the host manifest')
    .option('--for <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--json', 'output as json (robot mode)')
    .action(async (opts: { for?: string; json?: boolean }) => {
      const recipients = await getKeyrackRecipients({
        owner: opts.for ?? null,
      });

      if (opts.json) {
        console.log(JSON.stringify(recipients, null, 2));
      } else {
        console.log('');
        console.log('🔐 rhachet/keyrack recipient get');
        if (recipients.length === 0) {
          console.log('   └─ (no recipients)');
        } else {
          for (let i = 0; i < recipients.length; i++) {
            const r = recipients[i]!;
            const isLast = i === recipients.length - 1;
            const prefix = isLast ? '   └─' : '   ├─';
            const indent = isLast ? '      ' : '   │  ';
            console.log(`${prefix} ${r.label}`);
            console.log(`${indent}├─ mech: ${r.mech}`);
            console.log(`${indent}├─ pubkey: ${r.pubkey.slice(0, 20)}...`);
            console.log(`${indent}└─ added: ${r.addedAt}`);
          }
        }
        console.log(`done. ${recipients.length} recipients.`);
        console.log('');
      }
    });

  // keyrack recipient del --label <label> [--for owner]
  recipient
    .command('del')
    .description('remove a recipient from the host manifest')
    .requiredOption('--label <label>', 'label of recipient to remove')
    .option('--for <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--json', 'output as json (robot mode)')
    .action(async (opts: { label: string; for?: string; json?: boolean }) => {
      await delKeyrackRecipient({
        owner: opts.for ?? null,
        label: opts.label,
      });

      if (opts.json) {
        console.log(JSON.stringify({ deleted: opts.label }, null, 2));
      } else {
        console.log('');
        console.log('🔐 rhachet/keyrack recipient del');
        console.log(`   └─ removed recipient: ${opts.label}`);
        console.log('done. recipient removed ✨');
        console.log('');
      }
    });

  // keyrack get --for repo
  // keyrack get --key $key
  keyrack
    .command('get')
    .description('grant credentials from keyrack')
    .option('--for <scope>', 'grant scope: "repo" for all keys')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--key <keyname>', 'raw key name to grant (e.g., AWS_PROFILE)')
    .option('--env <env>', 'target env: prod, prep, test, all, or sudo')
    .option(
      '--org <org>',
      'target org: @this or @all (default: @this)',
      '@this',
    )
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        for?: string;
        owner?: string;
        key?: string;
        env?: string;
        org: string;
        json?: boolean;
      }) => {
        // validate: must specify either --for repo or --key
        if (!opts.for && !opts.key) {
          throw new BadRequestError('must specify --for repo or --key <slug>');
        }
        if (opts.for && opts.for !== 'repo') {
          throw new BadRequestError('--for must be "repo"');
        }

        // get gitroot for repo manifest
        const gitroot = await getGitRepoRoot({ from: process.cwd() });

        // generate context (use owner from --owner flag)
        const context = await genKeyrackGrantContext({
          owner: opts.owner ?? null,
          gitroot,
        });

        // handle grant
        if (opts.for === 'repo') {
          const attempts = await getKeyrackKeyGrant(
            { for: { repo: true }, env: opts.env },
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
            console.log('');
          }
        } else if (opts.key) {
          // resolve org from manifest (or use @all directly)
          let resolvedOrg: string;
          if (opts.org === '@all') {
            resolvedOrg = '@all';
          } else {
            if (!context.repoManifest) {
              // for sudo keys, guide user to use @all
              if (opts.env === 'sudo') {
                throw new BadRequestError(
                  'no keyrack.yml found in repo. for sudo credentials without keyrack.yml, use --org @all',
                );
              }
              throw new BadRequestError('no keyrack.yml found in repo');
            }
            resolvedOrg = assertKeyrackOrgMatchesManifest({
              manifest: context.repoManifest,
              org: opts.org,
            });
          }

          // detect if opts.key is already a full slug (org.env.key format)
          // full slug format: $org.$env.$key where env is one of the valid env values
          // note: we detect by format, not by hostManifest lookup, because manifest may be empty
          //       (e.g., when daemon has cached keys but manifest decryption fails)
          const validEnvs = ['sudo', 'prod', 'prep', 'test', 'all'];
          const parts = opts.key.split('.');
          const isFullSlug =
            parts.length >= 3 && validEnvs.includes(parts[1] ?? '');

          // construct slug: use as-is if full slug, otherwise $org.$env.$key
          const env = opts.env ?? 'all';
          const slug = isFullSlug
            ? opts.key
            : `${resolvedOrg}.${env}.${opts.key}`;

          const attempt = await getKeyrackKeyGrant(
            { for: { key: slug } },
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
            } else if (attempt.status === 'blocked') {
              console.log(`   └─ ${attempt.slug}`);
              console.log(`      └─ status: blocked 🚫`);
              console.log(`         └─ ${attempt.message}`);
            } else if (attempt.status === 'locked') {
              console.log(`   └─ ${attempt.slug}`);
              console.log(`      └─ status: locked 🔒`);
              if (attempt.fix) {
                console.log(`         └─ fix: ${attempt.fix}`);
              }
            } else {
              console.log(`   └─ ${attempt.slug}`);
              console.log(`      └─ status: absent 🫧`);
              if (attempt.fix) {
                console.log(`         └─ fix: ${attempt.fix}`);
              }
            }
            console.log('');
          }
        }
      },
    );

  // keyrack set --key $key --mech $mech --vault $vault [--for owner] [--env env] [--org org]
  keyrack
    .command('set')
    .description('configure storage for a credential key')
    .requiredOption(
      '--key <keyname>',
      'raw key name to configure (e.g., AWS_PROFILE)',
    )
    .option(
      '--mech <mechanism>',
      'grant mechanism (inferred from vault when omitted)',
    )
    .requiredOption(
      '--vault <vault>',
      'storage vault: os.direct, os.secure, os.daemon, os.envvar, 1password',
    )
    .option('--for <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option(
      '--env <env>',
      'target env: prod, prep, test, all, or sudo (default: all)',
      'all',
    )
    .option(
      '--org <org>',
      'target org: @this or @all (default: @this)',
      '@this',
    )
    .option('--exid <exid>', 'external id (vault-specific reference)')
    .option(
      '--vault-recipient <pubkey>',
      'pubkey for os.secure vault (if different from manifest)',
    )
    .option('--max-duration <duration>', 'max TTL for this key (e.g., 5m, 1h)')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        key: string;
        mech?: string;
        vault: string;
        for?: string;
        env: string;
        org: string;
        exid?: string;
        vaultRecipient?: string;
        maxDuration?: string;
        json?: boolean;
      }) => {
        // validate vault first (needed for mech inference)
        const validVaults: KeyrackHostVault[] = [
          'os.direct',
          'os.secure',
          'os.daemon',
          'os.envvar',
          '1password',
          'aws.iam.sso',
        ];
        if (!validVaults.includes(opts.vault as KeyrackHostVault)) {
          throw new BadRequestError(
            `invalid --vault: must be one of ${validVaults.join(', ')}`,
          );
        }

        // infer mech from vault if not provided
        const mech: KeyrackGrantMechanism = (() => {
          if (opts.mech) {
            // validate explicit mechanism
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
            return opts.mech as KeyrackGrantMechanism;
          }

          // infer from vault
          const inferred = inferMechFromVault({
            vault: opts.vault as KeyrackHostVault,
          });
          if (!inferred) {
            throw new BadRequestError(
              `--mech required for vault ${opts.vault}`,
            );
          }
          return inferred;
        })();

        // prompt for value via secure stdin for vaults that store values
        let value: string | null = null;
        const vaultsNeedValue: KeyrackHostVault[] = ['os.secure', 'os.direct'];
        if (vaultsNeedValue.includes(opts.vault as KeyrackHostVault)) {
          value = await promptHiddenInput({
            prompt: `enter value for ${opts.key}: `,
          });
          if (!value) {
            throw new BadRequestError(`value required for vault ${opts.vault}`);
          }
        }

        // validate env
        const validEnvs = ['sudo', 'prod', 'prep', 'test', 'all'];
        if (!validEnvs.includes(opts.env)) {
          throw new BadRequestError(
            `invalid --env: must be one of ${validEnvs.join(', ')}`,
          );
        }

        // get gitroot to resolve org from manifest
        const gitroot = await getGitRepoRoot({ from: process.cwd() });
        const grantContext = await genKeyrackGrantContext({
          owner: opts.for ?? null,
          gitroot,
        });
        const hostContext = await genKeyrackHostContext({
          owner: opts.for ?? null,
        });

        // provide repoManifest and gitroot to hostContext for @this resolution and keyrack.yml writes
        const context = {
          ...hostContext,
          repoManifest: grantContext.repoManifest,
          gitroot,
        };

        // resolve org from manifest (only if not @all)
        let resolvedOrg: string;
        if (opts.org === '@all') {
          resolvedOrg = '@all';
        } else {
          if (!grantContext.repoManifest) {
            // for sudo keys, we don't need keyrack.yml — guide user to use @all
            if (opts.env === 'sudo') {
              console.log('');
              console.log('✋ no keyrack.yml found in this repo');
              console.log(
                "   └─ tip: for sudo credentials without keyrack.yml, use --org @all",
              );
              console.log('');
              process.exit(1);
            }
            console.log('');
            console.log('✋ no keyrack.yml found in this repo');
            console.log(
              "   └─ tip: run 'npx rhachet keyrack init --org <your-org>' to create one",
            );
            console.log('');
            process.exit(1);
          }
          resolvedOrg = assertKeyrackOrgMatchesManifest({
            manifest: grantContext.repoManifest,
            org: opts.org,
          });
        }

        // compute slug for this key
        const slug = `${resolvedOrg}.${opts.env}.${opts.key}`;

        // set host config
        const keyHost = await setKeyrackKeyHost(
          {
            slug,
            mech,
            vault: opts.vault as KeyrackHostVault,
            exid: opts.exid ?? null,
            env: opts.env,
            org: opts.org,
            vaultRecipient: opts.vaultRecipient ?? null,
            maxDuration: opts.maxDuration ?? null,
            value,
          },
          context,
        );

        // output results
        if (opts.json) {
          console.log(JSON.stringify(keyHost, null, 2));
        } else {
          console.log('');
          console.log(
            `🔐 rhachet/keyrack set (org: ${resolvedOrg}, env: ${opts.env})`,
          );
          console.log(`   └─ ${keyHost.slug}`);
          console.log(`      ├─ env: ${keyHost.env}`);
          console.log(`      ├─ org: ${keyHost.org}`);
          console.log(`      ├─ mech: ${keyHost.mech}`);
          console.log(`      └─ vault: ${keyHost.vault}`);
          if (opts.env === 'sudo') {
            console.log('');
            console.log(
              '   note: sudo credentials are stored in encrypted host manifest only.',
            );
            console.log('         they will NOT appear in keyrack.yml.');
          }
          console.log(`done. key configured ✨`);
          console.log('');
        }
      },
    );

  // keyrack unlock [--for owner] [--env env] [--key key] [--duration 9h] [--prikey path]
  keyrack
    .command('unlock')
    .description('unlock keys and send them to daemon for session access')
    .option('--for <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--env <env>', 'target env: prod, prep, test, all, or sudo')
    .option('--key <key>', 'specific key to unlock (required for --env sudo)')
    .option(
      '--duration <duration>',
      'TTL for unlocked keys (default: 30m for sudo, 9h for others)',
    )
    .option(
      '--prikey <path>',
      'explicit ssh private key path (fallback when discovery fails)',
    )
    .option('--passphrase <passphrase>', 'passphrase for encrypted vaults')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        for?: string;
        env?: string;
        key?: string;
        duration?: string;
        prikey?: string;
        passphrase?: string;
        json?: boolean;
      }) => {
        // validate env if provided
        if (opts.env) {
          const validEnvs = ['sudo', 'prod', 'prep', 'test', 'all'];
          if (!validEnvs.includes(opts.env)) {
            throw new BadRequestError(
              `invalid --env: must be one of ${validEnvs.join(', ')}`,
            );
          }
        }

        // sudo env requires --key flag
        if (opts.env === 'sudo' && !opts.key) {
          throw new BadRequestError('sudo credentials require --key flag', {
            note: 'run: rhx keyrack unlock --env sudo --key X',
          });
        }

        // get gitroot for repo manifest
        const gitroot = await getGitRepoRoot({ from: process.cwd() });

        // generate context (use owner from --for flag, prikey for fallback)
        const context = await genKeyrackGrantContext({
          owner: opts.for ?? null,
          gitroot,
          prikey: opts.prikey,
        });

        // unlock keys and send to daemon
        const { unlocked } = await unlockKeyrack(
          {
            owner: opts.for ?? null,
            env: opts.env,
            key: opts.key,
            duration: opts.duration,
            passphrase: opts.passphrase,
          },
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
            console.log(`${indent}├─ env: ${key.env}`);
            console.log(`${indent}├─ org: ${key.org}`);
            console.log(`${indent}├─ vault: ${key.vault}`);
            console.log(`${indent}└─ expires in: ${expiresIn}m`);
          }
          console.log('');
        }
      },
    );

  // keyrack relock [--for owner] [--env env] [--key slug]
  keyrack
    .command('relock')
    .description('purge keys from daemon memory (default: all keys)')
    .option('--for <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--env <env>', 'filter by env (e.g., sudo)')
    .option('--key <slug>', 'relock specific key')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        for?: string;
        env?: string;
        key?: string;
        json?: boolean;
      }) => {
        // relock keys
        const slugs = opts.key ? [opts.key] : undefined;
        const { relocked } = await relockKeyrack({
          owner: opts.for ?? null,
          slugs,
          env: opts.env,
        });

        // sort for deterministic output
        const sorted = [...relocked].sort();

        // output results
        if (opts.json) {
          console.log(JSON.stringify({ relocked: sorted }, null, 2));
        } else {
          console.log('');
          console.log('🔒 rhachet/keyrack relock');
          if (sorted.length === 0) {
            console.log('   └─ (no keys to purge)');
          } else {
            for (let i = 0; i < sorted.length; i++) {
              const slug = sorted[i]!;
              const isLast = i === sorted.length - 1;
              const prefix = isLast ? '   └─' : '   ├─';
              console.log(`${prefix} ${slug}: purged 🔒`);
            }
          }
          console.log(`done. ${sorted.length} keys purged.`);
          console.log('');
        }
      },
    );

  // keyrack status [--for owner]
  keyrack
    .command('status')
    .description('show status of unlocked keys in daemon')
    .option('--for <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--json', 'output as json (robot mode)')
    .action(async (opts: { for?: string; json?: boolean }) => {
      // get status
      const status = await getKeyrackStatus({ owner: opts.for ?? null });

      // output results
      if (opts.json) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log('');
        console.log('🔐 rhachet/keyrack status');
        if (!status) {
          console.log('   └─ daemon: not found');
          console.log('      └─ run `rhx keyrack unlock` to start session');
        } else {
          // show owner
          const ownerLabel = status.owner ?? '(default)';
          console.log(`   ├─ owner: ${ownerLabel}`);

          // show recipients
          if (status.recipients.length > 0) {
            console.log('   ├─ recipients:');
            for (let i = 0; i < status.recipients.length; i++) {
              const recipient = status.recipients[i]!;
              const isLastRecipient = i === status.recipients.length - 1;
              const prefix = isLastRecipient ? '   │  └─' : '   │  ├─';
              console.log(`${prefix} ${recipient.label} (${recipient.mech})`);
            }
          }

          // show daemon status
          if (status.keys.length === 0) {
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
              console.log(`${indent}├─ env: ${key.env}`);
              console.log(`${indent}├─ org: ${key.org}`);
              console.log(`${indent}└─ expires in: ${ttlMinutes}m`);
            }
          }
        }
        console.log('');
      }
    });

  // keyrack list [--for owner]
  keyrack
    .command('list')
    .description('list configured keys on this host')
    .option('--for <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--json', 'output as json (robot mode)')
    .action(async (opts: { for?: string; json?: boolean }) => {
      // generate context (use owner from --for flag)
      const context = await genKeyrackHostContext({ owner: opts.for ?? null });
      const hosts = context.hostManifest.hosts;
      const slugs = Object.keys(hosts).sort();

      // output results
      if (opts.json) {
        console.log(JSON.stringify(hosts, null, 2));
      } else {
        console.log('');
        console.log('🔐 rhachet/keyrack list');
        if (slugs.length === 0) {
          console.log('   └─ (no keys configured on host)');
        } else {
          for (let i = 0; i < slugs.length; i++) {
            const slug = slugs[i]!;
            const host = hosts[slug]!;
            const isLast = i === slugs.length - 1;
            const prefix = isLast ? '   └─' : '   ├─';
            const indent = isLast ? '      ' : '   │  ';
            console.log(`${prefix} ${slug}`);
            console.log(`${indent}├─ env: ${host.env}`);
            console.log(`${indent}├─ org: ${host.org}`);
            console.log(`${indent}├─ mech: ${host.mech}`);
            console.log(`${indent}└─ vault: ${host.vault}`);
          }
        }
      }
    });

  // keyrack init --org $org
  keyrack
    .command('init')
    .description('initialize keyrack manifest for this repo')
    .requiredOption('--org <org>', 'org name for key slugs (e.g., ehmpathy)')
    .option('--json', 'output as json (robot mode)')
    .action(async (opts: { org: string; json?: boolean }) => {
      // get gitroot
      const gitroot = await getGitRepoRoot({ from: process.cwd() });

      // initialize manifest
      const result = await initKeyrackRepoManifest({ gitroot, org: opts.org });

      // output results
      const path = await import('path');
      const relativePath = path.relative(process.cwd(), result.path);

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('');
        console.log('🔐 rhachet/keyrack init');
        if (result.status === 'exists') {
          console.log(`   └─ manifest already exists: ${relativePath}`);
        } else {
          console.log(`   └─ created: ${relativePath}`);
          console.log('');
          console.log('   next steps:');
          console.log(
            '   └─ run `rhx keyrack set --key <KEY_NAME> --env <ENV> --vault <VAULT>` to configure keys',
          );
        }
        console.log('');
      }
    });
};
