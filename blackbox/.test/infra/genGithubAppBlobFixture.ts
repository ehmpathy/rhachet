import { generateKeyPairSync } from 'node:crypto';

/**
 * .what = a github-app blob for a test, and the pem line to assert absent from every output
 * .why = the github-app suites each pipe a blob and each check the private key never leaks back;
 *        one builder keeps the blob shape and the leak marker in step across them
 *
 * .note = two key kinds:
 *         - `generated`: a real rsa key made for this run. the jwt is signed with it for real; the
 *           real github refuses it for an app id no github app holds
 *         - `junk`: a pem whose body is not an rsa key, so the mint fails in crypto
 *         no credential value lives here
 */
export const genGithubAppBlobFixture = (input: {
  appId: string;
  installationId: string;
  privateKey: 'generated' | 'junk';
}): { blob: string; pemBodyLine: string } => {
  // pick the key: a fresh rsa key, or a pem that names no key at all
  const privateKey =
    input.privateKey === 'generated'
      ? generateKeyPairSync('rsa', {
          modulusLength: 2048,
          privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
          publicKeyEncoding: { type: 'spki', format: 'pem' },
        }).privateKey
      : '-----BEGIN RSA PRIVATE KEY-----\nnot-a-real-rsa-key-fixture\n-----END RSA PRIVATE KEY-----';

  // the blob, in the shape keyrack files and the leak marker beside it
  const blob = JSON.stringify({
    appId: input.appId,
    installationId: input.installationId,
    privateKey,
    mech: 'EPHEMERAL_VIA_GITHUB_APP',
  });
  return { blob, pemBodyLine: privateKey.split('\n')[1]! };
};
