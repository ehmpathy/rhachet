import { BadRequestError } from 'helpful-errors';
import readline from 'readline';

import { getStdoutPrefix } from '@src/infra/withStdoutPrefix';

import {
  doesAwsProfileExist,
  getAwsSsoProfileConfig,
  initiateAwsSsoAuth,
  listAwsSsoAccounts,
  listAwsSsoRoles,
  listAwsSsoStartUrls,
  setupAwsSsoProfile,
} from './setupAwsSsoProfile';

/**
 * .what = prompts user for input via readline
 * .why = interactive cli input for guided setup flows
 *
 * .note = prepends stdout prefix from withStdoutPrefix via getStdoutPrefix()
 * .note = this ensures readline knows the full prompt length for cursor position
 */
const promptUser = (question: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  // prepend stdout prefix if set (from withStdoutPrefix)
  const prefix = getStdoutPrefix();
  const fullQuestion = prefix + question;
  return new Promise((accept) => {
    rl.question(fullQuestion, (answer) => {
      rl.close();
      accept(answer.trim());
    });
  });
};

/**
 * .what = interactive guided setup wizard for aws sso profiles
 * .why = encapsulates the full sso setup flow in the vault adapter layer
 *
 * .note = moved from invokeKeyrack.ts to the vault adapter
 *         because this is vault-specific behavior that should not leak into the cli layer
 * .note = includes: sso domain selection, browser oauth, account/role selection,
 *         profile name choice, conflict resolution, profile setup & validation
 * .note = emits stdout progress for user feedback
 */
export const setupAwsSsoWithGuide = async (input: {
  org: string;
}): Promise<{ profileName: string }> => {
  console.log('');
  console.log('🔐 keyrack set AWS_PROFILE');

  // lookup sso portals from config (silent)
  const portalsFound = await listAwsSsoStartUrls();

  let ssoStartUrl: string;
  let ssoRegion: string;

  console.log('   │');
  console.log('   ├─ which sso domain?');

  if (portalsFound.length > 0) {
    // show options
    console.log('   │  ├─ options');
    portalsFound.forEach((p, i) => {
      const isLastOption = i === portalsFound.length - 1;
      const optPrefix = isLastOption ? '└─' : '├─';
      console.log(
        `   │  │  ${optPrefix} ${i + 1}. ${p.ssoStartUrl} (${p.ssoRegion})`,
      );
    });

    // get choice
    console.log('   │  └─ choice');
    const answer = await promptUser('   │     └─ ');
    const index = parseInt(answer, 10) - 1;

    if (!isNaN(index) && index >= 0 && index < portalsFound.length) {
      // user picked option
      ssoStartUrl = portalsFound[index]!.ssoStartUrl;
      ssoRegion = portalsFound[index]!.ssoRegion;
      // rewrite the choice line with confirmation + echo
      process.stdout.write('\x1b[1A\x1b[2K');
      console.log(`   │     ├─ ${index + 1} ✓`);
      console.log(`   │     └─ as ${ssoStartUrl}`);
    } else if (answer.startsWith('http')) {
      // user entered new url
      ssoStartUrl = answer;
      // rewrite the choice line with confirmation + echo
      process.stdout.write('\x1b[1A\x1b[2K');
      console.log(`   │     ├─ ${answer} ✓`);
      console.log(`   │     └─ as ${answer}`);
      // prompt for region
      console.log('   │  └─ sso region');
      ssoRegion = await promptUser('   │     └─ ');
      if (!ssoRegion) {
        throw new BadRequestError('sso region is required');
      }
      process.stdout.write('\x1b[1A\x1b[2K');
      console.log(`   │     └─ ${ssoRegion} ✓`);
    } else {
      throw new BadRequestError(
        `invalid selection: enter 1-${portalsFound.length} or a url`,
      );
    }
  } else {
    // no portals found, prompt for new
    console.log('   │  ├─ sso start url');
    ssoStartUrl = await promptUser('   │  │  └─ ');
    if (!ssoStartUrl) {
      throw new BadRequestError('sso start url is required');
    }
    process.stdout.write('\x1b[1A\x1b[2K');
    console.log(`   │  │  └─ ${ssoStartUrl} ✓`);

    console.log('   │  └─ sso region');
    ssoRegion = await promptUser('   │     └─ ');
    if (!ssoRegion) {
      throw new BadRequestError('sso region is required');
    }
    process.stdout.write('\x1b[1A\x1b[2K');
    console.log(`   │     └─ ${ssoRegion} ✓`);
  }

  // browser auth
  console.log('   │');
  console.log('   ├─ which sso login?');

  // aws cli outputs directly to terminal (stdio: 'inherit')
  // initiateAwsSsoAuth prints 🔗 and 🔑 lines
  await initiateAwsSsoAuth({
    ssoStartUrl,
    ssoRegion,
  });

  // list accounts (silent fetch)
  const accountsUnsorted = listAwsSsoAccounts({ ssoRegion });
  if (accountsUnsorted.length === 0) {
    throw new BadRequestError('no accounts found for this sso configuration');
  }

  // sort accounts alphabetically by name for stable order
  const accounts = [...accountsUnsorted].sort((a, b) =>
    a.accountName.localeCompare(b.accountName),
  );

  // find max account name length so IDs align
  const maxAccountNameLen = Math.max(
    ...accounts.map((a) => a.accountName.length),
  );

  console.log('   │');
  console.log('   ├─ which account?');
  console.log('   │  ├─ options');
  accounts.forEach((a, i) => {
    const isLastOption = i === accounts.length - 1;
    const optPrefix = isLastOption ? '└─' : '├─';
    const paddedName = a.accountName.padEnd(maxAccountNameLen);
    console.log(
      `   │  │  ${optPrefix} ${i + 1}. ${paddedName} · ${a.accountId}`,
    );
  });
  console.log('   │  └─ choice');
  const accountAnswer = await promptUser('   │     └─ ');
  const accountIndex = parseInt(accountAnswer, 10) - 1;
  if (
    isNaN(accountIndex) ||
    accountIndex < 0 ||
    accountIndex >= accounts.length
  ) {
    throw new BadRequestError(`invalid selection: ${accountAnswer}`);
  }
  const selectedAccount = accounts[accountIndex]!;
  // rewrite the choice line with confirmation + echo
  process.stdout.write('\x1b[1A\x1b[2K');
  console.log(`   │     ├─ ${accountIndex + 1} ✓`);
  console.log(`   │     └─ as ${selectedAccount.accountName}`);

  // list roles (silent fetch)
  const rolesUnsorted = listAwsSsoRoles({
    ssoRegion,
    accountId: selectedAccount.accountId,
  });
  if (rolesUnsorted.length === 0) {
    throw new BadRequestError('no roles found for this account');
  }

  // sort roles alphabetically by name for stable order
  const roles = [...rolesUnsorted].sort((a, b) =>
    a.roleName.localeCompare(b.roleName),
  );

  console.log('   │');
  console.log('   ├─ which role?');
  console.log('   │  ├─ options');
  roles.forEach((r, i) => {
    const isLastOption = i === roles.length - 1;
    const optPrefix = isLastOption ? '└─' : '├─';
    console.log(`   │  │  ${optPrefix} ${i + 1}. ${r.roleName}`);
  });
  console.log('   │  └─ choice');
  const roleAnswer = await promptUser('   │     └─ ');
  const roleIndex = parseInt(roleAnswer, 10) - 1;
  if (isNaN(roleIndex) || roleIndex < 0 || roleIndex >= roles.length) {
    throw new BadRequestError(`invalid selection: ${roleAnswer}`);
  }
  const selectedRole = roles[roleIndex]!;
  // rewrite the choice line with confirmation + echo
  process.stdout.write('\x1b[1A\x1b[2K');
  console.log(`   │     ├─ ${roleIndex + 1} ✓`);
  console.log(`   │     └─ as ${selectedRole.roleName}`);

  // profile name with smart suggestion
  // strip redundant prefix: if account name starts with org, use just the suffix
  const accountSlug = selectedAccount.accountName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const orgLower = input.org.toLowerCase();
  const accountSuffix = accountSlug.startsWith(orgLower)
    ? accountSlug.slice(orgLower.length)
    : accountSlug;
  const suggestedName = `${input.org}.${accountSuffix || accountSlug}`;

  console.log('   │');
  console.log('   ├─ what should we call it?');
  console.log('   │  ├─ suggested');
  console.log(`   │  │  └─ ${suggestedName}`);
  console.log('   │  └─ choice');
  const profileNameInput = await promptUser('   │     └─ ');
  const profileName = profileNameInput || suggestedName;
  const acceptedDefault = !profileNameInput;
  // rewrite the choice line with confirmation + echo
  process.stdout.write('\x1b[1A\x1b[2K');
  // if accepted default (pressed enter), show just ✓; otherwise show what they typed
  const checkLine = acceptedDefault ? '✓' : `${profileName} ✓`;
  console.log(`   │     ├─ ${checkLine}`);
  console.log(`   │     └─ as ${profileName}`);

  // check if profile already exists in ~/.aws/config
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

      if (!isEquivalent) {
        // collect differences
        const diffs: string[] = [];
        if (profileSsoConfig.ssoStartUrl !== ssoStartUrl) {
          diffs.push(
            `sso_start_url: ${profileSsoConfig.ssoStartUrl} → ${ssoStartUrl}`,
          );
        }
        if (profileSsoConfig.ssoRegion !== ssoRegion) {
          diffs.push(
            `sso_region: ${profileSsoConfig.ssoRegion} → ${ssoRegion}`,
          );
        }
        if (profileSsoConfig.ssoAccountId !== selectedAccount.accountId) {
          diffs.push(
            `sso_account_id: ${profileSsoConfig.ssoAccountId} → ${selectedAccount.accountId}`,
          );
        }
        if (profileSsoConfig.ssoRoleName !== selectedRole.roleName) {
          diffs.push(
            `sso_role_name: ${profileSsoConfig.ssoRoleName} → ${selectedRole.roleName}`,
          );
        }

        console.log('   │');
        console.log('   ├─ ⚠ profile found in ~/.aws/config (different)');
        console.log('   │  ├─ differences');
        diffs.forEach((diff, i) => {
          const isLastDiff = i === diffs.length - 1;
          const diffPrefix = isLastDiff ? '└─' : '├─';
          console.log(`   │  │  ${diffPrefix} ${diff}`);
        });
        console.log('   │  └─ choice');
        const overwriteAnswer = await promptUser(
          '   │     └─ overwrite? (y/n): ',
        );
        shouldOverwrite = overwriteAnswer.toLowerCase() === 'y';
        // rewrite the choice line with confirmation
        process.stdout.write('\x1b[1A\x1b[2K');
        console.log(`   │     └─ ${shouldOverwrite ? 'y ✓' : 'n ✗'}`);

        if (!shouldOverwrite) {
          console.log('   │');
          console.log('   └─ (setup cancelled)');
          console.log('');
          process.exit(0);
        }
      }
    } else {
      // profile exists but is NOT an sso profile
      console.log('   │');
      console.log(
        '   ├─ ⚠ profile found in ~/.aws/config (not an sso profile)',
      );
      console.log('   │  ├─ note');
      console.log('   │  │  └─ this profile exists but was not set up for sso');
      console.log('   │  └─ choice');
      const overwriteAnswer = await promptUser(
        '   │     └─ overwrite? (y/n): ',
      );
      shouldOverwrite = overwriteAnswer.toLowerCase() === 'y';
      // rewrite the choice line with confirmation
      process.stdout.write('\x1b[1A\x1b[2K');
      console.log(`   │     └─ ${shouldOverwrite ? 'y ✓' : 'n ✗'}`);

      if (!shouldOverwrite) {
        console.log('   │');
        console.log('   └─ (setup cancelled)');
        console.log('');
        process.exit(0);
      }
    }
  }

  // setup profile (skip if equivalent)
  console.log('   │');
  console.log('   ├─ lovely, lets vault it now...');
  if (!profileExists || shouldOverwrite) {
    await setupAwsSsoProfile({
      profileName,
      ssoStartUrl,
      ssoRegion,
      ssoAccountId: selectedAccount.accountId,
      ssoRoleName: selectedRole.roleName,
      overwrite: true,
    });
    console.log('   │  └─ ✓ written to ~/.aws/config');
  } else if (isEquivalent) {
    // equivalent profile found, just use it
    console.log('   │  └─ ✓ profile already in ~/.aws/config');
  }

  return { profileName };
};
