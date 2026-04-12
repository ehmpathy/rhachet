import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { vaultAdapterAwsConfig } from './vaultAdapterAwsConfig';

/**
 * .note = no mocks used — tests real aws cli behavior (conditional on cli availability)
 * .note = tests fail-fast with ConstraintError when aws cli not installed
 * .note = no snapshot coverage because aws.config adapter is internal vault contract, not user-faced
 *
 * .limitation = aws sso browser auth cannot be automated:
 *   - `aws sso login` opens browser
 *   - human must navigate to aws sso portal
 *   - human must approve login request
 *   - browser callback completes auth
 *
 * .coverage = unit tests in vaultAdapterAwsConfig.test.ts provide full
 *   coverage via mocked execSync. these integration tests verify real
 *   cli behavior for operations that do not require browser auth.
 */

/**
 * .what = check if aws cli is installed
 * .why = skip tests gracefully when cli unavailable
 */
const isAwsCliInstalled = (): boolean => {
  try {
    execSync('which aws', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
};

/**
 * .what = check if ~/.aws/config exists
 * .why = some tests need a config file to exist
 */
const hasAwsConfig = (): boolean => {
  const configPath = join(homedir(), '.aws', 'config');
  return existsSync(configPath);
};

/**
 * .what = find any profile name from ~/.aws/config
 * .why = need a real profile name for validation tests
 */
const findAnyProfileName = (): string | null => {
  const configPath = join(homedir(), '.aws', 'config');
  if (!existsSync(configPath)) return null;

  const content = readFileSync(configPath, 'utf-8');
  // match [profile name] or [default]
  const match = content.match(/\[profile\s+([^\]]+)\]|\[(default)\]/);
  if (match) {
    return match[1] ?? match[2] ?? null;
  }
  return null;
};

describe('vaultAdapterAwsConfig', () => {
  let awsCliAvailable: boolean;

  beforeAll(() => {
    awsCliAvailable = isAwsCliInstalled();
  });

  given('[case1] get requires exid', () => {
    when('[t0] get called without exid', () => {
      then('returns null', async () => {
        // get without exid returns null — profile name is required
        const result = await vaultAdapterAwsConfig.get!({ slug: 'TEST_KEY' });
        expect(result).toBeNull();
      });
    });

    when('[t1] get called with exid but without mech', () => {
      then('returns the exid as source', async () => {
        // without mech, get returns the profile name as-is
        const result = await vaultAdapterAwsConfig.get!({
          slug: 'TEST_KEY',
          exid: 'my-profile',
        });
        expect(result).toBe('my-profile');
      });
    });
  });

  given('[case2] del is a noop (manifest handles deletion)', () => {
    when('[t0] del called', () => {
      then('completes without error', async () => {
        // aws.config del is noop — profile references live in host manifest
        // keyrack removes manifest entry; actual aws profile remains
        await expect(
          vaultAdapterAwsConfig.del({ slug: 'TEST_KEY' }),
        ).resolves.toBeUndefined();
      });
    });
  });

  given('[case3] unlock/relock without exid are noops', () => {
    when('[t0] unlock called without exid', () => {
      then('completes without error', async () => {
        // unlock without exid = no profile to check = noop
        await expect(
          vaultAdapterAwsConfig.unlock({ identity: null }),
        ).resolves.toBeUndefined();
      });
    });

    when('[t1] relock called without exid', () => {
      then('completes without error', async () => {
        // relock without exid = no profile to logout = noop
        await expect(
          vaultAdapterAwsConfig.relock?.({ slug: 'TEST_KEY' }),
        ).resolves.toBeUndefined();
      });
    });
  });

  given('[case4] isUnlocked with no exid returns true', () => {
    when('[t0] isUnlocked called without exid', () => {
      then('returns true (no profile = unlocked)', async () => {
        // no exid means no profile to check session for
        const result = await vaultAdapterAwsConfig.isUnlocked();
        expect(result).toBe(true);
      });
    });
  });

  given('[case5] isUnlocked with nonexistent profile', () => {
    when('[t0] isUnlocked called with fake profile', () => {
      then('returns false', async () => {
        if (!awsCliAvailable) {
          throw new ConstraintError('aws cli not installed', {
            hint: 'install aws cli: brew install awscli',
          });
        }
        if (!hasAwsConfig()) {
          throw new ConstraintError('~/.aws/config not found', {
            hint: 'configure aws cli: aws configure sso',
          });
        }

        // a profile that definitely does not exist
        const result = await vaultAdapterAwsConfig.isUnlocked({
          exid: 'definitely-nonexistent-profile-xyz-123',
        });
        expect(result).toBe(false);
      });
    });
  });

  given('[case6] real profile validation (conditional)', () => {
    when('[t0] get with real profile name (no mech)', () => {
      then('returns the profile name', async () => {
        if (!awsCliAvailable) {
          throw new ConstraintError('aws cli not installed', {
            hint: 'install aws cli: brew install awscli',
          });
        }
        if (!hasAwsConfig()) {
          throw new ConstraintError('~/.aws/config not found', {
            hint: 'configure aws cli: aws configure sso',
          });
        }

        const profileName = findAnyProfileName();
        if (!profileName) {
          throw new ConstraintError('no profiles found in ~/.aws/config', {
            hint: 'add a profile: aws configure sso',
          });
        }

        // get returns the profile name when no mech is supplied
        const result = await vaultAdapterAwsConfig.get!({
          slug: 'TEST_KEY',
          exid: profileName,
        });
        expect(result).toBe(profileName);
      });
    });
  });

  /**
   * .note = browser auth tests cannot be automated:
   *   - unlock with expired session triggers browser popup
   *   - set via guided setup requires human to complete oauth flow
   *   - these operations are tested manually:
   *
   *     $ rhx keyrack set --key AWS_PROFILE --env test --vault aws.config
   *     - expect: guided setup prompts for region/account/role
   *     - expect: browser opens for oauth registration (one-time)
   *     - expect: roundtrip verification (unlock → get → relock)
   *
   *     $ rhx keyrack relock --env test && rhx keyrack unlock --env test
   *     - expect: browser opens for portal flow
   *     - expect: session becomes valid
   */
});
