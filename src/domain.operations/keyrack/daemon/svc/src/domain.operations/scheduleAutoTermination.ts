import type { DaemonKeyStore } from '../domain.objects/daemonKeyStore';

/**
 * .what = periodically check if all keys expired, exit if so
 * .why = daemon with only expired keys serves no purpose
 *
 * .note = only terminates after keys were present (hasEverHadKeys flag)
 * .note = default check interval is 15 minutes
 * .note = KEYRACK_DAEMON_TERMINATION_CHECK_MS env var overrides for tests
 */
export const scheduleAutoTermination = (input: {
  keyStore: DaemonKeyStore;
}): NodeJS.Timeout => {
  const { keyStore } = input;

  // env var allows shorter interval for integration tests
  const checkIntervalMs = process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS']
    ? parseInt(process.env['KEYRACK_DAEMON_TERMINATION_CHECK_MS'], 10)
    : 15 * 60 * 1000; // 15min default
  let hasEverHadKeys = false;

  return setInterval(() => {
    // entries() purges expired keys as side effect
    const entries = keyStore.entries();

    // track if keys were ever present
    if (entries.length > 0) hasEverHadKeys = true;

    // terminate only if we had keys and now all are gone
    if (hasEverHadKeys && entries.length === 0) {
      console.log('[keyrack-daemon] all keys expired, terminate');
      process.exit(0);
    }
  }, checkIntervalMs);
};
