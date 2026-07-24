/**
 * .what = the exact `gh` cli stderr substrings we match http status by
 * .why = getGhRepoExists/getGhFileContent/getGhOrgInstalls interpret stderr to tell a
 *        benign 404/403 from a transient failure; pinning the substrings here (with a
 *        cite of the gh output they were validated against) makes a future gh format
 *        change a single, obvious edit — and the paired matcher tests snapshot them
 *
 * .note = validated against gh cli 2.x output (rest api via `gh api`, repo view via
 *         graphql). all matches are lowercased before compare, so keep these lowercase.
 * .note = when gh changes its phrasing, update these constants + their matcher tests
 *         together; a diff here immediately flags the behavior shift.
 */

/**
 * .what = substrings that indicate a genuine "not found" (404)
 * .why = `gh api` prints "HTTP 404" / "Not Found"; `gh repo view` (graphql) prints
 *        the graphql repository-lookup failure line
 */
export const GH_STDERR_MARKERS_NOT_FOUND = [
  'http 404',
  'not found',
  'could not resolve to a repository',
] as const;

/**
 * .what = substrings that indicate a genuine permission denial (403/401)
 * .why = a member's org-installations call is forbidden; `gh api` prints "HTTP 403" /
 *        "HTTP 401" / "must be an organization owner"
 */
export const GH_STDERR_MARKERS_FORBIDDEN = [
  'http 403',
  'http 401',
  'must be an organization owner',
] as const;

/**
 * .what = substrings that indicate the resource already exists (422 name taken)
 * .why = a concurrent `gh repo create` loses the toctou race and github rejects it
 *        with 422; `gh` prints "HTTP 422" / "name already exists" — a benign signal
 *        that the findsert can treat as "found" rather than a hard failure
 */
export const GH_STDERR_MARKERS_ALREADY_EXISTS = [
  'http 422',
  'already exists',
  'name already exists',
] as const;

/**
 * .what = substrings that indicate an optimistic-concurrency write conflict
 * .why = the contents api rejects a stale write: a concurrent create makes the
 *        second PUT 422 ("already exists"), and a concurrent update makes the second
 *        PUT 409 ("does not match")/("is at ..."); both mean "someone wrote first",
 *        so a findsert can re-read and retry instead of a hard failure
 *
 * .note = this set intersects GH_STDERR_MARKERS_ALREADY_EXISTS on 'http 422' /
 *         'already exists' — deliberate, not accidental: a 422 "already exists" is at
 *         once a repo-create-lost-the-race signal (at genGhRepo) and a file-create-
 *         lost-the-race signal (at setGhFileContent). the two predicates run at
 *         strictly separate call sites — genGhRepo checks only isGhAlreadyExistsStderr,
 *         setGhFileContent checks only isGhWriteConflictStderr — so no caller checks
 *         both and there is no order dependency between the sets. the broad 'http 422'
 *         must stay: a sha:null PUT onto an extant file can surface as a bare 422 (sha
 *         not supplied) with none of the narrower substrings, and it must still
 *         classify as a write conflict for the TOCTOU retry to converge
 */
export const GH_STDERR_MARKERS_WRITE_CONFLICT = [
  'http 409',
  'http 422',
  'does not match',
  'already exists',
] as const;
