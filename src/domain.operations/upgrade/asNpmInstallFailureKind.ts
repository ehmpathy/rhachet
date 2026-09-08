import { matchesAnyMarker } from '@src/utils/matchesAnyMarker';

/**
 * .what = the first pnpm major that reports a gated build hook through a NONZERO exit
 *
 * .why  = ONE owner for a boundary two files must agree on. measured both ways:
 *   pnpm 10.24 blocks the identical hook and reports a WARN with a clean exit 0; pnpm 11.18
 *   raises `ERR_PNPM_IGNORED_BUILDS` and exits 1. get the boundary wrong and a gated-but-
 *   healthy install is reported as a failure, or a real failure as a gate notice.
 *
 * 🚨 a prose cross-reference is what this replaces, and prose cannot redden. the consumer
 *   clamp asserts its own `PACKAGE_MANAGER_REPORT_EXPECTED` table against THIS constant, so
 *   a change to either side fails a test rather than drifts unread
 *   (`getPtyPlatformSupport`'s bidirectional sync test is the pattern).
 */
export const PNPM_MAJOR_NONZERO_ON_BUILD_GATE = 11;

/**
 * .what = the kinds of nonzero install exit we can tell apart, from output alone
 * .why  = a package manager exits nonzero both when the install genuinely failed AND when
 *   it merely reports a gated build hook. one is a defect, the other a no-op.
 *
 * .why `unclassified` is a first-class row = an exit we cannot place is reported AS
 *   unplaced, never folded into whichever row reads closest.
 *
 * .note = `timed-out` is known STRUCTURALLY — `execNpmInstall` sets it when spawnSync
 *   reports the child was killed at its bound — so it is a member here and absent from
 *   the classifier below. a killed install's bytes name no cause.
 */
export const NPM_INSTALL_FAILURE_KINDS = [
  'permission-denied',
  'package-absent',
  'build-gate-blocked',
  'timed-out',
  'unclassified',
] as const;

export type NpmInstallFailureKind = (typeof NPM_INSTALL_FAILURE_KINDS)[number];

/**
 * .what = is this value one of the declared kinds?
 * .why  = so the reader of a kind cannot drift from the writer of it. this and the union
 *   above are ONE list, so a future member is covered by construction rather than by a
 *   hand-copy someone must remember (`rule.require.solve-at-cause`).
 */
export const isNpmInstallFailureKind = (
  value: unknown,
): value is NpmInstallFailureKind =>
  NPM_INSTALL_FAILURE_KINDS.includes(value as NpmInstallFailureKind);

/**
 * .what = every verbatim code that can name an install failure, in ONE list
 * .why  = the single owner of "what counts as a cause". each row below subtracts the few
 *   its own cause explains, so a new code lands here once and reaches every row.
 *
 * .note = matched verbatim, so a code must be distinctive enough to survive a scan of the
 *   whole log. `E404` is deliberately ABSENT — too short to be safe bare; the rows that
 *   need it get it via `ERR_PNPM_FETCH_404` and the anchored markers below.
 */
const CODES_INDEPENDENT = [
  'ENOSPC',
  'ENOENT',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ECONNRESET',
  'EACCES',
  'EPERM',
] as const;

/**
 * .what = one verbatim code, as a word-bounded marker
 *
 * 🚨 .why BOUNDED rather than a bare `includes` = every OTHER scan in this classifier is
 *   anchored, and the negative controls ([case1][t2b]/[t2c], [case7][t2b]/[t2c]) exist to
 *   prove an incidental mention must not decide a kind. a bare scan on this half broke
 *   that discipline: a real permission wall whose log happens to carry `ENOSPC_RETRY` or
 *   a path segment named `ENOENT_backup` counted as an independent cause, and flipped the
 *   row to `unclassified` — so the human lost *"retry with elevated permissions"* and got
 *   *"read the output above"* instead.
 *
 * .note = it degrades toward `unclassified`, never toward a confident wrong cure, so this
 *   was a precision defect rather than a safety one (`rule.forbid.failhide` held either
 *   way). raised by the r009 `ergo-friction-hazards` lane at i065.
 *
 * ⚠️ `\b` does NOT fire inside `ERR_PNPM_ENOENT`, because `_` is a word character — and
 *   that is the wanted behavior, not a gap: the `ERR_PNPM_*` scan above already owns
 *   every code of that shape, so a bare scan double-counted them.
 */
const asCodeMarker = (code: string): RegExp => new RegExp(`\\b${code}\\b`);

/**
 * .what = the one co-occurrence scan every row shares, parameterized by what that row
 *   must NOT count against itself
 * .why  = three rows ask the same question — *"does this output name a cause my row
 *   cannot explain?"* — so the scaffold and the code universe are shared, and only each
 *   row's own EXPECTATIONS stay at its call site.
 */
const getAllOtherCauses = (input: {
  output: string;
  /**
   * .what = the `ERR_PNPM_*` codes this row expects to see beside itself
   * .why  = a code for the very cause under test would make the row refute itself
   */
  pnpmCodesExpected: string[];
  /**
   * .what = whether npm's generic `npm ERR!` banner counts as an independent cause
   * ⚠️ the banner wraps EVERY npm failure, the causes under test among them, so a row
   *   that reads it as independent evidence sends its own cause to `unclassified`
   */
  npmBanner: 'counts' | 'expected';
  /**
   * .what = the verbatim codes this row EXPECTS, and so must not count against itself
   * ⚠️ an EXCLUSION off `CODES_INDEPENDENT`, never a per-row list — that direction lets a
   *   new code reach every row at once, so a row may lose precision (more
   *   `unclassified`) and can never name a confident WRONG cure (`rule.forbid.failhide`)
   */
  codesExpected: string[];
}): string[] => {
  const pnpmCodesOther = (
    input.output.match(/ERR_PNPM_[A-Z0-9_]+/g) ?? []
  ).filter((code) => !input.pnpmCodesExpected.includes(code));

  const npmBanner =
    input.npmBanner === 'counts' && input.output.includes('npm ERR!')
      ? ['npm ERR!']
      : [];

  const codesFound = CODES_INDEPENDENT.filter(
    (code) =>
      !input.codesExpected.includes(code) &&
      matchesAnyMarker({ markers: [asCodeMarker(code)], text: input.output }),
  );

  return [...pnpmCodesOther, ...npmBanner, ...codesFound];
};

/**
 * .what = the failure markers that mean a real defect, beyond the ignored-build notice
 *
 * .why  = pnpm prints `ERR_PNPM_IGNORED_BUILDS` whenever ANY dependency's build hook is
 *   gated — even on an install that ALSO failed for a real, unrelated reason. so the
 *   notice absolves only when it is the SOLE signal; otherwise a genuine failure beside
 *   a gated hook reports as `{ upgraded: true }`.
 */
const getAllOtherFailureMarkers = (input: { output: string }): string[] =>
  getAllOtherCauses({
    output: input.output,
    // the notice itself is the signal under test, so it cannot count against itself
    pnpmCodesExpected: ['ERR_PNPM_IGNORED_BUILDS'],
    // npm's own failure banner, which pnpm never emits for a gated hook — so here it IS
    // independent evidence that something beyond the gate went wrong
    npmBanner: 'counts',
    // 🚨 the WIDEST row: a gated build hook explains NO verbatim code at all, so every
    //   member of CODES_INDEPENDENT counts against it. an empty expectation list is the
    //   honest statement of that, never an oversight
    codesExpected: [],
  });

/**
 * .what = the failure markers that name a cause a PERMISSION WALL does not account for
 *
 * .why  = the permission row's own co-occurrence guard. its list is deliberately NARROWER
 *   than `getAllOtherFailureMarkers`, and each omission is load-bearing:
 *
 *   | omitted | why it must NOT count against a permission wall |
 *   |---------|--------------------------------------------------|
 *   | `npm ERR!` | npm's generic banner. it wraps EVERY npm failure INCLUDING EACCES (`npm ERR! code EACCES`), so to count it would send every npm permission wall to `unclassified` — the exact inverse defect |
 *   | `ERR_PNPM_EACCES` / `ERR_PNPM_EPERM` | pnpm's own name for the SAME event. counting a code for the very cause under test would make the row self-refuting |
 *   | `ERR_PNPM_IGNORED_BUILDS` | a NOTICE, never a cause — it accompanies any outcome. `[case4]` pins that a permission wall beside it is still a permission wall |
 *   | `ENOENT` | a JUDGMENT, not a rule, so it is named rather than left to a reader to notice. an unreadable path often reports as absent, so ENOENT is frequently a CONSEQUENCE of the permission wall rather than a second cause. counted, it would strip the hint from a real permission failure more often than it would catch a masked one |
 *
 * .note = what stays is posix + network codes only: each names a cause INDEPENDENT of
 *   permission, so its presence means the output describes two events.
 */
const getAllCausesBeyondPermission = (input: { output: string }): string[] =>
  getAllOtherCauses({
    output: input.output,
    // the three a permission wall is expected to bring with it — see the table above
    pnpmCodesExpected: [
      'ERR_PNPM_IGNORED_BUILDS',
      'ERR_PNPM_EACCES',
      'ERR_PNPM_EPERM',
    ],
    // `npm ERR! code EACCES` — the banner wraps the cause under test, so to count it
    // would send every npm permission wall to `unclassified`
    npmBanner: 'expected',
    // what a permission wall itself explains, so each is read past rather than counted:
    //   `EACCES` / `EPERM` — the posix codes for the very cause under test
    //   `ENOENT`           — a JUDGMENT: an unreadable path often reports as absent, so it
    //                        is usually a CONSEQUENCE of the wall, not a second cause
    // every other member of CODES_INDEPENDENT counts against this row
    codesExpected: ['EACCES', 'EPERM', 'ENOENT'],
  });

/**
 * .what = the failure markers that name a cause an ABSENT PACKAGE does not account for
 *
 * .why  = the same co-occurrence discipline, at its own width. a registry 404 is decisive
 *   alone — the registry ANSWERED, and said no such package — but a 404 beside a full
 *   disk describes two events.
 *
 *   | omitted | why it must NOT count against an absent package |
 *   |---------|--------------------------------------------------|
 *   | `E404` / `ERR_PNPM_FETCH_404` | the codes for the very cause under test |
 *   | `npm ERR!` | npm's generic banner wraps EVERY failure, `E404` too. counted, every npm typo would report as `unclassified` — the inverse defect |
 *   | `ERR_PNPM_IGNORED_BUILDS` | a notice, never a cause; it accompanies any outcome |
 *   | `ENOTFOUND` | ⚠️ **counted, deliberately.** it is DNS, so it names a genuine network failure INDEPENDENT of whether the package exists. a log with both describes two events |
 */
const getAllCausesBeyondAbsence = (input: { output: string }): string[] =>
  getAllOtherCauses({
    output: input.output,
    // the fetch-404 is the cause under test; the gate notice accompanies any outcome
    pnpmCodesExpected: ['ERR_PNPM_IGNORED_BUILDS', 'ERR_PNPM_FETCH_404'],
    // the banner wraps `E404` too, so counted it would send every npm typo to
    // `unclassified` — the inverse defect
    npmBanner: 'expected',
    // what an absent package itself explains:
    //   `ENOENT` — the posix face of "no such thing"; a registry that answered 404 and a
    //              local path that reports absent are one event, not two
    // ⚠️ `EACCES` / `EPERM` are deliberately NOT expected here, unlike in the permission
    //   row: a permission wall is a genuinely separate event from a registry that
    //   answered "no such package", so it must count against this row
    codesExpected: ['ENOENT'],
  });

/**
 * .what = does the output name a package the registry says does not exist?
 * .why  = the most common upgrade failure is a typo in a role slug, and it is the one
 *   failure a human hits most.
 *
 * .why a 404 is decisive = the registry was REACHED and answered "no such package". a
 *   genuine network fault reports as `ENOTFOUND` / `ECONNREFUSED` / `ETIMEDOUT`, which is
 *   why those count AGAINST this row in `getAllCausesBeyondAbsence`.
 *
 * ⚠️ ANCHORED, never `includes('E404')` — a bare token matches a registry url or a
 *   nested tool's quoted 404, and hands a human this file's most confident cure over a
 *   cause it never identified.
 */
const PACKAGE_ABSENT_MARKERS: RegExp[] = [
  // pnpm's own code. already unambiguous — the prefix cannot appear by accident
  /ERR_PNPM_FETCH_404/,
  // npm's structured code line: `npm ERR! code E404` (npm 9) / `npm error code E404` (10+)
  /\bcode E404\b/,
  // npm's human line, anchored to its own banner so a QUOTED 404 from a nested tool's
  // output cannot satisfy it: `npm ERR! 404 Not Found - GET https://…`
  /npm (?:ERR!|error)\s+404\b/,
];

const isPackageAbsentReport = (input: { output: string }): boolean =>
  matchesAnyMarker({ markers: PACKAGE_ABSENT_MARKERS, text: input.output });

/**
 * .what = the shapes a package manager EMITS when it hits a permission wall
 *
 * ⚠️ ANCHORED, never `includes('EACCES')`. the co-occurrence guard cannot save a bare
 *   token: when the real failure carries no recognizable code, `getAllCausesBeyondPermission`
 *   returns `[]`, so an incidental mention reads as decisive (`rule.forbid.failhide`).
 */
const PERMISSION_DENIED_MARKERS: RegExp[] = [
  // pnpm's own codes. the prefix cannot appear by accident
  /ERR_PNPM_EACCES/,
  /ERR_PNPM_EPERM/,
  // npm's structured code line: `npm ERR! code EACCES` (9) / `npm error code EACCES` (10+).
  // the `\bcode ` prefix is what a quoted mention lacks
  /\bcode (?:EACCES|EPERM)\b/,
  // the posix message shape both managers surface verbatim from the syscall:
  //   `EACCES: permission denied, mkdir '/usr/local/lib/node_modules'`
  /\b(?:EACCES|EPERM):\s*(?:permission denied|operation not permitted)/,
];

const isPermissionDeniedReport = (input: { output: string }): boolean =>
  matchesAnyMarker({ markers: PERMISSION_DENIED_MARKERS, text: input.output });

/**
 * .what = classify a nonzero install exit by what the package manager actually printed
 * .why  = pure, so the decision is testable with no spawn, and single-owner, so no
 *   install path can grow a second opinion about what a nonzero exit means.
 *
 * 🚨 .the rule every row holds = ONE signal absolves; TWO signals mean we do not know. a
 *   log that names a second, independent cause reaches `unclassified` rather than a
 *   confident cure for whichever row matched first (`rule.forbid.failhide`).
 *
 * .note = reads the CAPTURED output, so it cannot serve an install run with
 *   `stdio: 'inherit'` — those bytes went straight to the terminal.
 *
 * .note = the ORDER is a decision: a permission wall before an absent package, both
 *   before a gated hook, because the gate notice accompanies any outcome and the wall is
 *   the one a human must act on (`[case4]`).
 */
export const asNpmInstallFailureKind = (input: {
  output: string;
}): NpmInstallFailureKind => {
  // a permission wall is the caller's to fix, and both package managers name it by code
  if (isPermissionDeniedReport({ output: input.output })) {
    // an EACCES line inside a log that ALSO names a full disk is a real failure with a
    // permission line beside it — "retry with elevated permissions" is a cure sudo cannot
    // deliver
    const causesOther = getAllCausesBeyondPermission({ output: input.output });
    if (causesOther.length > 0) return 'unclassified';

    return 'permission-denied';
  }

  // a package the registry says does not exist — overwhelmingly a typo in a slug.
  // .note = read AFTER the permission row on purpose: a wall that hides a package is
  //   still a wall, and `[case6] [t1]` pins that a 404 beside EACCES is two events
  if (isPackageAbsentReport({ output: input.output })) {
    const causesOther = getAllCausesBeyondAbsence({ output: input.output });
    if (causesOther.length > 0) return 'unclassified';

    return 'package-absent';
  }

  // a gated build hook is REPORTED through the exit code from this major on. the packages
  // did install; only a lifecycle hook was skipped. so this is not a failure at all.
  // ⚠️ the boundary is owned by PNPM_MAJOR_NONZERO_ON_BUILD_GATE, and the consumer clamp
  //   asserts its own table against that constant — so the two cannot drift silently
  if (input.output.includes('ERR_PNPM_IGNORED_BUILDS')) {
    // a real failure beside the notice is still a real failure — to fold the pair into
    // `build-gate-blocked` would report a broken install as `{ upgraded: true }`
    const markersOther = getAllOtherFailureMarkers({ output: input.output });
    if (markersOther.length === 0) return 'build-gate-blocked';
    return 'unclassified';
  }

  // .why = a GUARD, never a silent default. a human is told the truth — a failure, cause
  //   unknown, here is the output — rather than handed a cause we guessed
  return 'unclassified';
};
