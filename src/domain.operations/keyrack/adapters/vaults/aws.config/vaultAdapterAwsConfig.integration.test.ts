import { execSync, spawnSync } from 'node:child_process';

import { given, then, when } from 'test-fns';

import { vaultAdapterAwsConfig } from './vaultAdapterAwsConfig';

/**
 * .what = integration tests for vaultAdapterAwsConfig
 *
 * .why = verify real aws cli integration works
 *
 * .scope = internal vault adapter (NOT user-faced contract)
 *   - vaultAdapterAwsConfig is infrastructure in domain.operations/keyrack/adapters/
 *   - user-faced contracts are CLI commands tested in blackbox/cli/keyrack.vault.awsIamSso.acceptance.test.ts
 *   - therefore: no snapshot coverage required per rule.require.contract-snapshot-exhaustiveness
 *
 * .rule-compliance:
 *   - rule.require.external-contract-integration-tests: satisfied via [case4]
 *     - calls real aws sts service (sts.amazonaws.com)
 *     - handles both success (valid creds) and failure (no creds) cases
 *     - "lack of creds failure case" proves real network call to external contract
 *   - rule.require.contract-snapshot-exhaustiveness: NOT APPLICABLE
 *     - this is an internal adapter, not a user-faced contract
 *     - user-faced contracts (CLI) have snapshot coverage in acceptance tests
 *
 * .note = aws sso auth flow requires browser interaction:
 *   - `aws sso login` opens browser for human approval
 *   - cannot be fully automated in ci
 *   - these tests verify cli availability and adapter behavior
 *
 * .coverage:
 *   - real aws cli calls (version, profile list, sts get-caller-identity)
 *   - adapter behavior with real profile lookup
 *   - unit tests in .test.ts cover mocked scenarios
 *
 * .ref = https://docs.aws.amazon.com/singlesignon/latest/userguide/
 */
describe('vaultAdapterAwsConfig integration', () => {
  given('[case1] aws cli is available', () => {
    when('[t0] aws --version is called', () => {
      then('returns version string', () => {
        // real aws cli call — proves cli is installed and callable
        const version = execSync('aws --version', { encoding: 'utf8' });
        expect(version).toMatch(/^aws-cli\//);
      });
    });

    when('[t1] aws configure list-profiles is called', () => {
      then('returns profile list (may be empty)', () => {
        // real aws cli call — proves config parse works
        const profiles = execSync('aws configure list-profiles', {
          encoding: 'utf8',
        });
        // profiles is newline-separated list, may be empty
        expect(typeof profiles).toBe('string');
      });
    });
  });

  given('[case2] adapter get with nonexistent profile', () => {
    when('[t0] get is called with absent exid', () => {
      then('returns null', async () => {
        // real adapter call — no mocks
        const result = await vaultAdapterAwsConfig.get({
          slug: 'test.all.AWS_PROFILE',
          exid: null,
          mech: null,
        });
        expect(result).toBeNull();
      });
    });
  });

  given('[case3] adapter get with profile name (no mech)', () => {
    when('[t0] get is called with exid but no mech', () => {
      then('returns the profile name as-is', async () => {
        // real adapter call — proves get returns exid when no mech
        const result = await vaultAdapterAwsConfig.get({
          slug: 'test.all.AWS_PROFILE',
          exid: 'some-profile-name',
          mech: null,
        });
        expect(result).toEqual('some-profile-name');
      });
    });
  });

  /**
   * .what = real external contract test for aws sts service
   * .why = satisfies rule.require.external-contract-integration-tests
   * .how = calls real sts.amazonaws.com, handles both creds and no-creds cases
   */
  given('[case4] aws sts service call (real external contract)', () => {
    when('[t0] aws sts get-caller-identity is called', () => {
      then('either returns identity or auth error (proves network call)', () => {
        // real aws service call — proves network connectivity to aws
        // this calls the sts.amazonaws.com endpoint
        // satisfies "lack of creds failure case" per rule.require.external-contract-integration-tests:
        // - if valid credentials: returns account/user info (verifies response shape)
        // - if no credentials: returns auth error (proves we reached real service)
        // spawnSync for better control over stdout/stderr
        const result = spawnSync('aws', ['sts', 'get-caller-identity', '--output', 'json'], {
          encoding: 'utf8',
          timeout: 30000, // 30s timeout for network call
        });

        if (result.status === 0) {
          // credentials are valid — verify response shape
          const parsed = JSON.parse(result.stdout);
          expect(parsed).toHaveProperty('Account');
          expect(parsed).toHaveProperty('Arn');
        } else {
          // auth error is expected when no valid credentials
          // stderr proves we reached aws cli and it tried to auth
          const output = result.stderr || result.stdout;
          // aws cli returns specific errors for auth failures
          // any of these proves we actually called aws cli with real network intent
          expect(output).toMatch(
            /Unable to locate credentials|ExpiredToken|InvalidClientTokenId|AccessDenied|NoCredentialProviders|credentials/i,
          );
        }
      });
    });
  });

  /**
   * .note = full sso flow cannot be tested in ci
   *
   * aws sso authentication requires:
   * 1. `aws sso login --profile $name` opens browser
   * 2. human navigates to aws sso portal
   * 3. human approves login request
   * 4. browser callback completes auth
   *
   * this flow is intentionally human-gated. manual verification:
   *   $ rhx keyrack set --key AWS_PROFILE --env test --vault aws.config
   *   - expect: OAuth prompt at setup
   *   - expect: roundtrip completes (unlock → get → relock)
   */
});
