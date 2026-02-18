import { UnexpectedCodePathError } from 'helpful-errors';

import { exec, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import type { KeyrackHostVaultAdapter } from '../../../../domain.objects/keyrack';

const execAsync = promisify(exec);

/**
 * .what = entry stored in aws.iam.sso vault
 * .why = stores profile name with metadata
 */
interface SsoStoreEntry {
  profileName: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * .what = store format
 * .why = maps slug to entry
 */
type SsoStore = Record<string, SsoStoreEntry>;

/**
 * .what = resolves the home directory
 * .why = uses HOME env var to support test isolation
 *
 * .note = os.homedir() caches at module load; we read process.env.HOME directly
 */
const getHomeDir = (): string => {
  const home = process.env.HOME;
  if (!home) throw new UnexpectedCodePathError('HOME not set', {});
  return home;
};

/**
 * .what = path to the sso profile store
 * .why = stores profiles in ~/.rhachet/keyrack.aws-iam-sso.json
 */
const getSsoStorePath = (): string => {
  const home = getHomeDir();
  return join(home, '.rhachet', 'keyrack.aws-iam-sso.json');
};

/**
 * .what = reads the sso store from disk
 * .why = loads the profile name store
 */
const readSsoStore = (): SsoStore => {
  const path = getSsoStorePath();
  if (!existsSync(path)) return {};
  const content = readFileSync(path, 'utf8');
  return JSON.parse(content) as SsoStore;
};

/**
 * .what = writes the sso store to disk
 * .why = persists the profile name store
 */
const writeSsoStore = (store: SsoStore): void => {
  const path = getSsoStorePath();
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(store, null, 2), 'utf8');
};

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
  return new Promise((resolve, reject) => {
    const child = spawn('aws', ['sso', 'login', '--profile', profileName], {
      stdio: 'pipe',
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
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
 * .what = vault adapter for aws sso profile storage
 * .why = stores profile names (not secrets) and handles sso unlock flow
 *
 * .note = stores at ~/.rhachet/keyrack.aws-iam-sso.json
 * .note = unlock validates sso sessions, triggers login for expired
 * .note = profile names are 'reference' protection (no secrets touch keyrack)
 */
export const vaultAdapterAwsIamSso: KeyrackHostVaultAdapter = {
  /**
   * .what = check if all stored sso sessions are valid
   * .why = validates via aws sts get-caller-identity for each profile
   *
   * .note = returns true if all profiles have valid sessions
   * .note = returns true if no profiles are stored (empty store = unlocked)
   */
  isUnlocked: async () => {
    const store = readSsoStore();
    const entries = Object.values(store);

    // no profiles stored = empty store = unlocked
    if (entries.length === 0) return true;

    // validate all profiles
    for (const entry of entries) {
      const isValid = await validateSsoSession(entry.profileName);
      if (!isValid) return false;
    }

    return true;
  },

  /**
   * .what = validate sso sessions and trigger login for expired
   * .why = ensures all stored profiles have valid sessions
   *
   * .note = passphrase is ignored (sso uses browser auth)
   * .note = triggers aws sso login --profile for each expired profile
   * .note = uses portal flow (standard "Sign in" / "Allow" browser prompt)
   * .note = always silent - browser popup is the feedback, not cli noise
   */
  unlock: async (_input: { passphrase?: string; silent?: boolean }) => {
    const store = readSsoStore();
    const entries = Object.values(store);

    // track which profiles we've refreshed (avoid duplicate logins for shared sso-session)
    const refreshedProfiles = new Set<string>();

    // validate and refresh each profile
    for (const entry of entries) {
      // skip if we already refreshed this profile
      if (refreshedProfiles.has(entry.profileName)) continue;

      const isValid = await validateSsoSession(entry.profileName);
      if (!isValid) {
        // trigger login for the profile (portal flow)
        await triggerSsoLogin(entry.profileName);
        refreshedProfiles.add(entry.profileName);
      }
    }
  },

  /**
   * .what = read profile name from storage file
   * .why = returns the aws profile name for a given slug
   *
   * .note = slug is env-scoped (e.g., 'acme.prod.AWS_PROFILE')
   */
  get: async (input) => {
    const store = readSsoStore();
    const entry = store[input.slug];

    // not found
    if (!entry) return null;

    return entry.profileName;
  },

  /**
   * .what = write profile name to storage file
   * .why = stores the aws profile name for a given slug
   *
   * .note = slug is env-scoped (e.g., 'acme.prod.AWS_PROFILE')
   * .note = value is the aws profile name (e.g., 'acme-prod')
   * .note = expiresAt is ignored (sso tokens self-expire)
   */
  set: async (input) => {
    const store = readSsoStore();
    const now = new Date().toISOString();

    const entryFound = store[input.slug];
    if (entryFound) {
      // update found entry
      entryFound.profileName = input.value;
      entryFound.updatedAt = now;
    } else {
      // create new entry
      store[input.slug] = {
        profileName: input.value,
        createdAt: now,
        updatedAt: now,
      };
    }

    writeSsoStore(store);
  },

  /**
   * .what = remove profile from storage file
   * .why = deletes the aws profile name for a given slug
   */
  del: async (input) => {
    const store = readSsoStore();
    delete store[input.slug];
    writeSsoStore(store);
  },

  /**
   * .what = clear aws sso cached credentials for a profile
   * .why = enables true relock by clearing both sso token and cli credential caches
   *
   * .note = uses `aws sso logout --profile` to clear caches
   * .note = clears ~/.aws/sso/cache (sso tokens) and ~/.aws/cli/cache (credentials)
   */
  relock: async (input) => {
    const store = readSsoStore();
    const entry = store[input.slug];

    // entry not found = no profile to relock
    if (!entry) return;

    // aws sso logout clears both cache locations
    try {
      await execAsync(`aws sso logout --profile "${entry.profileName}"`);
    } catch {
      // logout may fail if already logged out — that's fine
    }
  },
};
