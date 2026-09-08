/**
 * .what = a node `--require` preload that lets `require('node-pty')` SUCCEED, then makes
 *   its `spawn` throw the verbatim message pinned in `RHACHET_TEST_PTY_SPAWN_ERROR`
 *
 * .why  = it is the twin of `stubPtyAddonAbsent.cjs`, and the pair covers the two halves
 *   of one surface. that one makes the addon UNLOADABLE, which proves the socket-omission
 *   report. this one makes the addon LOAD FINE and the HOST refuse it a device, which is
 *   the only path that reaches `asPtyDeviceRefusedError` — a distinct classified report,
 *   with its own sentence, its own hint, and its own exit code.
 *
 * 🚨 .why it must exist at all = the refusal report was proven only at the PAYLOAD grain
 *   (a unit test on the classifier, an integration test through the injected
 *   `context.pty.spawn` seam). neither shows the FRAME a human reads, and this round
 *   already measured that those are different artifacts: a correct payload rendered
 *   through the wrong glyph is still a defect, and no payload test can redden for it.
 *   the 💥-vs-✋ split lived in the payload and NOT on the screen for exactly that reason.
 *
 * ⚠️ .why the spawn is stubbed rather than the device = a real pty exhaustion cannot be
 *   provoked on a ci runner without a fork bomb against `/dev/ptmx`, which would be a
 *   hazard to the host rather than a test. so the CONDITION is taken as given here and
 *   the message is the one node-pty's own `pty.cc` emits — `isPtyDeviceRefusedError`'s
 *   markers are quoted from that same source, so the two agree by construction rather
 *   than by coincidence.
 *
 * .note = the message is an INPUT, never a literal here. the marker set is owned by
 *   `isPtyDeviceRefusedError`, and a second copy of one of its shapes in this file would
 *   drift from that owner with no test to redden.
 */
const Module = require('node:module');

const message = process.env.RHACHET_TEST_PTY_SPAWN_ERROR;

// a preload wired with no message is a HARNESS defect, so it fails loud at load time
// rather than quietly hand back a live pty — a silent pass would leave a green test
// that exercises none of the refusal path it exists to prove
if (!message)
  throw new Error(
    'stubPtyDeviceRefused: RHACHET_TEST_PTY_SPAWN_ERROR is unset — the preload has no error to throw',
  );

const loadPrior = Module._load;

// .note = deliberate mutation — the loader patch IS the injection. it is scoped to this
//   child process (the preload lands via NODE_OPTIONS, never in the test runner), and it
//   intercepts exactly the one specifier
//
// ⚠️ the returned shape is `{ spawn }` and no more, which is deliberate: rhachet's own
//   `PtyModule` type is `Pick<typeof NodePty, 'spawn'>`, so a stub that offered more
//   would assert a surface the production code does not consume
Module._load = function stubbedLoad(request, parent, isMain) {
  if (request === 'node-pty')
    return {
      spawn: () => {
        throw new Error(message);
      },
    };
  return loadPrior.apply(this, arguments);
};
