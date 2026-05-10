import { ConstraintError, UnexpectedCodePathError } from 'helpful-errors';

import type {
  KeyrackGrantMechanism,
  KeyrackGrantMechanismAdapter,
  KeyrackHostVaultAdapter,
} from '@src/domain.objects/keyrack';
import { KeyrackKeyGrant } from '@src/domain.objects/keyrack';
import { mechAdapterAwsSso } from '@src/domain.operations/keyrack/adapters/mechanisms/aws.sso/mechAdapterAwsSso';
import { getAwsSsoProfileConfig } from '@src/domain.operations/keyrack/adapters/mechanisms/aws.sso/setupAwsSsoProfile';
import { asKeyrackSlugParts } from '@src/domain.operations/keyrack/asKeyrackSlugParts';
import { inferKeyGrade } from '@src/domain.operations/keyrack/grades/inferKeyGrade';
import { inferKeyrackMechForSet } from '@src/domain.operations/keyrack/inferKeyrackMechForSet';

import { exec, spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { clearAwsSsoCacheForDomain } from './clearAwsSsoCacheForDomain';
import { previewAwsSsoCacheForDomain } from './previewAwsSsoCacheForDomain';

/**
 * .what = lookup mech adapter by mechanism name
 * .why = vault needs to call mech.deliverForGet for secret transformation
 */
const getMechAdapter = (
  mech: KeyrackGrantMechanism,
): KeyrackGrantMechanismAdapter => {
  const adapters: Partial<
    Record<KeyrackGrantMechanism, KeyrackGrantMechanismAdapter>
  > = {
    EPHEMERAL_VIA_AWS_SSO: mechAdapterAwsSso,
  };

  const adapter = adapters[mech];
  if (!adapter) {
    throw new UnexpectedCodePathError(`no adapter for mech: ${mech}`, { mech });
  }
  return adapter;
};

const execAsync = promisify(exec);

/**
 * .what = check if a profile exists in ~/.aws/config
 * .why = fail-fast on typos for --exid case (no active session required)
 *
 * .returns = true if profile section exists in config file
 */
const checkProfileExists = (profileName: string): boolean => {
  const configPath = join(homedir(), '.aws', 'config');
  if (!existsSync(configPath)) return false;
  const content = readFileSync(configPath, 'utf-8');
  // match either [profile name] or [name] (default profile)
  const profilePattern = new RegExp(
    `^\\[profile\\s+${profileName}\\]|^\\[${profileName}\\]`,
    'm',
  );
  return profilePattern.test(content);
};

/**
 * .what = validate sso session for a profile and extract username
 * .why = checks if the profile's sso session is still valid
 *
 * .note = uses `aws configure export-credentials` as primary validator
 *         because it forces credential refresh and validates both SSO and STS in one call
 *         (aws-cli issue #9845 shows get-caller-identity lies via cached credentials)
 *
 * .note = uses `aws sts get-caller-identity` only for username extraction
 *
 * .returns = { valid: true, username } if session valid, { valid: false } if expired or invalid
 */
const validateSsoSession = async (
  profileName: string,
): Promise<{ valid: true; username: string } | { valid: false }> => {
  // validate via export-credentials — forces refresh, validates both SSO and STS
  // .note = if SSO token is expired, this command fails (can't refresh STS without valid SSO)
  // .note = if SSO is valid but STS cache is stale, this command refreshes it
  try {
    await execAsync(
      `aws configure export-credentials --profile "${profileName}" --format env-no-export`,
    );
    // success = credentials are valid and refreshed
  } catch (error) {
    // export-credentials failed = session is not usable
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    const isExpiredError =
      message.includes('expired') ||
      message.includes('invalid') ||
      message.includes('unauthorized') ||
      message.includes('does not exist') ||
      message.includes('refreshed credentials are still expired');

    if (isExpiredError) return { valid: false };

    // unknown error - fail fast
    throw new UnexpectedCodePathError(
      'aws configure export-credentials failed with unexpected error',
      { profileName, error },
    );
  }

  // sts call — only runs if export-credentials passed (credentials are valid)
  // .note = only needed for username extraction, not validation
  try {
    const { stdout } = await execAsync(
      `aws sts get-caller-identity --profile "${profileName}"`,
    );
    // parse username from ARN: arn:aws:sts::123456789012:assumed-role/RoleName/username@domain
    const identity = JSON.parse(stdout) as { Arn: string };
    const arnParts = identity.Arn.split('/');
    const username = arnParts[arnParts.length - 1] ?? 'unknown';
    return { valid: true, username };
  } catch (error) {
    // rethrow our own error types (code defects, invalid requests)
    if (error instanceof UnexpectedCodePathError) throw error;
    if (error instanceof ConstraintError) throw error;

    // allow expected errors: command failed = session expired or profile invalid
    // .note = aws cli exits non-zero for expired sessions and invalid profiles
    if (error instanceof Error && 'code' in error) return { valid: false };
    throw error;
  }
};

/**
 * .what = trigger sso login for a profile via portal flow
 * .why = refreshes the sso session via browser auth
 *
 * .note = uses --profile flag for portal flow (standard "Sign in" / "Allow")
 * .note = portal flow is the same experience as direct visit to aws sso portal
 * .note = always silent (pipe) - browser popup is the feedback, not cli noise
 */
const triggerSsoLogin = async (profileName: string): Promise<void> => {
  return new Promise((accept, reject) => {
    const child = spawn('aws', ['sso', 'login', '--profile', profileName], {
      stdio: 'pipe',
    });

    child.on('close', (code) => {
      if (code === 0) {
        accept();
      } else {
        reject(
          new ConstraintError('aws sso login failed', {
            profileName,
            exitCode: code,
            hint: 'complete browser auth to continue',
          }),
        );
      }
    });

    child.on('error', (error) => {
      reject(
        new ConstraintError('aws sso login failed', {
          profileName,
          error,
          hint: 'ensure aws cli is installed',
        }),
      );
    });
  });
};

/**
 * .what = vault adapter for aws sso profile references
 * .why = handles sso unlock/relock flow; profile names stored as exid in host manifest
 *
 * .note = no separate storage file — exid from the encrypted host manifest is the source of truth
 * .note = unlock validates sso sessions, triggers login for expired
 * .note = profile names are 'reference' protection (no secrets touch keyrack)
 */
export const vaultAdapterAwsConfig: KeyrackHostVaultAdapter<'readwrite'> = {
  mechs: {
    supported: ['EPHEMERAL_VIA_AWS_SSO'],
  },

  /**
   * .what = check if sso session is valid for the given profile
   * .why = validates via aws sts get-caller-identity
   *
   * .note = uses exid (profile name) from the host manifest
   * .note = returns true if no exid provided (no profile = unlocked)
   */
  isUnlocked: async (input) => {
    const profileName = input?.exid;
    if (!profileName) return true;
    const result = await validateSsoSession(profileName);
    return result.valid;
  },

  /**
   * .what = validate sso session and trigger login if expired
   * .why = ensures the profile has a valid session
   *
   * .note = passphrase is ignored (sso uses browser auth)
   * .note = uses exid (profile name) from the host manifest
   * .note = triggers aws sso login --profile for expired sessions
   * .note = uses portal flow (standard "Sign in" / "Allow" browser prompt)
   * .note = clears cached session if identity mismatch (access denied to this role)
   */
  unlock: async (input: {
    identity: string | null;
    silent?: boolean;
    exid?: string | null;
  }) => {
    const profileName = input.exid;
    if (!profileName) return;

    const sessionResult = await validateSsoSession(profileName);
    if (sessionResult.valid) {
      // session is valid — show confirmation and reuse
      if (!input.silent) {
        console.log('   │');
        console.log('   ├─ with sso prior?');
        console.log(`   │  ├─ ✓ ${sessionResult.username}, access confirmed`);
        console.log('   │  └─ ✓ clear, will reuse');
      }
      return;
    }

    // session invalid — check if we need to clear a conflicted session
    const profileConfig = await getAwsSsoProfileConfig({ profileName });
    if (profileConfig?.ssoStartUrl) {
      const priorSession = previewAwsSsoCacheForDomain({
        ssoStartUrl: profileConfig.ssoStartUrl,
      });

      // if there's a cached session for this domain, but we can't access the role,
      // the session belongs to a different sso user — clear it
      if (priorSession.matched.length > 0) {
        if (!input.silent) {
          console.log('   │');
          console.log('   ├─ with sso prior?');
          const session = priorSession.matched[0]!;
          console.log(`   │  ├─ ✗ ${session.startUrl}, access denied`);
          // todo: show username from failed session once we track it
        }

        await clearAwsSsoCacheForDomain({
          ssoStartUrl: profileConfig.ssoStartUrl,
        });

        if (!input.silent) {
          console.log('   │  └─ ✓ cleared, will re-auth');
        }
      } else if (!input.silent) {
        // no cached session for this domain — need fresh auth
        console.log('   │');
        console.log('   ├─ with sso prior?');
        console.log('   │  └─ ✓ clear, no prior session');
      }
    }

    await triggerSsoLogin(profileName);

    // force STS credential refresh after SSO login
    // .note = aws sso login refreshes SSO token but not STS cache
    // .note = export-credentials forces botocore to fetch fresh STS creds
    try {
      await execAsync(
        `aws configure export-credentials --profile "${profileName}" --format env-no-export`,
      );
    } catch (error) {
      // if export-credentials still fails after fresh SSO login, clear the CLI cache and retry
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      const isStillExpired = message.includes('expired');

      if (isStillExpired) {
        // clear stale STS cache for this profile
        const cliCacheDir = join(homedir(), '.aws', 'cli', 'cache');
        if (existsSync(cliCacheDir)) {
          const cacheFiles = readdirSync(cliCacheDir);
          for (const file of cacheFiles) {
            // cache files are named with profile hash, remove all to be safe
            unlinkSync(join(cliCacheDir, file));
          }
        }

        // retry export-credentials after cache clear
        await execAsync(
          `aws configure export-credentials --profile "${profileName}" --format env-no-export`,
        );
      } else {
        throw error;
      }
    }
  },

  /**
   * .what = retrieve credential from aws.config vault
   * .why = profile name stored as exid; AWS SDK resolves credentials at usage time
   *
   * .note = returns profile name as secret, not credentials
   * .note = validates sso session is active (triggers browser login if expired)
   * .note = AWS SDK resolves actual credentials from profile when used
   */
  get: async (input) => {
    const source = input.exid ?? null;
    if (!source) return null;

    const mech = input.mech ?? 'EPHEMERAL_VIA_AWS_SSO';

    // get expiration time from mech adapter
    // .note = sso session validation happens in unlock, not here
    const mechAdapter = getMechAdapter(mech);
    const { expiresAt } = await mechAdapter.deliverForGet({ source });

    // compute grade from vault + mech
    const grade = inferKeyGrade({ vault: 'aws.config', mech });

    // extract env/org from slug
    const { env, org } = asKeyrackSlugParts({ slug: input.slug });

    // return profile name as secret — AWS SDK resolves credentials from profile
    return new KeyrackKeyGrant({
      slug: input.slug,
      key: { secret: source, grade },
      source: { vault: 'aws.config', mech },
      env,
      org,
      expiresAt,
    });
  },

  /**
   * .what = derive profile name for storage in host manifest
   * .why = derives profile name from exid or guided setup
   *
   * .note = the caller (setKeyrackKeyHost) persists the exid to the encrypted host manifest
   * .note = vault handles its own input: uses exid if present, else runs guided setup
   * .note = expiresAt is ignored (sso tokens self-expire)
   */
  set: async (input) => {
    // infer mech if not supplied
    const mech =
      input.mech ??
      (await inferKeyrackMechForSet({ vault: vaultAdapterAwsConfig }));

    // check mech compat (aws.config only supports aws sso mech)
    if (!vaultAdapterAwsConfig.mechs.supported.includes(mech)) {
      throw new ConstraintError(`aws.config does not support mech: ${mech}`, {
        mech,
        supported: vaultAdapterAwsConfig.mechs.supported,
        hint: 'aws.config is for aws sso only; try --vault os.secure for other mechs',
      });
    }

    // derive profile name: from exid or guided setup via mech adapter
    let profileName = input.exid ?? null;
    if (!profileName && process.stdin.isTTY) {
      const mechAdapter = getMechAdapter(mech);
      const result = await mechAdapter.acquireForSet({
        keySlug: input.slug,
      });
      profileName = result.source;
    }
    if (!profileName) {
      throw new ConstraintError(
        'aws.config set requires a profile name (--exid or guided setup)',
        {
          slug: input.slug,
          hint: 'provide --exid or run in tty for guided setup',
        },
      );
    }

    // validate the profile exists in aws config (fail-fast on typos for --exid case)
    // .note = --exid case checks profile exists in config file
    // .note = guided setup skips validation here — roundtrip verification below proves it works
    if (input.exid) {
      const profileExists = checkProfileExists(profileName);
      if (!profileExists) {
        throw new ConstraintError(
          `aws profile '${profileName}' not found in ~/.aws/config`,
          { slug: input.slug, profileName, hint: 'check the profile name' },
        );
      }
    }

    // extended roundtrip validation for guided setup (interactive TTY)
    // proves unlock + get + relock work; triggers one-time OAuth registration
    if (!input.exid) {
      console.log('   │');
      console.log('   └─ perfect, now lets verify...');

      // 1. unlock — prove sso session is valid after setup
      // .note = silent because we just did SSO login, no need to show prior check again
      await vaultAdapterAwsConfig.unlock({
        identity: null,
        exid: profileName,
        silent: true,
      });
      console.log('      ├─ ✓ unlock');

      // 2. get — prove stored profile name matches
      const grantRead = await vaultAdapterAwsConfig.get({
        slug: input.slug,
        exid: profileName,
      });
      if (!grantRead || grantRead.key.secret !== profileName) {
        throw new UnexpectedCodePathError(
          'roundtrip failed: get returned different profile',
          {
            slug: input.slug,
            expected: profileName,
            actual: grantRead?.key.secret ?? null,
          },
        );
      }
      console.log('      ├─ ✓ get');

      // 3. relock — clear session, leave vault locked after setup
      await vaultAdapterAwsConfig.relock?.({
        slug: input.slug,
        exid: profileName,
      });
      console.log('      └─ ✓ relock');
      console.log('');
    }

    // return mech and derived exid so caller can persist to the host manifest
    return { mech, exid: profileName };
  },

  /**
   * .what = no-op for aws.config
   * .why = profile names live in the encrypted host manifest, not a separate store
   */
  del: async () => {
    // no-op — host manifest handles deletion
  },

  /**
   * .what = clear aws sso cached credentials for a profile
   * .why = enables true relock; clears sso token and cli credential caches
   *
   * .note = uses exid (profile name) from the host manifest
   * .note = uses targeted cache deletion to preserve other domains
   */
  relock: async (input) => {
    const profileName = input.exid;
    if (!profileName) return;

    // get the sso start url for this profile
    const profileConfig = await getAwsSsoProfileConfig({ profileName });
    if (!profileConfig?.ssoStartUrl) return;

    // clear cache for this domain only (preserves other domains)
    await clearAwsSsoCacheForDomain({ ssoStartUrl: profileConfig.ssoStartUrl });
  },
};
