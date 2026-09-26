'use strict';
/**
 * .what = a minimal stand-in for a brain-cli, for the clone pty/socket tests
 * .why =
 *   - the socket must be proven end-to-end against a REAL child through a real
 *     pty (never a mock). this stub is that child: it stays alive on stdin, it
 *     replies with a TRANSFORMED ack (poke <nonce> -> ack:<nonce>, never a raw
 *     echo, so a pass proves the say truly reached the child), and it writes a
 *     claude-shaped jsonl transcript so `get` has real output to read
 *   - it honors `exit <code>` on its input, so a test tears it down cleanly and
 *     asserts exit-code parity
 *
 * .note = spawned as `process.execPath <thisFile>` (plain node, no ts), so it is
 *   a .cjs. its transcript path mirrors getBrainTranscriptDir + asClaudeProjectSlug
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// answer the version probe the way claude does, then exit. a test pins a version
// below the floor via RHACHET_STUB_BRAIN_VERSION
if (process.argv.includes('--version')) {
  const version = process.env.RHACHET_STUB_BRAIN_VERSION || '2.1.277';
  process.stdout.write(`${version} (Claude Code)\n`);
  process.exit(0);
}

const serial = process.env.RHACHET_CLONE_SERIAL || 'unknown';

/**
 * 🔴 .refuse an unknown option, exactly as a real brain-cli does.
 *
 * .why = this stub USED to ignore its argv entirely, and that one omission is what
 *   let a green acceptance tier coexist with a fully broken dogfood. enroll strips
 *   its own flags off the RAW argv (getBrainCliPassthroughArgs) and forwards the
 *   rest; `--watch` and `--async` were registered on enroll and ABSENT from that
 *   stripper, so both leaked into this child's argv. against a real brain-cli that
 *   is fatal — it answers `error: unknown option '--async'` and EXITS, which
 *   cascades: the pty child dies, `finalize` closes and unlinks the socket, the
 *   detached host's loop drains, the host exits. so enroll handed back an address
 *   and every `say` to it read DEAD seconds later (measured 2026-09-17).
 *
 * ⚠️ .an argv-blind stub cannot model that, so no acceptance case COULD have caught
 *   it — the suite asserted `socketEligible`, a flag the enroller writes about its
 *   own intent, and the one instrument that would have disagreed shrugged at the
 *   leaked flag. a stub that accepts every argv proves only that rhachet spawned a
 *   child, never that it spawned a VIABLE one.
 *
 * .the allowlist = exactly what `asBrainCliSpawnArgs` builds: the fixed
 *   prefix (config sources + the owned empty system prompt). an arg past it is by definition a passthrough arg, and no
 *   extant case passes one — so an arg here is a LEAK, and this refusal is what
 *   says so out loud (rule.forbid.failhide)
 */
const ARGS_KNOWN_WITH_VALUE = new Set([
  '--setting-sources',
  '--settings',
  '--system-prompt',
]);
/**
 * 🔴 .the print flags a real brain-cli ACCEPTS — so this stub accepts them too.
 *
 * .why = `rule.require.a-stub-refuses-what-its-subject-refuses` cuts both ways. the
 *   refusal above models a real cli's answer to an UNKNOWN flag; a stub that also
 *   refused a KNOWN one would model a cli nobody ships, and the case it blocks is
 *   exactly the one `--await` exists for: hand the child a prompt, take the answer,
 *   forward its code. so `-p` / `--print` must reach the print branch below
 */
const ARGS_KNOWN_PRINT = new Set(['-p', '--print']);
const argv = process.argv.slice(2);
// .note = deliberate mutation — a bounded index walk over argv, local to this scan
for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];
  if (!arg.startsWith('-')) continue; // a bare value (consumed below, or a prompt)
  const [flag] = arg.split('=');
  if (ARGS_KNOWN_PRINT.has(flag)) continue; // a print flag; its value is the prompt
  if (!ARGS_KNOWN_WITH_VALUE.has(flag)) {
    process.stderr.write(`error: unknown option '${flag}'\n`);
    process.exit(1);
  }
  if (!arg.includes('=')) i += 1; // the spaced form eats its value
}

/**
 * .what = the prompt a print-mode invocation carries, if it carries one
 * .why = a print-mode child answers ONE prompt on stdout and EXITS. that exit is what
 *   an `await` enroll waits for, and its code is what the enroller forwards — so the
 *   stub must both answer and terminate, never park on stdin like a session does
 */
const printIndex = argv.findIndex((arg) => ARGS_KNOWN_PRINT.has(arg));
const printPrompt = printIndex === -1 ? null : (argv[printIndex + 1] ?? '');

// derive this session's transcript path (same shape the real ops discover)
const sessionId = `stub-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const projectSlug = process.cwd().replace(/[^a-zA-Z0-9]/g, '-');
const transcriptDir = path.join(configDir, 'projects', projectSlug);
const transcriptPath = path.join(transcriptDir, `${sessionId}.jsonl`);
fs.mkdirSync(transcriptDir, { recursive: true });
fs.writeFileSync(transcriptPath, ''); // an empty file, so the dir is discoverable at once

// 🔬 report the clone-identity env THIS child was spawned with, at a path a test can
//   compute from CLAUDE_CONFIG_DIR alone (never from the random sessionId).
//   .why = a child's env is unobservable from outside — the pty owns its stdio and
//     `clone get` returns a classification, never screen content — so a test that must
//     assert what the spawn injected has no other instrument. the depth key is the one
//     that matters: it carries the enroll-depth budget across the detached-host seam
//     (`genCloneEnrollDetached`), and a strip there would leak an unbounded chain.
//   .note = the three clone keys ONLY, never the whole env — a test asset that dumps
//     every var to disk is a credential hazard for the sake of three strings
fs.writeFileSync(
  path.join(configDir, 'stub.env.json'),
  JSON.stringify({
    serial: process.env.RHACHET_CLONE_SERIAL ?? null,
    socket: process.env.RHACHET_CLONE_SOCKET ?? null,
    depth: process.env.RHACHET_CLONE_DEPTH ?? null,
  }),
);

const appendAssistant = (text) => {
  const line = JSON.stringify({
    type: 'assistant',
    message: { content: [{ type: 'text', text }] },
  });
  fs.appendFileSync(transcriptPath, `${line}\n`);
};

// record the USER turn verbatim — a real brain-cli writes the user message to its
// transcript the instant it SUBMITS it (before the reply). the submit self-verify
// (getCloneSubmittedCount) polls for exactly this, so a faithful stub must write it
// too, else the verify times out on a message the stub really did receive.
const appendUser = (text) => {
  const line = JSON.stringify({
    type: 'user',
    message: { role: 'user', content: [{ type: 'text', text }] },
  });
  fs.appendFileSync(transcriptPath, `${line}\n`);
};

// announce readiness — the pty mirrors this line to the human
process.stdout.write(`ready serial=${serial}\n`);

/**
 * 🔴 .print mode — answer the one prompt, record the turn, EXIT.
 *
 * .why it exits here, above every screen render = a print-mode child owes its caller one
 *   answer and no turn past it. the box, the modes, the stdin park below all belong to a
 *   SESSION, and a session is the one thing a print invocation is not. an `await` enroll
 *   holds until this exit and forwards this code, so a stub that parked instead would
 *   hang the enroller forever — the exact unbounded wait `computeCloneEnrollMode` clamps
 */
if (printPrompt !== null) {
  appendUser(printPrompt);
  const answer = `got:${printPrompt}`;
  process.stdout.write(`${answer}\n`);
  appendAssistant(answer);
  process.exit(0);
}

// the stub's screen SHAPE is chosen by RHACHET_STUB_MODE (default when absent), so a
// deterministic acceptance test can drive each non-`released` say verdict through the real
// CLI: `default` a clear box (a say lands `released`), `dirty` a box that holds a human's
// uncommitted text (an unforced say is `withheld`/input-region-dirty; a `--force` say
// overrides the pre-check and lands), `modal` an option menu that holds focus (a say is
// `withheld`/modal-holds-focus with NO force path — V3, case=6), `busy` a brain mid-turn
// that holds the message above the input line (a say lands `enqueued`), `nobox` a screen
// with no box band at all (a say is `withheld`/focus-unrecognized, also no force path)
const stubMode = process.env.RHACHET_STUB_MODE || 'default';

// a minimal recognized input box — a real brain-cli draws an `❯`-fenced band between two
// full-width rules, and the dequeue pre-check gates the write on that shape
// (computeCloneInputState). the `Try "..."` placeholder reads as a `clear` region
const rule = '─'.repeat(40);
const renderClearBox = () => `${rule}\n❯ Try "a message"\n${rule}\n`;

// the initial screen per mode. `default`/`busy` open on a clear box; `dirty` opens on a
// box that holds a human's half-typed text (never the placeholder, so it classifies
// `dirty`); `modal` opens on a `❯`-led option menu with a confirm footer ABOVE the box
// band, the modal signature the classifier reads (the box band itself is excluded from
// the modal scan); `nobox` opens on plain rows with NO full-width rule pair at all
//
// 🔴 `nobox` models a REAL production class, never a hypothetical one. `getInputBand`
//   returns null when fewer than two rule rows are present, and `computeCloneInputState`
//   then classifies `focus: 'unrecognized'` — which is exactly what two measured defects
//   produced: a 0x0 pty geometry (asPtyGeometry, measured 2026-09-16) and a detached host
//   with no tty (genPtyCloneHostDetached, measured 2026-09-16). both rendered a screen
//   whose band could not be found, so EVERY say was withheld for the clone's whole life
const renderInitialScreen = () => {
  if (stubMode === 'dirty')
    return `${rule}\n❯ HUMAN-DRAFT-half-typed-and-uncommitted\n${rule}\n`;
  if (stubMode === 'modal')
    return `❯ 1. Yes\n  2. No\nDo you want to proceed?\n${renderClearBox()}`;
  if (stubMode === 'nobox') return `a screen with no input band\n`;
  return renderClearBox();
};
process.stdout.write(renderInitialScreen());

// strip the bracketed-paste wrapper + submit the socket frames the message in
const stripFrame = (raw) =>
  raw
    .replace(/\x1b\[200~/g, '')
    .replace(/\x1b\[201~/g, '')
    .replace(/\n/g, '')
    .trim();

const handleOne = (raw) => {
  const message = stripFrame(raw);
  if (message === '') return;

  // `exit <code>` — a clean teardown that proves exit-code parity
  const exitMatch = /^exit\s+(\d+)$/.exec(message);
  if (exitMatch) {
    process.exit(Number(exitMatch[1]));
    return;
  }

  // `busy` mode — a brain mid-turn HOLDS the message above the input line: echo it as a
  // scrolled-up queued turn (so countOnScreen rises) atop a still-clear box, and write
  // NEITHER the transcript NOR a reply. so no `released` (the transcript never rises) and
  // the box stays `clear` — the `enqueued` shape (focus input, region clear, screen count
  // rose). a genuinely busy brain holds the message with no transcript write, exactly this
  if (stubMode === 'busy') {
    process.stdout.write(`❯ ${message}\n${renderClearBox()}`);
    return;
  }

  // `bufferedhold` mode — the write reached the box but the submit did not take: redraw the
  // box with OUR message STILL in it (a dirty region, so countInInput rises), and write
  // NEITHER the transcript NOR a reply. the box is no longer clear, so it is not `enqueued`;
  // its count rose in the band, so the verdict is `buffered` (do not re-send — it would
  // append). the initial box is clear, so the pre-check proceeds before this redraw
  if (stubMode === 'bufferedhold') {
    process.stdout.write(`${rule}\n❯ ${message}\n${rule}\n`);
    return;
  }

  // record the submitted user turn FIRST (as a real brain does on submit), so the
  // submit self-verify sees the message left the input buffer, then reply below
  appendUser(message);

  // `poke <nonce>` — a TRANSFORMED reply, so a pass proves the say reached here
  const pokeMatch = /^poke\s+(.+)$/.exec(message);
  if (pokeMatch) {
    const reply = `ack:${pokeMatch[1]}`;
    process.stdout.write(`${reply}\n`);
    appendAssistant(reply);
    return;
  }

  // any other input — a transformed acknowledgement
  const reply = `got:${message}`;
  process.stdout.write(`${reply}\n`);
  appendAssistant(reply);
};

// a submit ends one dispatch; the pty's cooked mode maps CR to NL (ICRNL), so a
// line boundary arrives as \n OR \r — split on either. buffer partial input
let buffer = '';
const nextBreak = (s) => {
  const nl = s.indexOf('\n');
  const cr = s.indexOf('\r');
  if (nl === -1) return cr;
  if (cr === -1) return nl;
  return Math.min(nl, cr);
};
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let idx = nextBreak(buffer);
  while (idx !== -1) {
    const one = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    handleOne(one);
    idx = nextBreak(buffer);
  }
});

// stay alive until an `exit` command or a signal
process.stdin.resume();
