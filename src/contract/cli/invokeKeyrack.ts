import type { Command } from 'commander';
import { BadRequestError } from 'helpful-errors';
import readline from 'readline';
import { getGitRepoRoot } from 'rhachet-artifact-git';

import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import type {
  KeyrackGrantMechanism,
  KeyrackHostVault,
} from '@src/domain.objects/keyrack';
import {
  genKeyrackGrantContext,
  genKeyrackHostContext,
  getKeyrackKeyGrant,
  initKeyrackRepoManifest,
  setKeyrackKeyHost,
} from '@src/domain.operations/keyrack';
import { asKeyrackKeyName } from '@src/domain.operations/keyrack/asKeyrackKeyName';
import { assertKeyrackOrgMatchesManifest } from '@src/domain.operations/keyrack/assertKeyrackOrgMatchesManifest';
import { getAllKeyrackSlugsForEnv } from '@src/domain.operations/keyrack/getAllKeyrackSlugsForEnv';
import { resolveKeyrackSlug } from '@src/domain.operations/keyrack/resolveKeyrackSlug';
import { getKeyrackStatus } from '@src/domain.operations/keyrack/session/getKeyrackStatus';
import { relockKeyrack } from '@src/domain.operations/keyrack/session/relockKeyrack';
import { unlockKeyrack } from '@src/domain.operations/keyrack/session/unlockKeyrack';
import {
  doesAwsProfileExist,
  getAwsSsoProfileConfig,
  initiateAwsSsoAuth,
  isAwsCliInstalled,
  listAwsSsoAccounts,
  listAwsSsoRoles,
  listAwsSsoStartUrls,
  setupAwsSsoProfile,
} from '@src/domain.operations/keyrack/setupAwsSsoProfile';

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

  // keyrack get --for repo
  // keyrack get --key $key
  keyrack
    .command('get')
    .description('grant credentials from keyrack')
    .option('--for <scope>', 'grant scope: "repo" for all keys')
    .option('--key <slug>', 'grant specific key by slug')
    .option('--env <env>', 'target env: prod, prep, test, or all')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        for?: string;
        key?: string;
        env?: string;
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

        // generate context
        const context = await genKeyrackGrantContext({ gitroot });

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
            console.log(
              `done. ${granted.length} granted, ${blocked.length} blocked, ${absent.length} absent.`,
            );
            console.log('');
          }
        } else if (opts.key) {
          // resolve raw key name to full slug (infers env if unambiguous)
          const resolved = resolveKeyrackSlug({
            key: opts.key,
            env: opts.env ?? null,
            manifest: context.repoManifest,
          });

          const attempt = await getKeyrackKeyGrant(
            { for: { key: resolved.slug } },
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
      },
    );

  // keyrack set --key $key --mech $mech --vault $vault
  keyrack
    .command('set')
    .description('configure storage for a credential key')
    .requiredOption(
      '--key <keyname>',
      'raw key name to configure (e.g., AWS_PROFILE)',
    )
    .option(
      '--mech <mechanism>',
      'grant mechanism: PERMANENT_VIA_REPLICA, EPHEMERAL_VIA_GITHUB_APP, EPHEMERAL_VIA_AWS_SSO (inferred from vault if not specified)',
    )
    .requiredOption(
      '--vault <vault>',
      'storage vault: os.direct, os.secure, 1password, aws.iam.sso',
    )
    .option('--env <env>', 'target env (default: all)', 'all')
    .option('--org <org>', 'target org (default: @this)', '@this')
    .option('--exid <exid>', 'external id (vault-specific reference)')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        key: string;
        mech?: string;
        vault: string;
        env: string;
        org: string;
        exid?: string;
        json?: boolean;
      }) => {
        // infer mechanism from vault if not provided
        const inferredMech: string | undefined = (() => {
          if (opts.mech) return opts.mech;
          // aws.iam.sso vault only makes sense with EPHEMERAL_VIA_AWS_SSO
          if (opts.vault === 'aws.iam.sso') return 'EPHEMERAL_VIA_AWS_SSO';
          return undefined;
        })();

        if (!inferredMech) {
          throw new BadRequestError(
            `--mech is required for vault '${opts.vault}'. use one of: PERMANENT_VIA_REPLICA, EPHEMERAL_VIA_GITHUB_APP, EPHEMERAL_VIA_AWS_SSO`,
          );
        }

        // apply inferred value to opts.mech
        opts.mech = inferredMech;

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
          'aws.iam.sso',
        ];
        if (!validVaults.includes(opts.vault as KeyrackHostVault)) {
          throw new BadRequestError(
            `invalid --vault: must be one of ${validVaults.join(', ')}`,
          );
        }

        // get gitroot to resolve org from manifest
        const gitroot = await getGitRepoRoot({ from: process.cwd() });
        const grantContext = await genKeyrackGrantContext({ gitroot });
        const context = await genKeyrackHostContext();

        // resolve org from manifest
        if (!grantContext.repoManifest) {
          console.log('');
          console.log('✋ no keyrack.yml found in this repo');
          console.log(
            "   └─ tip: run 'npx rhachet keyrack init --org <your-org>' to create one",
          );
          console.log('');
          process.exit(1);
        }
        const org = assertKeyrackOrgMatchesManifest({
          manifest: grantContext.repoManifest,
          org: opts.org,
        });

        // compute target slugs based on --env
        const targetSlugs: string[] = (() => {
          if (opts.env === 'all') {
            // expand to all envs that declare this key
            return getAllKeyrackSlugsForEnv({
              manifest: grantContext.repoManifest!,
              env: 'all',
            }).filter((s) => asKeyrackKeyName({ slug: s }) === opts.key);
          }
          return [`${org}.${opts.env}.${opts.key}`];
        })();

        // handle interactive AWS SSO setup
        // skip if --exid provided (user already has profile name) or stdin is not TTY
        let awsSsoProfileName: string | null = null;
        const shouldRunInteractiveSsoSetup =
          opts.mech === 'EPHEMERAL_VIA_AWS_SSO' &&
          !opts.exid &&
          process.stdin.isTTY;

        if (shouldRunInteractiveSsoSetup) {
          // helper to write inline and clear line
          const write = (text: string) => process.stdout.write(text);
          const clearLine = () => write('\x1b[2K\r');

          console.log('');
          console.log('🔐 keyrack set AWS_PROFILE');
          console.log('');

          // show spinner immediately while we check prerequisites
          write('   ├─ check prerequisites ⏳');

          // check aws cli
          if (!isAwsCliInstalled()) {
            clearLine();
            console.log('   ├─ ✗ aws cli is not installed');
            console.log('   │');
            console.log('   │  install via: brew install awscli (macos)');
            console.log('   │  or see https://aws.amazon.com/cli/');
            console.log('   │');
            console.log('   └─ (setup blocked)');
            console.log('');
            process.exit(1);
          }

          clearLine();
          console.log('   ├─ ✓ aws cli installed');
          console.log('   │');

          // lookup sso portals from config
          write('   ├─ lookup sso portals from ~/.aws/config ⏳');
          const portalsFound = await listAwsSsoStartUrls();
          clearLine();
          if (portalsFound.length > 0) {
            console.log(
              `   ├─ ✓ found ${portalsFound.length} sso portal${portalsFound.length > 1 ? 's' : ''} in ~/.aws/config`,
            );
          } else {
            console.log('   ├─ ✓ checked ~/.aws/config (no portals found)');
          }
          console.log('   │');

          let ssoStartUrl: string;
          let ssoRegion: string;

          console.log('   ├─ which sso domain?');
          console.log('   │');

          if (portalsFound.length > 0) {
            // show options found
            console.log('   │  options found:');
            portalsFound.forEach((p, i) => {
              console.log(
                `   │    ${i + 1}. ${p.ssoStartUrl} (${p.ssoRegion})`,
              );
            });
            console.log('   │');
            console.log(
              '   │  reuse one? enter the number. otherwise, enter a custom url.',
            );
            console.log('   │');

            const answer = await promptUser('   │  choice: ');
            const index = parseInt(answer, 10) - 1;

            if (!isNaN(index) && index >= 0 && index < portalsFound.length) {
              // user picked option
              ssoStartUrl = portalsFound[index]!.ssoStartUrl;
              ssoRegion = portalsFound[index]!.ssoRegion;
            } else if (answer.startsWith('http')) {
              // user entered new url
              ssoStartUrl = answer;
              ssoRegion = await promptUser(
                '   │  sso region (e.g., us-east-1): ',
              );
              if (!ssoRegion) {
                throw new BadRequestError('sso region is required');
              }
            } else {
              throw new BadRequestError(
                `invalid selection: enter 1-${portalsFound.length} or a url`,
              );
            }
          } else {
            // no portals found, prompt for new
            ssoStartUrl = await promptUser(
              '   │  sso start url (e.g., https://acme.awsapps.com/start): ',
            );
            if (!ssoStartUrl) {
              throw new BadRequestError('sso start url is required');
            }

            ssoRegion = await promptUser(
              '   │  sso region (e.g., us-east-1): ',
            );
            if (!ssoRegion) {
              throw new BadRequestError('sso region is required');
            }
          }

          console.log('   │');
          console.log(`   │  ✓ sso_start_url = ${ssoStartUrl}`);
          console.log(`   │  ✓ sso_region = ${ssoRegion}`);
          console.log('   │');

          // browser auth
          console.log('   ├─ which sso login?');
          console.log('   │');
          console.log('   │  ⏳ open browser for device auth...');
          console.log('   │');

          // aws cli outputs directly to terminal (stdio: 'inherit')
          await initiateAwsSsoAuth({
            ssoStartUrl,
            ssoRegion,
          });

          console.log('   │');
          console.log('   │  ✓ browser auth approved');
          console.log('   │');

          // list accounts
          write('   │  ⏳ fetch accounts...');
          const accounts = listAwsSsoAccounts({ ssoRegion });
          clearLine();
          if (accounts.length === 0) {
            throw new BadRequestError(
              'no accounts found for this sso configuration',
            );
          }

          console.log('   ├─ which account?');
          console.log('   │');
          accounts.forEach((a, i) => {
            console.log(
              `   │    ${i + 1}. ${a.accountId} · ${a.accountName} · ${a.emailAddress}`,
            );
          });
          console.log('   │');
          const accountAnswer = await promptUser('   │  choice: ');
          const accountIndex = parseInt(accountAnswer, 10) - 1;
          if (
            isNaN(accountIndex) ||
            accountIndex < 0 ||
            accountIndex >= accounts.length
          ) {
            throw new BadRequestError(`invalid selection: ${accountAnswer}`);
          }
          const selectedAccount = accounts[accountIndex]!;
          console.log('   │');
          console.log(`   │  ✓ sso_account_id = ${selectedAccount.accountId}`);
          console.log('   │');

          // list roles
          write('   │  ⏳ fetch roles...');
          const roles = listAwsSsoRoles({
            ssoRegion,
            accountId: selectedAccount.accountId,
          });
          clearLine();
          if (roles.length === 0) {
            throw new BadRequestError('no roles found for this account');
          }

          console.log('   ├─ which role?');
          console.log('   │');
          roles.forEach((r, i) => {
            console.log(`   │    ${i + 1}. ${r.roleName}`);
          });
          console.log('   │');
          const roleAnswer = await promptUser('   │  choice: ');
          const roleIndex = parseInt(roleAnswer, 10) - 1;
          if (isNaN(roleIndex) || roleIndex < 0 || roleIndex >= roles.length) {
            throw new BadRequestError(`invalid selection: ${roleAnswer}`);
          }
          const selectedRole = roles[roleIndex]!;
          console.log('   │');
          console.log(`   │  ✓ sso_role_name = ${selectedRole.roleName}`);
          console.log('   │');

          // profile name with smart suggestion
          // strip redundant prefix: if account name starts with org, use just the suffix
          const accountSlug = selectedAccount.accountName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
          const orgLower = org.toLowerCase();
          const accountSuffix = accountSlug.startsWith(orgLower)
            ? accountSlug.slice(orgLower.length)
            : accountSlug;
          const suggestedName = `${org}.${accountSuffix || accountSlug}`;

          console.log('   ├─ what should we call it?');
          console.log('   │');
          console.log(`   │  suggested: ${suggestedName}`);
          const profileNameInput = await promptUser(
            '   │  accept or enter custom: ',
          );
          const profileName = profileNameInput || suggestedName;
          console.log('   │');
          console.log(`   │  ✓ profile = ${profileName}`);
          console.log('   │');

          // check if profile already exists
          const profileExists = await doesAwsProfileExist({ profileName });
          const profileSsoConfig = profileExists
            ? await getAwsSsoProfileConfig({ profileName })
            : null;
          let shouldOverwrite = false;
          let isEquivalent = false;

          if (profileExists) {
            if (profileSsoConfig) {
              // profile exists and is an sso profile - compare configs
              isEquivalent =
                profileSsoConfig.ssoStartUrl === ssoStartUrl &&
                profileSsoConfig.ssoRegion === ssoRegion &&
                profileSsoConfig.ssoAccountId === selectedAccount.accountId &&
                profileSsoConfig.ssoRoleName === selectedRole.roleName;

              if (isEquivalent) {
                console.log(
                  '   ├─ ✓ profile found in ~/.aws/config (equivalent)',
                );
                console.log('   │');
              } else {
                console.log(
                  '   ├─ ⚠ profile found in ~/.aws/config (different)',
                );
                console.log('   │');
                console.log('   │  differences:');
                if (profileSsoConfig.ssoStartUrl !== ssoStartUrl) {
                  console.log(
                    `   │    sso_start_url: ${profileSsoConfig.ssoStartUrl} → ${ssoStartUrl}`,
                  );
                }
                if (profileSsoConfig.ssoRegion !== ssoRegion) {
                  console.log(
                    `   │    sso_region: ${profileSsoConfig.ssoRegion} → ${ssoRegion}`,
                  );
                }
                if (
                  profileSsoConfig.ssoAccountId !== selectedAccount.accountId
                ) {
                  console.log(
                    `   │    sso_account_id: ${profileSsoConfig.ssoAccountId} → ${selectedAccount.accountId}`,
                  );
                }
                if (profileSsoConfig.ssoRoleName !== selectedRole.roleName) {
                  console.log(
                    `   │    sso_role_name: ${profileSsoConfig.ssoRoleName} → ${selectedRole.roleName}`,
                  );
                }
                console.log('   │');
                const overwriteAnswer = await promptUser(
                  '   │  overwrite? (y/n): ',
                );
                shouldOverwrite = overwriteAnswer.toLowerCase() === 'y';
                console.log('   │');

                if (!shouldOverwrite) {
                  console.log('   └─ (setup cancelled)');
                  console.log('');
                  process.exit(0);
                }
              }
            } else {
              // profile exists but is NOT an sso profile
              console.log(
                '   ├─ ⚠ profile found in ~/.aws/config (not an sso profile)',
              );
              console.log('   │');
              console.log(
                '   │  this profile exists but was not set up for sso.',
              );
              console.log('   │');
              const overwriteAnswer = await promptUser(
                '   │  overwrite? (y/n): ',
              );
              shouldOverwrite = overwriteAnswer.toLowerCase() === 'y';
              console.log('   │');

              if (!shouldOverwrite) {
                console.log('   └─ (setup cancelled)');
                console.log('');
                process.exit(0);
              }
            }
          }

          // setup profile (skip if equivalent)
          if (!profileExists || shouldOverwrite) {
            const verb = profileExists ? 'update' : 'write';
            write(`   └─ ⏳ ${verb} ~/.aws/config...`);
            await setupAwsSsoProfile({
              profileName,
              ssoStartUrl,
              ssoRegion,
              ssoAccountId: selectedAccount.accountId,
              ssoRoleName: selectedRole.roleName,
              overwrite: true, // always safe: harmless if new, required if exists
            });
            clearLine();
            console.log('   └─ done');
            console.log('');
            console.log(
              `      ✓ ${verb === 'update' ? 'updated' : 'wrote'} ~/.aws/config`,
            );
            console.log('      ✓ validated via aws sts get-caller-identity');
            console.log('');
          } else if (isEquivalent) {
            // equivalent profile found, just use it
            console.log('   └─ done');
            console.log('');
          }

          awsSsoProfileName = profileName;
        }

        // set host config for each target slug
        const results: Array<{ slug: string; vault: string; mech: string }> =
          [];
        for (const slug of targetSlugs) {
          const keyHost = await setKeyrackKeyHost(
            {
              slug,
              mech: opts.mech as KeyrackGrantMechanism,
              vault: opts.vault as KeyrackHostVault,
              exid: awsSsoProfileName ?? opts.exid,
            },
            context,
          );

          // store value in vault (for vaults that store values, not just references)
          // aws.iam.sso vault needs the profile name stored so get() can retrieve it
          const profileNameToStore = awsSsoProfileName ?? opts.exid;
          if (opts.vault === 'aws.iam.sso' && profileNameToStore) {
            await context.vaultAdapters['aws.iam.sso'].set({
              slug,
              value: profileNameToStore,
            });
          }

          results.push({ slug, vault: keyHost.vault, mech: keyHost.mech });
        }

        // register key in repo manifest (findsert: adds if not present)
        // note: only register for specific env (skip when env='all')
        if (opts.env !== 'all') {
          await daoKeyrackRepoManifest.set({
            gitroot,
            env: opts.env,
            keyName: opts.key,
          });
        }

        // output results
        if (opts.json) {
          console.log(JSON.stringify(results, null, 2));
        } else {
          console.log('');
          console.log(`🔐 rhachet/keyrack set (org: ${org}, env: ${opts.env})`);
          for (let i = 0; i < results.length; i++) {
            const r = results[i]!;
            const isLast = i === results.length - 1;
            const prefix = isLast ? '   └─' : '   ├─';
            const indent = isLast ? '      ' : '   │  ';
            console.log(`${prefix} ${r.slug}`);
            console.log(`${indent}├─ mech: ${r.mech}`);
            console.log(`${indent}└─ vault: ${r.vault}`);
          }
          console.log(`done. ${results.length} key(s) configured ✨`);
          console.log('');
        }
      },
    );

  // keyrack unlock [--duration 9h] [--passphrase <passphrase>]
  keyrack
    .command('unlock')
    .description('unlock keys and send them to daemon for session access')
    .option('--env <env>', 'target env: prod, prep, test, or all')
    .option(
      '--duration <duration>',
      'TTL for unlocked keys (e.g., 9h, 30m)',
      '9h',
    )
    .option('--passphrase <passphrase>', 'passphrase for encrypted vaults')
    .option('--json', 'output as json (robot mode)')
    .action(
      async (opts: {
        env?: string;
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
          {
            env: opts.env,
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
    .description(
      'list keys declared in repo manifest (default) or configured on host',
    )
    .option('--from <scope>', 'source: repo (default) or host', 'repo')
    .option('--json', 'output as json (robot mode)')
    .action(async (opts: { from: string; json?: boolean }) => {
      // validate --from
      if (opts.from !== 'repo' && opts.from !== 'host') {
        throw new BadRequestError('--from must be "repo" or "host"');
      }

      // handle --from host (legacy behavior)
      if (opts.from === 'host') {
        const context = await genKeyrackHostContext();
        const hosts = context.hostManifest.hosts;
        const slugs = Object.keys(hosts);

        if (opts.json) {
          console.log(JSON.stringify(hosts, null, 2));
        } else {
          console.log('');
          console.log('🔐 rhachet/keyrack (host)');
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
              console.log(`${indent}├─ mech: ${host.mech}`);
              console.log(`${indent}└─ vault: ${host.vault}`);
            }
          }
          console.log(`done. ${slugs.length} keys configured.`);
          console.log('');
        }
        return;
      }

      // handle --from repo (default)
      const gitroot = await getGitRepoRoot({ from: process.cwd() });
      const grantContext = await genKeyrackGrantContext({ gitroot });
      const hostContext = await genKeyrackHostContext();

      if (!grantContext.repoManifest) {
        console.log('');
        console.log('✋ no keyrack.yml found in this repo');
        console.log(
          "   └─ tip: run 'npx rhachet keyrack init --org <your-org>' to create one",
        );
        console.log('');
        process.exit(1);
      }

      // get all slugs from repo manifest
      const repoKeys = grantContext.repoManifest.keys;
      const slugs = Object.keys(repoKeys);

      // enrich with host config if available
      const enriched: Record<
        string,
        {
          slug: string;
          mech: string;
          vault: string | null;
          exid: string | null;
          createdAt: string | null;
          updatedAt: string | null;
        }
      > = {};

      for (const slug of slugs) {
        const repoKey = repoKeys[slug]!;
        const hostEntry = hostContext.hostManifest.hosts[slug];
        enriched[slug] = {
          slug,
          mech: hostEntry?.mech ?? repoKey.mech,
          vault: hostEntry?.vault ?? null,
          exid: hostEntry?.exid ?? null,
          createdAt: hostEntry?.createdAt ?? null,
          updatedAt: hostEntry?.updatedAt ?? null,
        };
      }

      // output results
      if (opts.json) {
        console.log(JSON.stringify(enriched, null, 2));
      } else {
        console.log('');
        console.log('🔐 rhachet/keyrack');
        if (slugs.length === 0) {
          console.log('   └─ (no keys declared in repo manifest)');
        } else {
          for (let i = 0; i < slugs.length; i++) {
            const slug = slugs[i]!;
            const entry = enriched[slug]!;
            const isLast = i === slugs.length - 1;
            const prefix = isLast ? '   └─' : '   ├─';
            const indent = isLast ? '      ' : '   │  ';
            console.log(`${prefix} ${slug}`);
            console.log(`${indent}├─ mech: ${entry.mech}`);
            console.log(
              `${indent}└─ vault: ${entry.vault ?? '(not configured on host)'}`,
            );
          }
        }
        console.log(`done. ${slugs.length} keys configured.`);
        console.log('');
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
        }
        console.log('');
      }
    });
};
