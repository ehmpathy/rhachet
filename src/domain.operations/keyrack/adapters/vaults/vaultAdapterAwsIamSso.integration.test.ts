/**
 * .what = stub integration test for vaultAdapterAwsIamSso
 *
 * .why = documents why real integration tests are not possible
 *
 * .note = aws sso is specifically designed for human authentication:
 *   - requires browser-based oauth flow
 *   - requires human to approve login in aws sso portal
 *   - cannot be automated without a breach of the security model
 *   - no headless/service-account equivalent exists
 *
 * .coverage = unit tests in vaultAdapterAwsIamSso.test.ts provide full
 *   coverage via mocked execSync. acceptance tests in
 *   keyrack.vault.awsIamSso.acceptance.test.ts verify cli integration.
 *
 * .ref = https://docs.aws.amazon.com/singlesignon/latest/userguide/
 */
describe('vaultAdapterAwsIamSso integration', () => {
  it('cannot be tested in ci: aws sso requires browser auth', () => {
    // aws sso authentication flow:
    // 1. `aws sso login --profile $name` opens browser
    // 2. human navigates to aws sso portal
    // 3. human approves login request
    // 4. browser callback completes auth
    //
    // this flow is intentionally human-gated. there is no way to:
    // - skip browser auth
    // - use service account credentials
    // - automate the approval step
    //
    // the only way to test real sso flows is via manual test with
    // a configured aws profile and human present to approve.
    expect(true).toBe(true);
  });
});
