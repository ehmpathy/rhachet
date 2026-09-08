/**
 * .what = a node `--require` preload that makes `require('node-pty')` throw, with the
 *   verbatim message the caller pins in `RHACHET_TEST_PTY_LOAD_ERROR`
 *
 * .why  = the pty-absent enroll report could only ever be proven at the PAYLOAD grain —
 *   a unit test asserts the error object, a snapshot pins its fields. neither shows the
 *   FRAME a human reads off their terminal, and the two are not the same artifact: a
 *   correct payload rendered through a wrong glyph, a swallowed hint, or a wrong exit
 *   code is still a defect, and no payload test can redden for it.
 *
 *   ⚠️ the twin frame (the `⚠️` unreadable-probe notice on `rhx upgrade`) closed with
 *   three PATH stubs, because every ambient read that notice makes resolves through
 *   PATH — so a stub decides them from OUTSIDE the process. **that tactic cannot reach
 *   this one.** the pty addon resolves out of rhachet's OWN dependency tree, which no
 *   env var relocates, so the fault must be injected INSIDE the process. a `--require`
 *   preload is the one seam that reaches there without a production seam cut into
 *   `getPtyModuleOrNull` — its `load` injection point is unit-only and is not reachable
 *   from the cli.
 *
 * 🚨 .what this does NOT prove, stated plainly = that a real broken install produces
 *   this condition. that is a SEPARATE claim, owned by
 *   `getPtyModuleOrNull.consumer.integration.test.ts`, which installs the package into a
 *   gate-live consumer tree at both versions and watches the real loader fail at 1.1.0.
 *   this asset takes that condition as GIVEN and proves only what happens on screen once
 *   it holds. neither artifact alone closes the case; together they do.
 *
 * .note = the message is an INPUT, never a literal here. `asPtyAddonFileName` already
 *   owns the fact that the addon is `pty.node` on posix and `conpty.node` on win32, and
 *   a second copy of it in this file would drift from that owner with no test to redden.
 */
const Module = require('node:module');

const message = process.env.RHACHET_TEST_PTY_LOAD_ERROR;

// a preload wired with no message is a HARNESS defect, so it fails loud at load time
// rather than quietly pass the addon through — a silent pass would leave a green test
// that exercises none of the fallback path it exists to prove
if (!message)
  throw new Error(
    'stubPtyAddonAbsent: RHACHET_TEST_PTY_LOAD_ERROR is unset — the preload has no error to throw',
  );

const loadPrior = Module._load;

// .note = deliberate mutation — the loader patch IS the injection. it is scoped to
//   this child process (the preload lands via NODE_OPTIONS, never in the test runner),
//   and it intercepts exactly the one specifier
Module._load = function stubbedLoad(request, parent, isMain) {
  if (request === 'node-pty') throw new Error(message);
  return loadPrior.apply(this, arguments);
};
