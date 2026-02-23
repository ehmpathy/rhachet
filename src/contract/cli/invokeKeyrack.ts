import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';
import { getGitRepoRoot } from 'rhachet-artifact-git';

import { loadManifestHydrated } from '@src/access/daos/daoKeyrackRepoManifest/hydrate/loadManifestHydrated';
import type {
  KeyrackGrantMechanism,
  KeyrackHostVault,
} from '@src/domain.objects/keyrack';
import {
  delKeyrackKey,
  genContextKeyrackGrantGet,
  genContextKeyrackGrantUnlock,
  genKeyrackHostContext,
  getKeyrackKeyGrant,
  setKeyrackKey,
} from '@src/domain.operations/keyrack';
import { assertKeyrackEnvIsSpecified } from '@src/domain.operations/keyrack/assertKeyrackEnvIsSpecified';
import { assertKeyrackOrgMatchesManifest } from '@src/domain.operations/keyrack/assertKeyrackOrgMatchesManifest';
import { getAllKeyrackSlugsForEnv } from '@src/domain.operations/keyrack/getAllKeyrackSlugsForEnv';
import { inferKeyrackVaultFromKey } from '@src/domain.operations/keyrack/inferKeyrackVaultFromKey';
import { initKeyrack } from '@src/domain.operations/keyrack/initKeyrack';
import { delKeyrackRecipient } from '@src/domain.operations/keyrack/recipient/delKeyrackRecipient';
import { getKeyrackRecipients } from '@src/domain.operations/keyrack/recipient/getKeyrackRecipients';
import { setKeyrackRecipient } from '@src/domain.operations/keyrack/recipient/setKeyrackRecipient';
import { getKeyrackStatus } from '@src/domain.operations/keyrack/session/getKeyrackStatus';
import { relockKeyrack } from '@src/domain.operations/keyrack/session/relockKeyrack';
import { unlockKeyrackKeys } from '@src/domain.operations/keyrack/session/unlockKeyrackKeys';
import { inferMechFromVault } from '@src/infra/inferMechFromVault';
import { promptHiddenInput } from '@src/infra/promptHiddenInput';

import { existsSync } from 'node:fs';
import { join } from 'node:path';

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

  // keyrack init [--for owner] [--pubkey path] [--label label] [--org org] [--at path]
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
    .option(
      '--at <path>',
      'custom path for keyrack.yml (for role-level keyracks)',
    )
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        for?: string;
        pubkey?: string;
        label?: string;
        org?: string;
        at?: string;
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
          at: opts.at ?? null,
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
          console.log('🔐 keyrack init');
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
          console.log('🔐 keyrack recipient set');
          console.log(`   └─ added recipient`);
          console.log(`      ├─ label: ${recipientAdded.label}`);
          console.log(`      ├─ mech: ${recipientAdded.mech}`);
          console.log(
            `      └─ pubkey: ${recipientAdded.pubkey.slice(0, 20)}...`,
          );
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
        console.log('🔐 keyrack recipient get');
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
        console.log('🔐 keyrack recipient del');
        console.log(`   └─ removed recipient: ${opts.label}`);
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
    .option(
      '--allow-dangerous',
      'bypass firewall for blocked long-lived tokens',
    )
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        for?: string;
        owner?: string;
        key?: string;
        env?: string;
        org: string;
        allowDangerous?: boolean;
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

        // generate lightweight context (no manifest decryption, no passphrase prompt)
        const context = await genContextKeyrackGrantGet({ gitroot });

        // handle grant
        if (opts.for === 'repo') {
          // resolve slugs from repo manifest
          if (!context.repoManifest) {
            throw new BadRequestError(
              'no keyrack.yml found in repo. --for repo requires keyrack.yml',
            );
          }
          const resolvedEnv = assertKeyrackEnvIsSpecified({
            manifest: context.repoManifest,
            env: opts.env ?? null,
          });
          const slugs = getAllKeyrackSlugsForEnv({
            manifest: context.repoManifest,
            env: resolvedEnv,
          });

          const attempts = await getKeyrackKeyGrant(
            {
              for: { repo: true },
              env: opts.env,
              slugs,
              allowDangerous: opts.allowDangerous,
            },
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
            console.log('🔐 keyrack');
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
                console.log(`${indent}├─ status: blocked 🚫`);
                for (let j = 0; j < attempt.reasons.length; j++) {
                  const reason = attempt.reasons[j]!;
                  const isLastReason = j === attempt.reasons.length - 1;
                  console.log(
                    `${indent}│  ${isLastReason ? '└' : '├'}─ ${reason}`,
                  );
                }
                console.log(
                  `${indent}└─ \x1b[2mtip: --allow-dangerous if you must\x1b[0m`,
                );
              } else if (attempt.status === 'locked') {
                console.log(`${prefix} ${attempt.slug}`);
                console.log(
                  `${indent}${attempt.fix ? '├' : '└'}─ status: locked 🔒`,
                );
                if (attempt.fix) {
                  console.log(`${indent}└─ \x1b[2mtip: ${attempt.fix}\x1b[0m`);
                }
              } else {
                console.log(`${prefix} ${attempt.slug}`);
                console.log(
                  `${indent}${attempt.fix ? '├' : '└'}─ status: absent 🫧`,
                );
                if (attempt.fix) {
                  console.log(`${indent}└─ \x1b[2mtip: ${attempt.fix}\x1b[0m`);
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
            { for: { key: slug }, allowDangerous: opts.allowDangerous },
            context,
          );

          // promote locked → absent for non-sudo keys not in repo manifest (allowlist)
          // envvar passthrough and daemon results are unaffected (they return granted/blocked)
          const attemptResolved: typeof attempt = (() => {
            if (attempt.status !== 'locked') return attempt;
            if (env === 'sudo') return attempt;
            if (!context.repoManifest) return attempt;
            const repoSlugs = getAllKeyrackSlugsForEnv({
              manifest: context.repoManifest,
              env,
            });
            if (repoSlugs.includes(slug)) return attempt;
            const keyName = slug.split('.').slice(2).join('.');
            const vaultHint =
              inferKeyrackVaultFromKey({ keyName }) ?? '<vault>';
            return {
              status: 'absent',
              slug,
              message: `credential '${slug}' not found in repo manifest (keyrack.yml)`,
              fix: `rhx keyrack set --key ${keyName} --env ${env} --vault ${vaultHint}`,
            };
          })();

          // output results
          if (opts.json) {
            console.log(JSON.stringify(attemptResolved, null, 2));
          } else {
            console.log('');
            console.log('🔐 keyrack');
            if (attemptResolved.status === 'granted') {
              console.log(`   └─ ${attemptResolved.grant.slug}`);
              console.log(
                `      ├─ vault: ${attemptResolved.grant.source.vault}`,
              );
              console.log(
                `      ├─ mech: ${attemptResolved.grant.source.mech}`,
              );
              console.log(`      └─ status: granted 🔑`);
            } else if (attemptResolved.status === 'blocked') {
              console.log(`   └─ ${attemptResolved.slug}`);
              console.log(`      ├─ status: blocked 🚫`);
              for (let j = 0; j < attemptResolved.reasons.length; j++) {
                const reason = attemptResolved.reasons[j]!;
                const isLastReason = j === attemptResolved.reasons.length - 1;
                console.log(`      │  ${isLastReason ? '└' : '├'}─ ${reason}`);
              }
              console.log(
                `      └─ \x1b[2mtip: --allow-dangerous if you must\x1b[0m`,
              );
            } else if (attemptResolved.status === 'locked') {
              console.log(`   └─ ${attemptResolved.slug}`);
              console.log(
                `      ${attemptResolved.fix ? '├' : '└'}─ status: locked 🔒`,
              );
              if (attemptResolved.fix) {
                console.log(
                  `      └─ \x1b[2mtip: ${attemptResolved.fix}\x1b[0m`,
                );
              }
            } else {
              console.log(`   └─ ${attemptResolved.slug}`);
              console.log(
                `      ${attemptResolved.fix ? '├' : '└'}─ status: absent 🫧`,
              );
              if (attemptResolved.fix) {
                console.log(
                  `      └─ \x1b[2mtip: ${attemptResolved.fix}\x1b[0m`,
                );
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
    .option('--at <path>', 'custom keyrack.yml path (for role-level keyracks)')
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
        at?: string;
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

        // grab secret from stdin for vaults that require secret input (some vaults fetch it themselves via guided flows)
        let secret: string | null = null;
        const vaultsNeedSecret: KeyrackHostVault[] = ['os.secure', 'os.direct'];
        if (vaultsNeedSecret.includes(opts.vault as KeyrackHostVault)) {
          secret = await promptHiddenInput({
            prompt: `enter secret for ${opts.key}: `,
          });
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
        const getContext = await genContextKeyrackGrantGet({ gitroot });
        const hostContext = await genKeyrackHostContext({
          owner: opts.for ?? null,
        });

        // provide repoManifest and gitroot to hostContext for @this resolution and keyrack.yml writes
        const context = {
          ...hostContext,
          repoManifest: getContext.repoManifest,
          gitroot,
        };

        // load manifest: from --at path if provided, otherwise use default repo manifest
        const repoManifest = (() => {
          if (opts.at) {
            const customPath = opts.at.startsWith('/')
              ? opts.at
              : join(gitroot, opts.at);
            if (!existsSync(customPath)) {
              console.log('');
              console.log(`✋ keyrack not found at: ${opts.at}`);
              console.log(
                "   └─ tip: run 'npx rhachet keyrack init --at <path>' first",
              );
              console.log('');
              process.exit(1);
            }
            return loadManifestHydrated({ path: customPath }, { gitroot });
          }
          return getContext.repoManifest;
        })();

        // expand org from manifest (only if not @all)
        let resolvedOrg: string;
        if (opts.org === '@all') {
          resolvedOrg = '@all';
        } else if (repoManifest) {
          resolvedOrg = assertKeyrackOrgMatchesManifest({
            manifest: repoManifest,
            org: opts.org,
          });
        } else {
          // no manifest available
          if (opts.env === 'sudo') {
            console.log('');
            console.log('✋ no keyrack.yml found');
            console.log(
              '   └─ tip: for sudo credentials without keyrack.yml, use --org @all',
            );
            console.log('');
            process.exit(1);
          }
          console.log('');
          console.log('✋ no keyrack.yml found');
          console.log(
            "   └─ tip: run 'npx rhachet keyrack init --org <your-org>' to create one",
          );
          console.log('');
          process.exit(1);
        }

        // delegate to domain operation
        const { results } = await setKeyrackKey(
          {
            key: opts.key,
            env: opts.env,
            org: resolvedOrg,
            vault: opts.vault as KeyrackHostVault,
            mech,
            secret,
            exid: opts.exid ?? null,
            vaultRecipient: opts.vaultRecipient ?? null,
            maxDuration: opts.maxDuration ?? null,
            repoManifest: repoManifest ?? undefined,
            at: opts.at ?? null,
          },
          context,
        );

        // output results
        if (opts.json) {
          console.log(
            JSON.stringify(
              results.length === 1 ? results[0] : results,
              null,
              2,
            ),
          );
        } else {
          console.log('');
          console.log(`🔐 keyrack set (org: ${resolvedOrg}, env: ${opts.env})`);
          for (const result of results) {
            console.log(`   └─ ${result.slug}`);
            console.log(`      ├─ mech: ${result.mech}`);
            console.log(`      └─ vault: ${result.vault}`);
          }
          if (opts.env === 'sudo') {
            console.log('');
            console.log(
              '   note: sudo credentials are stored in encrypted host manifest only.',
            );
            console.log('         they will NOT appear in keyrack.yml.');
          }
          console.log('');
        }
      },
    );

  // keyrack del --key <key> [--env env] [--for owner] [--json]
  keyrack
    .command('del')
    .description('remove a credential key from this host')
    .requiredOption('--key <keyname>', 'key name to remove (e.g., AWS_PROFILE)')
    .option(
      '--env <env>',
      'target env: prod, prep, test, all, or sudo (default: all)',
      'all',
    )
    .option('--for <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option(
      '--org <org>',
      'target org: @this or @all (default: @this)',
      '@this',
    )
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        key: string;
        env: string;
        for?: string;
        org: string;
        json?: boolean;
      }) => {
        // validate env
        const validEnvs = ['sudo', 'prod', 'prep', 'test', 'all'];
        if (!validEnvs.includes(opts.env)) {
          throw new BadRequestError(
            `invalid --env: must be one of ${validEnvs.join(', ')}`,
          );
        }

        // blank line before passphrase prompt (matches `set` output cadence)
        console.log('');

        // get gitroot to derive org from manifest
        const gitroot = await getGitRepoRoot({ from: process.cwd() });
        const getContext = await genContextKeyrackGrantGet({ gitroot });
        const hostContext = await genKeyrackHostContext({
          owner: opts.for ?? null,
        });

        // provide repoManifest and gitroot to hostContext for keyrack.yml writes
        const context = {
          ...hostContext,
          repoManifest: getContext.repoManifest,
          gitroot,
        };

        // derive org from manifest
        let derivedOrg: string;
        if (opts.org === '@all') {
          derivedOrg = '@all';
        } else {
          if (!getContext.repoManifest) {
            if (opts.env === 'sudo') {
              // for sudo keys, try to find org from host manifest keys
              const hostSlugs = Object.keys(context.hostManifest.hosts);
              const matchedSlug = hostSlugs.find((s) => {
                const parts = s.split('.');
                return (
                  parts[1] === opts.env && parts.slice(2).join('.') === opts.key
                );
              });
              if (matchedSlug) {
                derivedOrg = matchedSlug.split('.')[0] ?? '@all';
              } else {
                console.log('');
                console.log(
                  `✋ key '${opts.key}' not found in host manifest for env '${opts.env}'`,
                );
                console.log('');
                process.exit(1);
              }
            } else {
              console.log('');
              console.log('✋ no keyrack.yml found in this repo');
              console.log(
                "   └─ tip: run 'npx rhachet keyrack init --org <your-org>' to create one",
              );
              console.log('');
              process.exit(1);
            }
          } else {
            derivedOrg = assertKeyrackOrgMatchesManifest({
              manifest: getContext.repoManifest,
              org: opts.org,
            });
          }
        }

        // construct slug
        const slug = `${derivedOrg}.${opts.env}.${opts.key}`;

        // delegate to domain operation
        const result = await delKeyrackKey({ slug }, context);

        // output results
        if (opts.json) {
          console.log(JSON.stringify({ slug, effect: result.effect }, null, 2));
        } else {
          console.log('');
          if (result.effect === 'deleted') {
            console.log(`🗑️  keyrack del`);
            console.log(`   └─ ${slug} removed`);
          } else {
            console.log(`🗑️  keyrack del`);
            console.log(`   └─ ${slug} not found (already absent)`);
          }
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

        // blank line before passphrase prompt (matches `set` output cadence)
        console.log('');

        // generate full context (decrypts host manifest — may prompt for passphrase)
        const context = await genContextKeyrackGrantUnlock({
          owner: opts.for ?? null,
          gitroot,
          prikey: opts.prikey,
        });

        // unlock keys and send to daemon
        const { unlocked } = await unlockKeyrackKeys(
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
          console.log('🔓 keyrack unlock');
          for (let i = 0; i < unlocked.length; i++) {
            const key = unlocked[i]!;
            const isLast = i === unlocked.length - 1;
            const prefix = isLast ? '   └─' : '   ├─';
            const indent = isLast ? '      ' : '   │  ';
            const expiresIn = key.expiresAt
              ? Math.round(
                  (new Date(key.expiresAt).getTime() - Date.now()) / 1000 / 60,
                )
              : null;
            console.log(`${prefix} ${key.slug}`);
            console.log(`${indent}├─ env: ${key.env}`);
            console.log(`${indent}├─ org: ${key.org}`);
            console.log(`${indent}├─ vault: ${key.source.vault}`);
            console.log(
              `${indent}└─ expires in: ${expiresIn !== null ? `${expiresIn}m` : 'never'}`,
            );
          }
          console.log('');
        }
      },
    );

  // keyrack relock [--for owner] [--env env] [--key slug]
  keyrack
    .command('relock')
    .description('prune keys from daemon memory (default: all keys)')
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
          console.log('🔒 keyrack relock');
          if (sorted.length === 0) {
            console.log('   └─ (no keys to prune)');
          } else {
            for (let i = 0; i < sorted.length; i++) {
              const slug = sorted[i]!;
              const isLast = i === sorted.length - 1;
              const prefix = isLast ? '   └─' : '   ├─';
              console.log(`${prefix} ${slug}: pruned 🔒`);
            }
          }
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
        console.log('🔐 keyrack status');
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
        console.log('🔐 keyrack list');
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
};
