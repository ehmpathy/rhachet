/**
 * .what = pre-generated age key pair for test fixtures
 * .why = enables encrypted manifest tests without dynamic key generation
 *
 * .note = these keys are ONLY for tests — never use in production
 * .note = generated via: const identity = await age.generateIdentity()
 */

/**
 * age identity (private key) for test decryption
 * format: AGE-SECRET-KEY-...
 */
export const TEST_AGE_IDENTITY =
  'AGE-SECRET-KEY-1XLS8V9YY2HKFFU3QWGHWC7CUTY9A08NSSZU8MAQHECDJC2E26EJQHS7AG7';

/**
 * age recipient (public key) for test encryption
 * format: age1...
 * derived from TEST_AGE_IDENTITY via age.identityToRecipient()
 */
export const TEST_AGE_RECIPIENT =
  'age18nv85p4lm076rfe5nmkpk8vq66u3eql09ruxalxlfsxu86dlyq0sfgykj4';
