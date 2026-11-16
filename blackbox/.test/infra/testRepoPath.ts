/**
 * .what = the slug every test repo's temp dir carries
 * .why = the snapshot mask renders a dir with this slug as `/TMP_REPO`, apart from a bare
 *   `genTempDir` dir (`/TMP_TEST_DIR`)
 */
export const TEST_REPO_SLUG_PREFIX = 'rhachet-test';

/**
 * .what = matches a test repo's physical root, as `genTempDir` mints it on linux
 * .why = one pattern for every snapshot mask that renders it `/TMP_REPO`. it must run before the
 *   bare `genTempDir` mask, which would otherwise eat it as `/TMP_TEST_DIR`
 */
export const TEST_REPO_PATH_PATTERN =
  /\/tmp\/test-fns\/[^/\s]+\/\.temp\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z\.[^./\s]+\.rhachet-test[a-z0-9-]*\.[0-9a-f]{8}/gi;
