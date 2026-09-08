/**
 * .what = a node `--require` preload that makes `process.report.getReport()` answer as a
 *   host of the libc named in `RHACHET_TEST_HOST_LIBC` — `musl`, or `unreadable`
 *
 * .why  = the class split has two sides and only ONE was ever driven through the real
 *   binary. `[case4]` proves the supported-host side (💥 `MalfunctionError`, "our install
 *   is damaged"); the unsupported side (✋ `ConstraintError`, "no binary exists for your
 *   platform") had unit rows and a snapshot of its PAYLOAD, and no frame.
 *
 *   those are not the same claim. a correct payload rendered through the wrong glyph, or
 *   under a wrong exit code, is still the defect this wish exists to retire — and the
 *   supported-side row is the one that caught exactly that (a `toContain('✋')` that was
 *   true for both classes and so could never redden).
 *
 * 🚨 .why a stub reaches this at all = `getLibcFromProcess` reads `process.report`, which
 *   is a plain node api on a mutable object, so the fault injects INSIDE the process the
 *   same way the pty one does. that is what makes the unsupported row reachable on an
 *   ordinary linux runner: it needs a musl-shaped REPORT, never a musl HOST.
 *
 * .how  = `asLibcFromReport` reads two fields and a witness, so each libc is a shape:
 *
 *   | `RHACHET_TEST_HOST_LIBC` | the report we answer with | it yields |
 *   |--------------------------|---------------------------|-----------|
 *   | `musl`       | `nodejsVersion` present, `glibcVersionRuntime` absent | `musl` |
 *   | `unreadable` | `nodejsVersion` absent too — no witness at all        | `unreadable` |
 *
 *   ⚠️ the second row yields `unreadable` and NOT `unknown`, though the two sat under one
 *   word until this round. a probe ran here and returned naught, which is what
 *   `term=unreadable` names; `unknown` is reserved for its downstream — a verdict absent
 *   because an INPUT was unreadable, which is what `PtyPlatformSupport` carries. see
 *   `term=unreadable._.choice._.md`, "the second boundary".
 *
 * 🚨 .what this does NOT prove = that a real musl host behaves this way. it cannot: no
 *   alpine runner exists here, and one is out of scope per the vision's A9. what it proves
 *   is narrower and was previously unproven by any test — that GIVEN a musl-shaped libc
 *   read, the real compiled binary renders the constraint frame a human meets. the row
 *   that still needs real hardware is `unsupported`-by-TUPLE (freebsd, riscv), which turns
 *   on `process.platform` rather than on the report.
 *
 * .note = the report is answered WHOLE rather than patched from the real one. a patch
 *   would inherit whichever fields this runner happens to carry, so the musl row would
 *   pass here and could rot silently on a runner whose report shape differs.
 */
const LIBC_REPORTS = {
  // a populated report from a host that links musl: node knows its own version (the
  // witness), and names no glibc runtime because there is none to name
  musl: { header: { nodejsVersion: process.version } },

  // a report we cannot read at all — the witness itself is absent, so its silence about
  // glibc is silence in full rather than evidence of musl
  unreadable: { header: {} },
};

const slug = process.env.RHACHET_TEST_HOST_LIBC;

// a preload wired with no libc, or an unrecognized one, is a HARNESS defect — so it fails
// loud at load time rather than pass the real report through. a silent pass would leave a
// green test that exercises none of the row it exists to prove
if (!slug)
  throw new Error(
    'stubHostLibc: RHACHET_TEST_HOST_LIBC is unset — the preload has no libc to answer as',
  );
if (!Object.prototype.hasOwnProperty.call(LIBC_REPORTS, slug))
  throw new Error(
    `stubHostLibc: RHACHET_TEST_HOST_LIBC="${slug}" is not one of: ${Object.keys(
      LIBC_REPORTS,
    ).join(', ')}`,
  );

const report = LIBC_REPORTS[slug];

// .note = deliberate mutation — the report patch IS the injection. it is scoped to this
//   child process (the preload lands via NODE_OPTIONS, never in the test runner), and it
//   replaces exactly the one method the libc read calls
process.report.getReport = function stubbedGetReport() {
  return report;
};
