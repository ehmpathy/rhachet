/**
 * .what = a repo context with no ambient roles
 * .why = with no ambient set, no roleset can equal it, so every roleset a suite enrolls lands on
 *   a hash actor and never collapses into the repo actor. the actor suites share this one shape
 *   (rule.require.shared-test-fixtures)
 */
export const genSampleContextNoAmbient = (): {
  repo: { ambient: { roles: string[] } };
} => ({ repo: { ambient: { roles: [] } } });
