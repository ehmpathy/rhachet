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

const serial = process.env.RHACHET_CLONE_SERIAL || 'unknown';

// derive this session's transcript path (same shape the real ops discover)
const sessionId = `stub-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const projectSlug = process.cwd().replace(/[^a-zA-Z0-9]/g, '-');
const transcriptDir = path.join(configDir, 'projects', projectSlug);
const transcriptPath = path.join(transcriptDir, `${sessionId}.jsonl`);
fs.mkdirSync(transcriptDir, { recursive: true });
fs.writeFileSync(transcriptPath, ''); // an empty file, so the dir is discoverable at once

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
