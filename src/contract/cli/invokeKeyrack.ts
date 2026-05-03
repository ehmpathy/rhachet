import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';
import { getGitRepoRoot } from 'rhachet-artifact-git';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import { loadManifestHydrated } from '@src/access/daos/daoKeyrackRepoManifest/hydrate/loadManifestHydrated';
import type {
  KeyrackGrantMechanism,
  KeyrackHostVault,
} from '@src/domain.objects/keyrack';
import {
  delKeyrackKey,
  genContextKeyrack,
  genContextKeyrackGrantGet,
  getAllKeyrackGrantsByRepo,
  getOneKeyrackGrantByKey,
  setKeyrackKey,
} from '@src/domain.operations/keyrack';
import {
  asAttemptsByStatus,
  asNotGrantedAttempts,
  isAllAttemptsGranted,
} from '@src/domain.operations/keyrack/asAttemptsByStatus';
import { asKeyrackFirewallSource } from '@src/domain.operations/keyrack/asKeyrackFirewallSource';
import { asKeyrackKeyName } from '@src/domain.operations/keyrack/asKeyrackKeyName';
import { asKeyrackSlugParts } from '@src/domain.operations/keyrack/asKeyrackSlugParts';
import { asResolvedAttempt } from '@src/domain.operations/keyrack/asResolvedAttempt';
import { asResolvedEnvForSet } from '@src/domain.operations/keyrack/asResolvedEnvForSet';
import { asSortedHostSlugs } from '@src/domain.operations/keyrack/asSortedHostSlugs';
import { assertKeyrackOrgMatchesManifest } from '@src/domain.operations/keyrack/assertKeyrackOrgMatchesManifest';
import { asKeyrackListTreestruct } from '@src/domain.operations/keyrack/cli/asKeyrackListTreestruct';
import { asShellEscapedSecret } from '@src/domain.operations/keyrack/cli/asShellEscapedSecret';
import { emitKeyrackKeyBranch } from '@src/domain.operations/keyrack/cli/emitKeyrackKeyBranch';
import {
  formatKeyrackGetAllOutput,
  formatKeyrackGetOneOutput,
} from '@src/domain.operations/keyrack/cli/formatKeyrackGetOneOutput';
import {
  isValidKeyrackEnv,
  KEYRACK_VALID_ENVS,
} from '@src/domain.operations/keyrack/constants';
import { pruneKeyrackDaemon } from '@src/domain.operations/keyrack/daemon/sdk';
import { fillKeyrackKeys } from '@src/domain.operations/keyrack/fillKeyrackKeys';
import { findSlugByEnvAndKeyName } from '@src/domain.operations/keyrack/findSlugByEnvAndKeyName';
import { getAllKeyrackSlugsForEnv } from '@src/domain.operations/keyrack/getAllKeyrackSlugsForEnv';
import { getKeyrackFirewallOutput } from '@src/domain.operations/keyrack/getKeyrackFirewallOutput';
import { getKeyrackKeyGrant } from '@src/domain.operations/keyrack/getKeyrackKeyGrant';
import { initKeyrack } from '@src/domain.operations/keyrack/initKeyrack';
import { isKeyrackSlugFormat } from '@src/domain.operations/keyrack/isKeyrackSlugFormat';
import { delKeyrackRecipient } from '@src/domain.operations/keyrack/recipient/delKeyrackRecipient';
import { getKeyrackRecipients } from '@src/domain.operations/keyrack/recipient/getKeyrackRecipients';
import { setKeyrackRecipient } from '@src/domain.operations/keyrack/recipient/setKeyrackRecipient';
import { getKeyrackStatus } from '@src/domain.operations/keyrack/session/getKeyrackStatus';
import { relockKeyrack } from '@src/domain.operations/keyrack/session/relockKeyrack';
import { unlockKeyrackKeys } from '@src/domain.operations/keyrack/session/unlockKeyrackKeys';

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

  // keyrack init [--owner owner] [--pubkey path] [--label label] [--org org] [--at path]
  keyrack
    .command('init')
    .description('initialize keyrack with a recipient key')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option('--pubkey <path>', 'path to private key or .pub file')
    .option(
      '--prikey <path>',
      'ssh private key path (derives pubkey automatically)',
    )
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
        owner?: string;
        for?: string;
        pubkey?: string;
        prikey?: string;
        label?: string;
        org?: string;
        at?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = opts.owner ?? opts.for ?? null;
        // get gitroot to check for repo manifest
        // note: null is valid when not in a git repo; other errors propagate
        const gitroot = await getGitRepoRoot({ from: process.cwd() }).catch(
          (error) => {
            // allow "not a git repo" case - return null
            if (error instanceof Error && error.message.includes('not a git'))
              return null;
            // propagate other errors (permissions, git not installed, etc)
            throw error;
          },
        );

        // --prikey takes precedence over --pubkey (both accept private key paths)
        const keyPath = opts.prikey ?? opts.pubkey;

        const result = await initKeyrack({
          owner,
          pubkey: keyPath,
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

  // keyrack recipient set --pubkey <pubkey> --label <label> [--owner owner] [--stanza ssh] [--prikey path]
  recipient
    .command('set')
    .description('add a recipient to the host manifest')
    .requiredOption('--pubkey <pubkey>', 'age pubkey (age1...) or ssh pubkey')
    .requiredOption('--label <label>', 'label for this recipient')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option(
      '--stanza <format>',
      'force stanza format: ssh (for ssh-keygen -p prevention flow)',
    )
    .option('--prikey <path>', 'ssh private key for manifest decryption')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        pubkey: string;
        label: string;
        owner?: string;
        for?: string;
        stanza?: string;
        prikey?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = opts.owner ?? opts.for ?? null;

        // validate --stanza if provided
        if (opts.stanza && opts.stanza !== 'ssh')
          throw new BadRequestError('--stanza must be "ssh" if specified');

        const recipientAdded = await setKeyrackRecipient({
          owner,
          pubkey: opts.pubkey,
          label: opts.label,
          stanza: (opts.stanza as 'ssh' | undefined) ?? null,
          prikeys: opts.prikey ? [opts.prikey] : undefined,
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

  // keyrack recipient get [--owner owner] [--prikey path]
  recipient
    .command('get')
    .description('list recipients from the host manifest')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option('--prikey <path>', 'ssh private key for manifest decryption')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        owner?: string;
        for?: string;
        prikey?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = opts.owner ?? opts.for ?? null;

        const recipients = await getKeyrackRecipients({
          owner,
          prikeys: opts.prikey ? [opts.prikey] : undefined,
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
      },
    );

  // keyrack recipient del --label <label> [--owner owner] [--prikey path]
  recipient
    .command('del')
    .description('remove a recipient from the host manifest')
    .requiredOption('--label <label>', 'label of recipient to remove')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option('--prikey <path>', 'ssh private key for manifest decryption')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        label: string;
        owner?: string;
        for?: string;
        prikey?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = opts.owner ?? opts.for ?? null;

        await delKeyrackRecipient({
          owner,
          label: opts.label,
          prikeys: opts.prikey ? [opts.prikey] : undefined,
        });

        if (opts.json) {
          console.log(JSON.stringify({ deleted: opts.label }, null, 2));
        } else {
          console.log('');
          console.log('🔐 keyrack recipient del');
          console.log(`   └─ removed recipient: ${opts.label}`);
          console.log('');
        }
      },
    );

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
    .option(
      '--output <mode>',
      'output mode: value (raw secret), json, vibes (default)',
    )
    .option('--value', 'shorthand for --output value')
    .action(
      async (opts: {
        for?: string;
        owner?: string;
        key?: string;
        env?: string;
        org: string;
        allowDangerous?: boolean;
        json?: boolean;
        output?: 'value' | 'json' | 'vibes';
        value?: boolean;
      }) => {
        // derive output mode: --value and --json are shorthands
        const outputMode: 'value' | 'json' | 'vibes' = opts.value
          ? 'value'
          : (opts.output ?? (opts.json ? 'json' : 'vibes'));

        // validate: --value requires --key
        if (outputMode === 'value' && !opts.key) {
          throw new BadRequestError('--value requires --key (single key only)');
        }

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
        const context = await genContextKeyrackGrantGet({
          gitroot,
          owner: opts.owner ?? null,
        });

        // handle grant
        if (opts.for === 'repo') {
          const attempts = await getAllKeyrackGrantsByRepo(
            {
              env: opts.env ?? null,
              allow: { dangerous: opts.allowDangerous },
            },
            context,
          );

          // output results based on mode
          // .note = 'value' mode already rejected via validation above
          if (outputMode === 'json') {
            console.log(JSON.stringify(attempts, null, 2));
          } else {
            console.log(formatKeyrackGetAllOutput({ attempts }));
          }

          // exit 2 if any key was not granted (blocked by constraints)
          if (!isAllAttemptsGranted({ attempts })) {
            process.exit(2);
          }
        } else if (opts.key) {
          // grant key via domain operation
          // .note = org parameter passed through to enable:
          //   - @all bypass for sudo access
          //   - org mismatch fail-fast (security enforcement)
          //   - slug construction without manifest
          // .note = @this means "use manifest org" — pass undefined to let domain op handle
          const orgForDomainOp =
            opts.org === '@this' ? undefined : (opts.org ?? undefined);
          const attempt = await getOneKeyrackGrantByKey(
            {
              key: opts.key,
              env: opts.env ?? null,
              org: orgForDomainOp,
              allow: { dangerous: opts.allowDangerous },
            },
            context,
          );

          // extract env and slug from attempt for downstream logic
          const slug =
            attempt.status === 'granted'
              ? attempt.grant.slug
              : (attempt as { slug: string }).slug;
          const slugParts = asKeyrackSlugParts({ slug });
          const env = slugParts.env || opts.env || 'all';

          // promote locked/absent → absent for non-sudo keys not in repo manifest (allowlist)
          const attemptResolved = asResolvedAttempt({
            attempt,
            slug,
            keyName: slugParts.keyName,
            env,
            repoManifest: context.repoManifest,
          });

          // output results based on mode
          switch (outputMode) {
            case 'value': {
              // for value mode: exit 2 with vibes on stderr if not granted
              if (attemptResolved.status !== 'granted') {
                console.error(
                  formatKeyrackGetOneOutput({ attempt: attemptResolved }),
                );
                process.exit(2);
              }
              // output raw secret with no final newline
              process.stdout.write(attemptResolved.grant.key.secret);
              break;
            }
            case 'json': {
              console.log(JSON.stringify(attemptResolved, null, 2));
              // exit 2 if not granted
              if (attemptResolved.status !== 'granted') {
                process.exit(2);
              }
              break;
            }
            case 'vibes':
            default: {
              console.log(
                formatKeyrackGetOneOutput({ attempt: attemptResolved }),
              );
              // exit 2 if not granted
              if (attemptResolved.status !== 'granted') {
                process.exit(2);
              }
              break;
            }
          }
        }
      },
    );

  // keyrack source --env <env> --owner <owner> [--key <key>] [--strict|--lenient]
  keyrack
    .command('source')
    .description('output export statements for shell eval')
    .option('--key <keyname>', 'single key to source (omit for all repo keys)')
    .requiredOption('--env <env>', 'target env: prod, prep, test, all')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option('--strict', 'fail if any key not granted (default)')
    .option('--lenient', 'skip absent keys silently')
    .action(
      async (opts: {
        key?: string;
        env: string;
        owner?: string;
        for?: string;
        strict?: boolean;
        lenient?: boolean;
      }) => {
        // --owner takes precedence; --for is alias (null = default owner)
        const owner = opts.owner ?? opts.for ?? null;

        // validate: --strict and --lenient are mutually exclusive
        if (opts.strict && opts.lenient) {
          throw new BadRequestError(
            '--strict and --lenient are mutually exclusive',
          );
        }

        // default to strict mode
        const isLenient = opts.lenient ?? false;

        // get gitroot for repo manifest
        const gitroot = await getGitRepoRoot({ from: process.cwd() });

        // generate lightweight context (no manifest decryption, no passphrase prompt)
        const context = await genContextKeyrackGrantGet({
          gitroot,
          owner,
        });

        // get keys
        const attempts = opts.key
          ? [
              await getOneKeyrackGrantByKey(
                { key: opts.key, env: opts.env, org: undefined, allow: {} },
                context,
              ),
            ]
          : await getAllKeyrackGrantsByRepo(
              { env: opts.env, allow: {} },
              context,
            );

        // filter to granted keys
        const granted = asAttemptsByStatus({ attempts, status: 'granted' });
        const notGranted = asNotGrantedAttempts({ attempts });

        // strict mode: fail if any not granted
        if (!isLenient && notGranted.length > 0) {
          // no stdout (prevent partial eval)
          // emit status to stderr
          for (const a of notGranted) {
            const slug = 'slug' in a ? a.slug : 'unknown';
            console.error(`not granted: ${slug} (${a.status})`);
          }
          console.error('');
          console.error(
            'hint: use --lenient if partial results are acceptable',
          );
          process.exit(2);
        }

        // emit export statements for granted keys
        for (const attempt of granted) {
          if (attempt.status !== 'granted') continue;
          const keyName = asKeyrackKeyName({ slug: attempt.grant.slug });
          const escaped = asShellEscapedSecret({
            secret: attempt.grant.key.secret,
          });
          console.log(`export ${keyName}=${escaped}`);
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
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option(
      '--env <env>',
      'target env: prod, prep, test, all, or sudo (inferred from manifest if unambiguous)',
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
    .option('--prikey <path>', 'ssh private key for manifest decryption')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        key: string;
        mech?: string;
        vault: string;
        owner?: string;
        for?: string;
        env?: string;
        org: string;
        exid?: string;
        vaultRecipient?: string;
        maxDuration?: string;
        at?: string;
        prikey?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = opts.owner ?? opts.for ?? null;
        // validate vault first (needed for mech inference)
        const validVaults: KeyrackHostVault[] = [
          'os.direct',
          'os.secure',
          'os.daemon',
          'os.envvar',
          '1password',
          'aws.config',
          'github.secrets',
        ];
        if (!validVaults.includes(opts.vault as KeyrackHostVault)) {
          throw new BadRequestError(
            `invalid --vault: must be one of ${validVaults.join(', ')}`,
          );
        }

        // validate mech if provided; otherwise let vault adapter handle inference
        const mech: KeyrackGrantMechanism | null = (() => {
          if (!opts.mech) return null; // vault adapter will infer

          // validate explicit mechanism
          const validMechs: KeyrackGrantMechanism[] = [
            'PERMANENT_VIA_REPLICA',
            'PERMANENT_VIA_REFERENCE',
            'EPHEMERAL_VIA_SESSION',
            'EPHEMERAL_VIA_GITHUB_APP',
            'EPHEMERAL_VIA_AWS_SSO',
            'EPHEMERAL_VIA_GITHUB_OIDC',
          ];
          if (!validMechs.includes(opts.mech as KeyrackGrantMechanism)) {
            throw new BadRequestError(
              `invalid --mech: must be one of ${validMechs.join(', ')}`,
            );
          }
          return opts.mech as KeyrackGrantMechanism;
        })();

        // get gitroot to derive org from manifest
        const gitroot = await getGitRepoRoot({ from: process.cwd() });
        const repoManifestFound = await daoKeyrackRepoManifest.get({ gitroot });

        // create context with lazy identity discovery
        const context = genContextKeyrack({
          owner,
          prikeys: opts.prikey ? [opts.prikey] : undefined,
          repoManifest: repoManifestFound ?? null,
          gitroot,
        });

        // load host manifest (triggers identity discovery)
        const hostResult = await daoKeyrackHostManifest.get({ owner }, context);
        if (!hostResult) {
          const initTip = owner
            ? `run: rhx keyrack init --owner ${owner}`
            : 'run: rhx keyrack init';
          throw new BadRequestError(`host manifest not found. ${initTip}`, {
            owner,
          });
        }

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
              process.exit(2);
            }
            return loadManifestHydrated({ path: customPath }, { gitroot });
          }
          return context.repoManifest ?? null;
        })();

        // infer or validate env
        const resolvedEnv = asResolvedEnvForSet({
          env: opts.env,
          key: opts.key,
          manifest: repoManifest,
        });

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
          if (resolvedEnv === 'sudo') {
            console.log('');
            console.log('✋ no keyrack.yml found');
            console.log(
              '   └─ tip: for sudo credentials without keyrack.yml, use --org @all',
            );
            console.log('');
            process.exit(2);
          }
          console.log('');
          console.log('✋ no keyrack.yml found');
          console.log(
            "   └─ tip: run 'npx rhachet keyrack init --org <your-org>' to create one",
          );
          console.log('');
          process.exit(2);
        }

        // delegate to domain operation
        // note: vault adapters prompt for their own secrets via stdin (per rule.require.vault-fetches-own-secrets)
        const { results } = await setKeyrackKey(
          {
            key: opts.key,
            env: resolvedEnv,
            org: resolvedOrg,
            vault: opts.vault as KeyrackHostVault,
            mech,
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
          // note: vault adapter already prints a blank line for visual separation
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

  // keyrack del --key <key> [--env env] [--owner owner] [--prikey path] [--json]
  keyrack
    .command('del')
    .description('remove a credential key from this host')
    .requiredOption('--key <keyname>', 'key name to remove (e.g., AWS_PROFILE)')
    .option(
      '--env <env>',
      'target env: prod, prep, test, all, or sudo (default: all)',
      'all',
    )
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option(
      '--org <org>',
      'target org: @this or @all (default: @this)',
      '@this',
    )
    .option('--prikey <path>', 'ssh private key for manifest decryption')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        key: string;
        env: string;
        owner?: string;
        for?: string;
        org: string;
        prikey?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = opts.owner ?? opts.for ?? null;

        // validate env
        if (!isValidKeyrackEnv(opts.env)) {
          throw new BadRequestError(
            `invalid --env: must be one of ${KEYRACK_VALID_ENVS.join(', ')}`,
          );
        }

        // blank line before passphrase prompt (matches `set` output cadence)
        console.log('');

        // get gitroot and repoManifest
        const gitroot = await getGitRepoRoot({ from: process.cwd() });
        const repoManifest = await daoKeyrackRepoManifest.get({ gitroot });

        // generate context and load host manifest
        const context = genContextKeyrack({
          owner,
          prikeys: opts.prikey ? [opts.prikey] : undefined,
          repoManifest: repoManifest ?? null,
          gitroot,
        });
        await daoKeyrackHostManifest.get({ owner }, context);

        // derive org from manifest
        let derivedOrg: string;
        if (opts.org === '@all') {
          derivedOrg = '@all';
        } else {
          if (!repoManifest) {
            if (opts.env === 'sudo') {
              // for sudo keys, try to find org from host manifest keys
              const hostManifest = context.hostManifest;
              if (!hostManifest) {
                console.log('');
                console.log('✋ no host manifest found');
                console.log('');
                process.exit(2);
              }
              const hostSlugs = Object.keys(hostManifest.hosts);
              const matchedSlug = findSlugByEnvAndKeyName({
                slugs: hostSlugs,
                env: opts.env,
                keyName: opts.key,
              });
              if (matchedSlug) {
                derivedOrg =
                  asKeyrackSlugParts({ slug: matchedSlug }).org || '@all';
              } else {
                console.log('');
                console.log(
                  `✋ key '${opts.key}' not found in host manifest for env '${opts.env}'`,
                );
                console.log('');
                process.exit(2);
              }
            } else {
              console.log('');
              console.log('✋ no keyrack.yml found in this repo');
              console.log(
                "   └─ tip: run 'npx rhachet keyrack init --org <your-org>' to create one",
              );
              console.log('');
              process.exit(2);
            }
          } else {
            derivedOrg = assertKeyrackOrgMatchesManifest({
              manifest: repoManifest,
              org: opts.org,
            });
          }
        }

        // detect if key is already a full slug (org.env.key format)
        const isFullSlug = isKeyrackSlugFormat({ value: opts.key });

        // construct or use slug
        let slug: string;
        let effectiveEnv: string;
        if (isFullSlug) {
          slug = opts.key;
          const keySlugParts = asKeyrackSlugParts({ slug: opts.key });
          effectiveEnv = keySlugParts.env || opts.env;
          const slugOrg = keySlugParts.org;

          // validate org matches manifest
          if (derivedOrg !== '@all' && slugOrg !== derivedOrg) {
            throw new BadRequestError(
              `slug org '${slugOrg}' does not match manifest org '${derivedOrg}'`,
            );
          }

          // validate env matches if explicitly provided and differs
          if (opts.env !== 'all' && effectiveEnv !== opts.env) {
            throw new BadRequestError(
              `--env ${opts.env} conflicts with env in slug ${opts.key}`,
            );
          }
        } else {
          slug = `${derivedOrg}.${opts.env}.${opts.key}`;
          effectiveEnv = opts.env;
        }

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

  // keyrack unlock [--owner owner] [--env env] [--key key] [--duration 9h] [--prikey path]
  keyrack
    .command('unlock')
    .description('unlock keys and send them to daemon for session access')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
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
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        owner?: string;
        for?: string;
        env?: string;
        key?: string;
        duration?: string;
        prikey?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = opts.owner ?? opts.for ?? null;

        // validate env if provided
        if (opts.env) {
          if (!isValidKeyrackEnv(opts.env)) {
            throw new BadRequestError(
              `invalid --env: must be one of ${KEYRACK_VALID_ENVS.join(', ')}`,
            );
          }
        }

        // sudo env requires --key flag
        if (opts.env === 'sudo' && !opts.key) {
          throw new BadRequestError('sudo credentials require --key flag', {
            note: 'run: rhx keyrack unlock --env sudo --key X',
          });
        }

        // get gitroot and repoManifest
        const gitroot = await getGitRepoRoot({ from: process.cwd() });
        const repoManifest = await daoKeyrackRepoManifest.get({ gitroot });

        // blank line before passphrase prompt (matches `set` output cadence)
        console.log('');

        // generate context and load host manifest (decrypts — may prompt for passphrase)
        const context = genContextKeyrack({
          owner,
          prikeys: opts.prikey ? [opts.prikey] : undefined,
          repoManifest: repoManifest ?? null,
          gitroot,
        });
        await daoKeyrackHostManifest.get({ owner }, context);

        // unlock keys and send to daemon
        const { unlocked, omitted } = await unlockKeyrackKeys(
          {
            owner,
            env: opts.env,
            key: opts.key,
            duration: opts.duration,
          },
          context,
        );

        // output results
        if (opts.json) {
          console.log(JSON.stringify({ unlocked, omitted }, null, 2));
        } else {
          console.log('🔓 keyrack unlock');

          // combine all entries for tree output
          const allEntries = [
            ...unlocked.map((k) => ({ type: 'unlocked' as const, key: k })),
            ...omitted.map((o) => ({ type: 'omitted' as const, ...o })),
          ];

          for (let i = 0; i < allEntries.length; i++) {
            const entry = allEntries[i]!;
            const isLast = i === allEntries.length - 1;

            if (entry.type === 'unlocked') {
              emitKeyrackKeyBranch({
                entry: { type: 'unlocked', grant: entry.key },
                isLast,
              });
            } else {
              // omitted key — show absent or removed based on reason
              const slug = entry.slug;
              const { env: slugEnv, keyName } = asKeyrackSlugParts({ slug });
              emitKeyrackKeyBranch({
                entry: {
                  type: entry.reason, // 'absent' or 'removed'
                  slug,
                  tip: `rhx keyrack set --key ${keyName} --env ${slugEnv}`,
                },
                isLast,
              });
            }
          }
          console.log('');
        }
      },
    );

  // keyrack relock [--owner owner] [--env env] [--key slug]
  keyrack
    .command('relock')
    .description('prune keys from daemon memory (default: all keys)')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option('--env <env>', 'filter by env (e.g., sudo)')
    .option('--key <slug>', 'relock specific key')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        owner?: string;
        for?: string;
        env?: string;
        key?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = opts.owner ?? opts.for ?? null;

        // relock keys
        const slugs = opts.key ? [opts.key] : undefined;
        const { relocked } = await relockKeyrack({
          owner,
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

  // keyrack status [--owner owner] [--env env]
  keyrack
    .command('status')
    .description('show status of unlocked keys in daemon')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option('--env <env>', 'filter by env: prod, prep, test, all, or sudo')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        owner?: string;
        for?: string;
        env?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = opts.owner ?? opts.for ?? null;

        // validate env if provided
        if (opts.env && !isValidKeyrackEnv(opts.env)) {
          throw new BadRequestError(
            `invalid --env: must be one of ${KEYRACK_VALID_ENVS.join(', ')}`,
          );
        }

        // get status
        const status = await getKeyrackStatus({ owner });

        // filter keys by env if specified
        const filteredKeys = opts.env
          ? (status?.keys ?? []).filter((k) => k.env === opts.env)
          : (status?.keys ?? []);

        // compute hint for when no keys in filtered env
        const getEnvHint = (): string | null => {
          if (!opts.env) return null;
          if (!status || status.keys.length === 0) return null;
          // find other envs that have keys (exclude sudo from hints)
          const otherEnvs = [...new Set(status.keys.map((k) => k.env))].filter(
            (e) => e !== opts.env && e !== 'sudo',
          );
          if (otherEnvs.length === 0) return null;
          return `try --env ${otherEnvs.join(' or --env ')}`;
        };

        // output results
        if (opts.json) {
          const output = status ? { ...status, keys: filteredKeys } : status;
          console.log(JSON.stringify(output, null, 2));
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
            if (filteredKeys.length === 0) {
              console.log('   └─ daemon: active ✨');
              const envHint = getEnvHint();
              if (opts.env && envHint) {
                console.log(
                  `      └─ (no keys in --env ${opts.env}, ${envHint})`,
                );
              } else if (opts.env) {
                console.log(`      └─ (no keys in --env ${opts.env})`);
              } else {
                console.log('      └─ (no keys unlocked)');
              }
            } else {
              console.log('   ├─ daemon: active ✨');
              for (let i = 0; i < filteredKeys.length; i++) {
                const key = filteredKeys[i]!;
                const isLast = i === filteredKeys.length - 1;
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
      },
    );

  // keyrack list [--owner owner]
  keyrack
    .command('list')
    .description('list configured keys on this host')
    .option('--owner <owner>', 'owner identity (e.g., mechanic, foreman)')
    .option('--for <owner>', 'alias for --owner')
    .option('--prikey <path>', 'ssh private key for manifest decryption')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        owner?: string;
        for?: string;
        prikey?: string;
        json?: boolean;
      }) => {
        // --owner takes precedence; --for is alias
        const owner = opts.owner ?? opts.for ?? null;

        // generate context and load host manifest
        const context = genContextKeyrack({
          owner,
          prikeys: opts.prikey ? [opts.prikey] : undefined,
        });
        await daoKeyrackHostManifest.get({ owner }, context);

        // guard for absent host manifest
        if (!context.hostManifest) {
          console.log('');
          console.log('✋ no host manifest found');
          console.log('');
          process.exit(2);
        }
        const hosts = context.hostManifest.hosts;
        const slugs = asSortedHostSlugs({ hosts });

        // output results
        if (opts.json) {
          console.log(JSON.stringify(hosts, null, 2));
        } else {
          const lines = asKeyrackListTreestruct({ hosts });
          for (const line of lines) {
            console.log(line);
          }
        }
      },
    );

  // keyrack fill --env <env> [--owner owner...] [--prikey path...] [--key key] [--refresh]
  keyrack
    .command('fill')
    .description('fill keyrack keys from repo manifest')
    .requiredOption('--env <env>', 'environment to fill (test, prod, all)')
    .option('--owner <owner...>', 'owner(s) to fill (default: default)', [
      'default',
    ])
    .option(
      '--prikey <path...>',
      'prikey(s) to consider for manifest decryption',
    )
    .option('--key <key>', 'specific key to fill (default: all)')
    .option('--refresh', 'refresh even if already set')
    .option(
      '--repair',
      'overwrite blocked keys (e.g., rotate dangerous tokens)',
    )
    .option(
      '--allow-dangerous',
      'allow blocked keys through (e.g., accept dangerous tokens as-is)',
    )
    .action(
      async (opts: {
        env: string;
        owner: string[];
        prikey?: string[];
        key?: string;
        refresh?: boolean;
        repair?: boolean;
        allowDangerous?: boolean;
      }) => {
        // get gitroot for repo manifest
        const gitroot = await getGitRepoRoot({ from: process.cwd() });

        // fill keyrack keys
        await fillKeyrackKeys(
          {
            env: opts.env,
            owners: opts.owner,
            prikeys: opts.prikey ?? [],
            key: opts.key ?? null,
            refresh: opts.refresh ?? false,
            repair: opts.repair ?? false,
            allowDangerous: opts.allowDangerous ?? false,
          },
          { gitroot },
        );
      },
    );

  // keyrack daemon prune [--owner owner]
  const daemon = keyrack
    .command('daemon')
    .description('manage keyrack daemon lifecycle');

  daemon
    .command('prune')
    .description('kill daemon process so next command starts fresh')
    .option(
      '--owner <owner>',
      'owner identity (default: default, @all for all daemons)',
    )
    .option('--for <owner>', 'alias for --owner')
    .option('--json', 'output as json (robot mode)')
    .action(async (opts: { owner?: string; for?: string; json?: boolean }) => {
      // --owner takes precedence; --for is alias; default is null (default owner)
      const ownerInput = opts.owner ?? opts.for ?? null;

      // prune daemon(s)
      const { pruned } = pruneKeyrackDaemon({ owner: ownerInput });

      // output results
      if (opts.json) {
        console.log(JSON.stringify({ pruned }, null, 2));
      } else {
        console.log('');
        console.log('🔐 keyrack daemon prune');

        if (pruned.length === 0) {
          // no daemon found
          const ownerLabel =
            ownerInput === '@all'
              ? 'any owner'
              : `owner=${ownerInput ?? 'default'}`;
          console.log(`   └─ no daemon active for ${ownerLabel}`);
        } else if (pruned.length === 1) {
          // single daemon pruned
          const { owner, pid } = pruned[0]!;
          const ownerLabel = owner ?? 'default';
          console.log(
            `   └─ pruned daemon for owner=${ownerLabel} (pid: ${pid})`,
          );
        } else {
          // multiple daemons pruned
          for (const { owner, pid } of pruned) {
            const ownerLabel = owner ?? 'default';
            console.log(
              `   ├─ pruned daemon for owner=${ownerLabel} (pid: ${pid})`,
            );
          }
          console.log(`   └─ pruned ${pruned.length} daemons`);
        }
        console.log('');
      }
    });

  // keyrack firewall --env <env> --from <source> --into <format> [--owner <owner>]
  keyrack
    .command('firewall')
    .description('translate and validate secrets for CI environments')
    .requiredOption('--env <env>', 'which env to grant (test, prod, prep, all)')
    .requiredOption(
      '--from <source>',
      'input source slug (e.g., json(env://SECRETS), json(stdin://*))',
    )
    .requiredOption('--into <format>', 'output format (github.actions, json)')
    .option('--owner <owner>', 'keyrack owner (default: "default")')
    .action(
      async (opts: {
        env: string;
        from: string;
        into: string;
        owner?: string;
      }) => {
        // validate --env
        if (!isValidKeyrackEnv(opts.env)) {
          throw new BadRequestError('invalid --env value', {
            env: opts.env,
            valid: KEYRACK_VALID_ENVS,
          });
        }

        // validate --into
        if (opts.into !== 'github.actions' && opts.into !== 'json') {
          throw new BadRequestError('invalid --into value', {
            into: opts.into,
            valid: ['github.actions', 'json'],
          });
        }

        // parse --from source
        const source = asKeyrackFirewallSource({ slug: opts.from });

        // read secrets from source
        let rawJson: string;
        if (source.type === 'env') {
          rawJson = process.env[source.envVar!] ?? '';
          if (!rawJson) {
            throw new BadRequestError('env var not set', {
              envVar: source.envVar,
              hint: `set ${source.envVar} or use --from 'json(stdin://*)'`,
            });
          }
        } else if (source.type === 'stdin') {
          // read all stdin
          const chunks: Buffer[] = [];
          for await (const chunk of process.stdin) {
            chunks.push(chunk);
          }
          rawJson = Buffer.concat(chunks).toString('utf8');
        } else {
          throw new BadRequestError('unsupported source type', { source });
        }

        // parse JSON
        let secrets: Record<string, string>;
        try {
          secrets = JSON.parse(rawJson);
        } catch {
          throw new BadRequestError('malformed secrets JSON', {
            source,
            hint: 'ensure the input is valid JSON object',
          });
        }

        // inject secrets into process.env
        for (const [key, value] of Object.entries(secrets)) {
          if (typeof value === 'string') {
            process.env[key] = value;
          }
        }

        // get gitroot and repo manifest
        const gitroot = await getGitRepoRoot({ from: process.cwd() });
        const repoManifest = await daoKeyrackRepoManifest.get({ gitroot });
        if (!repoManifest) {
          throw new BadRequestError('keyrack.yml not found', {
            hint: 'run `rhx keyrack init` to create keyrack.yml',
          });
        }

        // get slugs for this env
        const slugs = getAllKeyrackSlugsForEnv({
          manifest: repoManifest,
          env: opts.env,
        });

        // generate context for grant get
        const owner = opts.owner ?? 'default';
        const context = await genContextKeyrackGrantGet({
          gitroot,
          owner: owner === 'default' ? null : owner,
        });

        // PHASE 1: COLLECT (atomicity: gather all attempts first)
        const attempts = await getKeyrackKeyGrant(
          { for: { repo: true }, env: opts.env, slugs },
          context,
        );

        // PHASE 2: VALIDATE (fail fast if any blocked)
        const blocked = asAttemptsByStatus({ attempts, status: 'blocked' });
        if (blocked.length > 0) {
          // emit output with blocked keys visible
          getKeyrackFirewallOutput({
            attempts,
            grants: [],
            into: opts.into as 'github.actions' | 'json',
          });
          process.exit(2);
        }

        // PHASE 3: EMIT (only if all passed validation)
        const grantedAttempts = asAttemptsByStatus({
          attempts,
          status: 'granted',
        });
        const grants = grantedAttempts.map((a) => a.grant);

        getKeyrackFirewallOutput({
          attempts,
          grants,
          into: opts.into as 'github.actions' | 'json',
        });
      },
    );
};
