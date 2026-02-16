import { execSync } from 'child_process';
import fs from 'fs/promises';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import os from 'os';
import path from 'path';

import { getTempDir } from '../../infra/getTempDir';

/**
 * .what = sets up an AWS SSO profile in ~/.aws/config
 * .why = guided setup for AWS SSO credentials via keyrack
 */
export const setupAwsSsoProfile = async (input: {
  profileName: string;
  ssoStartUrl: string;
  ssoRegion: string;
  ssoAccountId: string;
  ssoRoleName: string;
  defaultRegion?: string;
  overwrite?: boolean;
}): Promise<{ profileName: string; configPath: string }> => {
  // ensure aws cli is installed
  try {
    execSync('aws --version', { stdio: 'pipe' });
  } catch {
    throw new BadRequestError(
      'aws cli is required for EPHEMERAL_VIA_AWS_SSO. install via: brew install awscli (macos) or see https://aws.amazon.com/cli/',
    );
  }

  // compute config path
  const configPath = path.join(os.homedir(), '.aws', 'config');

  // ensure .aws directory exists
  const awsDir = path.join(os.homedir(), '.aws');
  await fs.mkdir(awsDir, { recursive: true });

  // read current config or start fresh
  let configCurrent = '';
  try {
    configCurrent = await fs.readFile(configPath, 'utf-8');
  } catch {
    // file doesn't exist, start fresh
  }

  // check if profile already exists
  const profileHeader = `[profile ${input.profileName}]`;
  const sessionHeader = `[sso-session ${input.profileName}]`;
  const profileExists = configCurrent.includes(profileHeader);

  if (profileExists && !input.overwrite) {
    throw new BadRequestError(
      `profile '${input.profileName}' already exists in ${configPath}. choose a different name or set overwrite: true.`,
    );
  }

  // helper to remove a section from config
  const removeSection = (config: string, header: string): string => {
    const headerIndex = config.indexOf(header);
    if (headerIndex === -1) return config;
    const sectionStart = headerIndex;
    const nextSection = config.indexOf('\n[', headerIndex + 1);
    const sectionEnd = nextSection === -1 ? config.length : nextSection;
    return config.slice(0, sectionStart) + config.slice(sectionEnd);
  };

  // if overwrite, remove old profile and sso-session sections
  if (profileExists && input.overwrite) {
    configCurrent = removeSection(configCurrent, profileHeader);
    configCurrent = removeSection(configCurrent, sessionHeader);
  }

  // build v2 format config (sso-session block, matches aws cli standard)
  const profileConfig = `
${profileHeader}
sso_session = ${input.profileName}
sso_account_id = ${input.ssoAccountId}
sso_role_name = ${input.ssoRoleName}
region = ${input.defaultRegion ?? input.ssoRegion}
${sessionHeader}
sso_start_url = ${input.ssoStartUrl}
sso_region = ${input.ssoRegion}
sso_registration_scopes = sso:account:access
`;

  // append to config
  const configNew = configCurrent.trimEnd() + '\n' + profileConfig;
  await fs.writeFile(configPath, configNew, 'utf-8');

  // trigger sso login to validate
  try {
    execSync(`aws sso login --profile "${input.profileName}"`, {
      stdio: 'inherit',
    });
  } catch {
    throw new UnexpectedCodePathError('aws sso login failed', {
      profileName: input.profileName,
    });
  }

  // validate the profile works
  try {
    execSync(`aws sts get-caller-identity --profile "${input.profileName}"`, {
      stdio: 'pipe',
    });
  } catch {
    throw new UnexpectedCodePathError(
      'aws sts get-caller-identity failed after sso login',
      { profileName: input.profileName },
    );
  }

  return { profileName: input.profileName, configPath };
};

/**
 * .what = checks if an aws profile exists in ~/.aws/config
 * .why = need to know if profile exists before we check if it's sso
 */
export const doesAwsProfileExist = async (input: {
  profileName: string;
}): Promise<boolean> => {
  const configPath = path.join(os.homedir(), '.aws', 'config');

  let configContent = '';
  try {
    configContent = await fs.readFile(configPath, 'utf-8');
  } catch {
    return false;
  }

  const profileHeader = `[profile ${input.profileName}]`;
  return configContent.includes(profileHeader);
};

/**
 * .what = gets the config for an sso profile if it exists
 * .why = enables comparison before overwrite
 * .note = supports both v1 (inline settings) and v2 (sso_session references) formats
 */
export const getAwsSsoProfileConfig = async (input: {
  profileName: string;
}): Promise<{
  ssoStartUrl: string;
  ssoRegion: string;
  ssoAccountId: string;
  ssoRoleName: string;
  region: string;
} | null> => {
  const configPath = path.join(os.homedir(), '.aws', 'config');

  let configContent = '';
  try {
    configContent = await fs.readFile(configPath, 'utf-8');
  } catch {
    return null;
  }

  // helper to extract a section by header
  const getSection = (header: string): string | null => {
    const headerIndex = configContent.indexOf(header);
    if (headerIndex === -1) return null;
    const sectionStart = headerIndex + header.length;
    const nextSection = configContent.indexOf('\n[', sectionStart);
    const sectionEnd = nextSection === -1 ? configContent.length : nextSection;
    return configContent.slice(sectionStart, sectionEnd);
  };

  // helper to parse value from section
  const getValue = (section: string, key: string): string => {
    const match = section.match(
      new RegExp(`(?:^|\\n)${key}\\s*=\\s*(.+)`, 'm'),
    );
    return match?.[1]?.trim() ?? '';
  };

  // find the profile section
  const profileSection = getSection(`[profile ${input.profileName}]`);
  if (!profileSection) return null;

  // get values from profile section
  const ssoAccountId = getValue(profileSection, 'sso_account_id');
  const ssoRoleName = getValue(profileSection, 'sso_role_name');
  const region = getValue(profileSection, 'region');

  // try v1 format first: sso settings are inline in the profile section
  let ssoStartUrl = getValue(profileSection, 'sso_start_url');
  let ssoRegion = getValue(profileSection, 'sso_region');

  // if not v1, try v2 format: profile has sso_session reference
  if (!ssoStartUrl) {
    const ssoSessionName = getValue(profileSection, 'sso_session');
    if (!ssoSessionName) return null; // not an sso profile

    // find the sso-session section
    const sessionSection = getSection(`[sso-session ${ssoSessionName}]`);
    if (!sessionSection) return null; // orphaned sso_session reference

    // get values from session section
    ssoStartUrl = getValue(sessionSection, 'sso_start_url');
    ssoRegion = getValue(sessionSection, 'sso_region');
  }

  if (!ssoStartUrl) return null; // still not an sso profile

  return {
    ssoStartUrl,
    ssoRegion,
    ssoAccountId,
    ssoRoleName,
    region,
  };
};

/**
 * .what = lists sso start urls from ~/.aws/config
 * .why = lets user pick from configured sso portals instead of manual entry
 * .note = parses both v1 (inline in profile) and v2 (sso-session blocks) formats
 */
export const listAwsSsoStartUrls = async (): Promise<
  Array<{ ssoStartUrl: string; ssoRegion: string }>
> => {
  const configPath = path.join(os.homedir(), '.aws', 'config');

  // read config file
  let configContent = '';
  try {
    configContent = await fs.readFile(configPath, 'utf-8');
  } catch {
    // file doesn't exist
    return [];
  }

  const results: Array<{ ssoStartUrl: string; ssoRegion: string }> = [];
  const seenUrls = new Set<string>();

  // helper to add url if not seen
  const addIfNew = (ssoStartUrl: string, ssoRegion: string) => {
    if (!seenUrls.has(ssoStartUrl)) {
      seenUrls.add(ssoStartUrl);
      results.push({ ssoStartUrl, ssoRegion });
    }
  };

  // v1 format: parse sso_start_url from profile blocks with inline settings
  const profileRegex = /\[profile\s+[^\]]+\]([^[]*)/g;
  for (const match of configContent.matchAll(profileRegex)) {
    const section = match[1] ?? '';
    const urlMatch = section.match(/sso_start_url\s*=\s*(.+)/);
    const regionMatch = section.match(/sso_region\s*=\s*(.+)/);

    if (urlMatch && regionMatch) {
      addIfNew(urlMatch[1]!.trim(), regionMatch[1]!.trim());
    }
  }

  // v2 format: parse sso_start_url from sso-session blocks
  const sessionRegex = /\[sso-session\s+[^\]]+\]([^[]*)/g;
  for (const match of configContent.matchAll(sessionRegex)) {
    const section = match[1] ?? '';
    const urlMatch = section.match(/sso_start_url\s*=\s*(.+)/);
    const regionMatch = section.match(/sso_region\s*=\s*(.+)/);

    if (urlMatch && regionMatch) {
      addIfNew(urlMatch[1]!.trim(), regionMatch[1]!.trim());
    }
  }

  return results;
};

/**
 * .what = checks if aws cli is installed
 * .why = prerequisite for aws sso setup
 */
export const isAwsCliInstalled = (): boolean => {
  try {
    execSync('aws --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
};

/**
 * .what = initiates aws sso device auth and returns access token
 * .why = needed to list accounts and roles before profile is created
 */
export const initiateAwsSsoAuth = async (input: {
  ssoStartUrl: string;
  ssoRegion: string;
}): Promise<void> => {
  // create temp config file (don't mutate user's ~/.aws/config)
  const tempDir = path.join(getTempDir(), `keyrack-sso-${Date.now()}`);
  const tempConfigPath = path.join(tempDir, 'config');
  await fs.mkdir(tempDir, { recursive: true });

  // write minimal sso profile (account_id and role_name are optional since aws cli v2.5.1)
  const tempProfileName = 'keyrack-auth';
  const tempConfig = `[profile ${tempProfileName}]
sso_start_url = ${input.ssoStartUrl}
sso_region = ${input.ssoRegion}
`;
  await fs.writeFile(tempConfigPath, tempConfig, 'utf-8');

  try {
    // trigger sso login with temp config, capture output
    const output = execSync(`aws sso login --profile "${tempProfileName}"`, {
      encoding: 'utf-8',
      env: { ...process.env, AWS_CONFIG_FILE: tempConfigPath },
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    // parse and display clean summary
    const urlMatch = output.match(
      /open the following URL:\s*(https:\/\/[^\s]+)/,
    );
    const codeMatch = output.match(/enter the code:\s*([A-Z0-9-]+)/i);
    const successMatch = output.match(/Successfully logged into/);

    if (urlMatch && codeMatch) {
      console.log(`\n  🔗 ${urlMatch[1]}`);
      console.log(`  🔑 code: ${codeMatch[1]}\n`);
    }
    if (successMatch) {
      console.log('  ✓ authenticated\n');
    }
  } finally {
    // cleanup temp config
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

/**
 * .what = lists available aws accounts after sso auth
 * .why = lets user pick which account to configure
 */
export const listAwsSsoAccounts = (input: {
  ssoRegion: string;
}): Array<{ accountId: string; accountName: string; emailAddress: string }> => {
  // find the sso cache token
  const ssoCacheDir = path.join(os.homedir(), '.aws', 'sso', 'cache');
  let accessToken: string | null = null;

  try {
    const files = require('fs').readdirSync(ssoCacheDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const content = require('fs').readFileSync(
        path.join(ssoCacheDir, file),
        'utf-8',
      );
      const data = JSON.parse(content);
      if (data.accessToken && data.expiresAt) {
        const expiresAt = new Date(data.expiresAt);
        if (expiresAt > new Date()) {
          accessToken = data.accessToken;
          break;
        }
      }
    }
  } catch {
    throw new UnexpectedCodePathError(
      'could not find sso cache. run aws sso login first.',
    );
  }

  if (!accessToken) {
    throw new UnexpectedCodePathError(
      'no valid sso access token found. run aws sso login first.',
    );
  }

  // list accounts
  const result = execSync(
    `aws sso list-accounts --access-token "${accessToken}" --region "${input.ssoRegion}"`,
    { encoding: 'utf-8' },
  );

  const parsed = JSON.parse(result);
  return parsed.accountList.map(
    (a: { accountId: string; accountName: string; emailAddress: string }) => ({
      accountId: a.accountId,
      accountName: a.accountName,
      emailAddress: a.emailAddress,
    }),
  );
};

/**
 * .what = lists available roles for an aws account
 * .why = lets user pick which role to assume
 */
export const listAwsSsoRoles = (input: {
  ssoRegion: string;
  accountId: string;
}): Array<{ roleName: string }> => {
  // find the sso cache token
  const ssoCacheDir = path.join(os.homedir(), '.aws', 'sso', 'cache');
  let accessToken: string | null = null;

  try {
    const files = require('fs').readdirSync(ssoCacheDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const content = require('fs').readFileSync(
        path.join(ssoCacheDir, file),
        'utf-8',
      );
      const data = JSON.parse(content);
      if (data.accessToken && data.expiresAt) {
        const expiresAt = new Date(data.expiresAt);
        if (expiresAt > new Date()) {
          accessToken = data.accessToken;
          break;
        }
      }
    }
  } catch {
    throw new UnexpectedCodePathError(
      'could not find sso cache. run aws sso login first.',
    );
  }

  if (!accessToken) {
    throw new UnexpectedCodePathError(
      'no valid sso access token found. run aws sso login first.',
    );
  }

  // list roles
  const result = execSync(
    `aws sso list-account-roles --access-token "${accessToken}" --account-id "${input.accountId}" --region "${input.ssoRegion}"`,
    { encoding: 'utf-8' },
  );

  const parsed = JSON.parse(result);
  return parsed.roleList.map((r: { roleName: string }) => ({
    roleName: r.roleName,
  }));
};
