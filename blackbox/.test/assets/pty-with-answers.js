#!/usr/bin/env node
/**
 * .what = run a command in a pseudo-TTY and feed it answers on prompt detection
 * .why  = readline.createInterface needs each answer to arrive AFTER
 *         the prompt is set up; timing-based delays are flaky.
 *         this watches stdout for prompt patterns and responds.
 *
 * usage:
 *   pty-with-answers.js "<command>" "<prompt-pattern>" "<answer1>" "<answer2>" ...
 *
 * guarantee:
 *   - child process sees process.stdin.isTTY === true (via `script -qec` from util-linux)
 *   - each answer is sent only after the prompt pattern is detected in stdout
 *   - returns child exit code
 *   - a signal to this helper (e.g. a caller's spawnSync timeout) ends `script` and the command
 *     with it; no child outlives the helper
 */
const { spawn } = require('child_process');

const cmd = process.argv[2];
const promptPattern = process.argv[3];
const answers = process.argv.slice(4);

if (!cmd || !promptPattern) {
  process.stderr.write(
    'usage: pty-with-answers.js "<command>" "<prompt-pattern>" "<answer1>" ...\n',
  );
  process.exit(1);
}

let answerIndex = 0;
let outputBuffer = '';

// `script` (util-linux) creates a real pseudo-TTY for the child
// .note = detached, so `script` leads its own process group, which this helper can signal whole
const child = spawn('script', ['-qec', cmd, '/dev/null'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  detached: true,
});

child.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(data);
  outputBuffer += text;

  // count prompt occurrences in accumulated output
  const promptCount = (
    outputBuffer.match(new RegExp(promptPattern, 'g')) || []
  ).length;

  // send next answer when a new prompt is detected
  if (promptCount > answerIndex && answerIndex < answers.length) {
    const idx = answerIndex;
    answerIndex++;
    // brief pause lets readline finish setup after prompt text is emitted
    setTimeout(() => {
      child.stdin.write(answers[idx] + '\n');
    }, 50);
  }
});

// the signal this helper heard, if any; a signalled helper ends by that same signal
let signalHeard = null;

child.on('close', (code) => {
  if (signalHeard) return process.kill(process.pid, signalHeard);
  process.exit(code ?? 1);
});

/**
 * .what = signal the whole `script` group, if it still runs
 * .why  = when `script` ends, its pty closes and the command hears a hangup, so no child outlives
 *         this helper
 */
const killChildGroup = (input) => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  try {
    process.kill(-child.pid, input.signal);
  } catch (error) {
    // the group already ended between the check and the kill
    if (error && error.code === 'ESRCH') return;
    throw error;
  }
};

// forward an end signal to the child group, then end as signalled once it closes
// .note = no stderr report here: a spawnSync caller closes its pipes when its timeout fires, so a
//         write would only raise EPIPE and end this helper before the group is reaped
for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
  process.once(signal, () => {
    signalHeard = signal;
    killChildGroup({ signal: 'SIGTERM' });
    // a child deaf to SIGTERM gets SIGKILL, and this helper ends by the signal it heard whether or
    // not the child closed — a caller's timeout must always end this helper
    setTimeout(() => {
      killChildGroup({ signal: 'SIGKILL' });
      process.kill(process.pid, signal);
    }, 1000).unref();
  });
}

// a helper that exits by any path leaves no group behind
process.once('exit', () => killChildGroup({ signal: 'SIGKILL' }));
