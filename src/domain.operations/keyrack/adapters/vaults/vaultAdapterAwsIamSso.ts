import { UnexpectedCodePathError } from 'helpful-errors';

import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import type { KeyrackHostVaultAdapter } from '../../../../domain.objects/keyrack';
import { setupAwsSsoWithGuide } from './setupAwsSsoWithGuide';

const execAsync = promisify(exec);

/**
 * .what = validate sso session for a profile via sts get-caller-identity
 * .why = checks if the profile's sso session is still valid
 *
 * .returns = true if session valid, false if expired or invalid
 */
const validateSsoSession = async (profileName: string): Promise<boolean> => {
  try {
    await execAsync(`aws sts get-caller-identity --profile "${profileName}"`);
    return true;
  } catch {
    // command failed = session expired or profile invalid
    return false;
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
          new UnexpectedCodePathError('aws sso login failed', {
            profileName,
            exitCode: code,
          }),
        );
      }
    });

    child.on('error', (error) => {
      reject(
        new UnexpectedCodePathError('aws sso login failed', {
          profileName,
          error,
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
export const vaultAdapterAwsIamSso: KeyrackHostVaultAdapter = {
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
    return validateSsoSession(profileName);
  },

  /**
   * .what = validate sso session and trigger login if expired
   * .why = ensures the profile has a valid session
   *
   * .note = passphrase is ignored (sso uses browser auth)
   * .note = uses exid (profile name) from the host manifest
   * .note = triggers aws sso login --profile for expired sessions
   * .note = uses portal flow (standard "Sign in" / "Allow" browser prompt)
   * .note = always silent - browser popup is the feedback, not cli noise
   */
  unlock: async (input: {
    passphrase?: string;
    silent?: boolean;
    exid?: string | null;
  }) => {
    const profileName = input.exid;
    if (!profileName) return;

    const isValid = await validateSsoSession(profileName);
    if (!isValid) {
      await triggerSsoLogin(profileName);
    }
  },

  /**
   * .what = return profile name from host manifest exid
   * .why = profile name is the "secret" for aws.iam.sso vault
   *
   * .note = exid is passed from the host manifest via the caller
   */
  get: async (input) => {
    return input.exid ?? null;
  },

  /**
   * .what = derive profile name for storage in host manifest
   * .why = derives profile name from secret, exid, or guided setup
   *
   * .note = the caller (setKeyrackKeyHost) persists the exid to the encrypted host manifest
   * .note = if secret is empty, falls back to exid; if both empty and stdin is TTY, runs guided setup
   * .note = expiresAt is ignored (sso tokens self-expire)
   */
  set: async (input) => {
    // derive profile name: from secret, exid, or guided setup
    let profileName = input.secret ?? input.exid ?? null;
    if (!profileName && process.stdin.isTTY) {
      const result = await setupAwsSsoWithGuide({ org: input.org });
      profileName = result.profileName;
    }
    if (!profileName) {
      throw new UnexpectedCodePathError(
        'aws.iam.sso set requires a profile name (--exid or guided setup)',
        { slug: input.slug },
      );
    }

    // validate the profile exists in aws config (fail-fast on typos or absent profiles)
    const profileValid = await validateSsoSession(profileName);
    if (!profileValid) {
      throw new UnexpectedCodePathError(
        `aws profile '${profileName}' is not valid or has no active sso session. check ~/.aws/config for the profile name.`,
        { slug: input.slug, profileName },
      );
    }

    // extended roundtrip validation for guided setup (interactive TTY)
    // proves unlock + get + relock work; triggers one-time OAuth registration
    const cameFromGuide = !input.secret && !input.exid;
    if (cameFromGuide) {
      console.log('   │');
      console.log('   └─ perfect, now lets verify...');

      // 1. unlock — prove sso session is valid after setup
      await vaultAdapterAwsIamSso.unlock({
        exid: profileName,
      });
      console.log('      ├─ ✓ unlock');

      // 2. get — prove stored profile name matches
      const profileRead = await vaultAdapterAwsIamSso.get({
        slug: input.slug,
        exid: profileName,
      });
      if (profileRead !== profileName) {
        throw new UnexpectedCodePathError(
          'roundtrip failed: get returned different profile',
          { slug: input.slug, expected: profileName, actual: profileRead },
        );
      }
      console.log('      ├─ ✓ get');

      // 3. relock — clear session, leave vault locked after setup
      await vaultAdapterAwsIamSso.relock?.({
        slug: input.slug,
        exid: profileName,
      });
      console.log('      └─ ✓ relock');
    }

    // return derived exid so caller can persist it to the host manifest
    return { exid: profileName };
  },

  /**
   * .what = no-op for aws.iam.sso
   * .why = profile names live in the encrypted host manifest, not a separate store
   */
  del: async () => {
    // no-op — host manifest handles deletion
  },

  /**
   * .what = clear aws sso cached credentials for a profile
   * .why = enables true relock by clearing sso token and cli credential caches
   *
   * .note = uses exid (profile name) from the host manifest
   * .note = uses `aws sso logout --profile` to clear caches
   */
  relock: async (input) => {
    const profileName = input.exid;
    if (!profileName) return;

    // aws sso logout clears both cache locations
    try {
      await execAsync(`aws sso logout --profile "${profileName}"`);
    } catch {
      // logout may fail if already logged out — that's fine
    }
  },
};
