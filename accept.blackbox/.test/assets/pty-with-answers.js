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
const child = spawn('script', ['-qec', cmd, '/dev/null'], {
  stdio: ['pipe', 'pipe', 'inherit'],
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

child.on('close', (code) => process.exit(code ?? 1));
