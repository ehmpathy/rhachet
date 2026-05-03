import { execSync, spawn } from 'child_process';
import fs from 'fs/promises';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import os from 'os';
import path from 'path';

import { getTempDir } from '@src/infra/getTempDir';

// re-export extracted operations
export {
  listAwsSsoAccounts,
  listAwsSsoRoles,
  logoutAwsSsoSession,
} from './setupAwsSsoProfile/index';

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

  // trigger sso login to validate (suppress output — guide already showed auth info)
  try {
    execSync(`aws sso login --profile "${input.profileName}"`, {
      stdio: 'pipe',
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
  Array<{ ssoStartUrl: string; ssoRegion: string; profileNames: string[] }>
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

  // track profiles per url
  const urlToProfiles = new Map<
    string,
    { ssoRegion: string; profileNames: string[] }
  >();

  // helper to add profile for url
  const addProfile = (
    ssoStartUrl: string,
    ssoRegion: string,
    profileName: string,
  ) => {
    const extant = urlToProfiles.get(ssoStartUrl);
    if (extant) {
      extant.profileNames.push(profileName);
    } else {
      urlToProfiles.set(ssoStartUrl, { ssoRegion, profileNames: [profileName] });
    }
  };

  // build sso-session to url mapping for v2 format
  const sessionToUrl = new Map<string, { ssoStartUrl: string; ssoRegion: string }>();
  const sessionRegex = /\[sso-session\s+([^\]]+)\]([^[]*)/g;
  for (const match of configContent.matchAll(sessionRegex)) {
    const sessionName = match[1]?.trim() ?? '';
    const section = match[2] ?? '';
    const urlMatch = section.match(/sso_start_url\s*=\s*(.+)/);
    const regionMatch = section.match(/sso_region\s*=\s*(.+)/);
    if (urlMatch && regionMatch) {
      sessionToUrl.set(sessionName, {
        ssoStartUrl: urlMatch[1]!.trim(),
        ssoRegion: regionMatch[1]!.trim(),
      });
    }
  }

  // parse profiles
  const profileRegex = /\[profile\s+([^\]]+)\]([^[]*)/g;
  for (const match of configContent.matchAll(profileRegex)) {
    const profileName = match[1]?.trim() ?? '';
    const section = match[2] ?? '';

    // v1 format: inline sso_start_url
    const urlMatch = section.match(/sso_start_url\s*=\s*(.+)/);
    const regionMatch = section.match(/sso_region\s*=\s*(.+)/);
    if (urlMatch && regionMatch) {
      addProfile(urlMatch[1]!.trim(), regionMatch[1]!.trim(), profileName);
      continue;
    }

    // v2 format: sso_session reference
    const sessionMatch = section.match(/sso_session\s*=\s*(.+)/);
    if (sessionMatch) {
      const sessionName = sessionMatch[1]!.trim();
      const sessionInfo = sessionToUrl.get(sessionName);
      if (sessionInfo) {
        addProfile(sessionInfo.ssoStartUrl, sessionInfo.ssoRegion, profileName);
      }
    }
  }

  // include sso-session URLs that have no profiles yet (initial setup case)
  for (const [_sessionName, sessionInfo] of sessionToUrl) {
    if (!urlToProfiles.has(sessionInfo.ssoStartUrl)) {
      urlToProfiles.set(sessionInfo.ssoStartUrl, {
        ssoRegion: sessionInfo.ssoRegion,
        profileNames: [],
      });
    }
  }

  // convert map to array
  return Array.from(urlToProfiles.entries()).map(([ssoStartUrl, info]) => ({
    ssoStartUrl,
    ssoRegion: info.ssoRegion,
    profileNames: info.profileNames,
  }));
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

  // write v2 format sso profile (sso-session block) to match what setupAwsSsoProfile creates
  // .note = must include sso_registration_scopes so cached token matches final profile
  const tempProfileName = 'keyrack-auth';
  const tempConfig = `[profile ${tempProfileName}]
sso_session = ${tempProfileName}

[sso-session ${tempProfileName}]
sso_start_url = ${input.ssoStartUrl}
sso_region = ${input.ssoRegion}
sso_registration_scopes = sso:account:access
`;
  await fs.writeFile(tempConfigPath, tempConfig, 'utf-8');

  try {
    // trigger sso login with temp config, stream output for real-time feedback
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        'aws',
        ['sso', 'login', '--profile', tempProfileName],
        {
          env: { ...process.env, AWS_CONFIG_FILE: tempConfigPath },
          stdio: ['inherit', 'pipe', 'pipe'],
        },
      );

      let outputBuffer = '';
      let urlShown = false;

      const processOutput = (data: Buffer) => {
        outputBuffer += data.toString();

        // show url and code immediately when detected (before auth completes)
        if (!urlShown) {
          const urlMatch = outputBuffer.match(
            /open the following URL:\s*(https:\/\/[^\s]+)/,
          );
          const codeMatch = outputBuffer.match(
            /enter the code:\s*([A-Z0-9-]+)/i,
          );

          if (urlMatch && codeMatch) {
            console.log('   │  ├─ authorize in browser');
            console.log(`   │  │  ├─ 🔗 ${urlMatch[1]}`);
            console.log(`   │  │  └─ 🔑 ${codeMatch[1]}`);
            urlShown = true;
          }
        }
      };

      child.stdout?.on('data', processOutput);
      child.stderr?.on('data', processOutput);

      child.on('close', (code) => {
        // show success after auth completes
        const successMatch = outputBuffer.match(/Successfully logged into/);
        if (successMatch) {
          console.log('   │  └─ ✓ authenticated');
        }

        if (code === 0) {
          resolve();
        } else {
          reject(
            new UnexpectedCodePathError('aws sso login failed', {
              code,
              output: outputBuffer,
            }),
          );
        }
      });

      child.on('error', reject);
    });
  } finally {
    // cleanup temp config
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};
