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
 *   - each answer is sent only after a NEW prompt-pattern match lands in stdout and the
 *     output then goes quiet (the child awaits input); one answer per prompt
 *   - returns child exit code
 *   - each answer ends as `PTY_ANSWER_EOL` says: `lf` (default), `crlf` (one write, as a
 *     paste from a windows-edited file), or `crlf-split` (the CR, then the LF in a second write
 *     50ms later, so the pair lands across two prompts; the last answer goes in one write)
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

// .note = a child that awaits input stops output. so an answer goes out only once output has
//         been quiet this long AND a new pattern match sits past the last answer. a count over
//         the whole buffer is not enough: a menu line can carry the pattern word too (the mech
//         menu reads "static secret"), which once sent the secret while the choice prompt read
const QUIET_MS = 200;

// .note = the split gap sits below QUIET_MS, so the LF lands before the next answer can go out
const ANSWER_EOL = process.env.PTY_ANSWER_EOL ?? 'lf';
const SPLIT_GAP_MS = 50;
if (!['lf', 'crlf', 'crlf-split'].includes(ANSWER_EOL)) {
  process.stderr.write(
    `PTY_ANSWER_EOL must be lf, crlf, or crlf-split; got ${ANSWER_EOL}\n`,
  );
  process.exit(1);
}

// write one answer with the line end PTY_ANSWER_EOL names
// .note = `crlf-split` splits every answer but the last. the split that matters lands between
//   two prompts; the last answer's late LF would reach a tty the child has already left raw, so
//   the tty would echo it as a stray blank line at a time the gap decides
const writeAnswer = (answer, isLast) => {
  if (ANSWER_EOL === 'lf') return child.stdin.write(answer + '\n');
  if (ANSWER_EOL === 'crlf' || isLast)
    return child.stdin.write(answer + '\r\n');
  child.stdin.write(answer + '\r');
  setTimeout(() => child.stdin.write('\n'), SPLIT_GAP_MS);
};

let answerIndex = 0;
let outputBuffer = '';
let answeredUpTo = 0;
let answerLast = null;
let quietTimer = null;

// `script` (util-linux) creates a real pseudo-TTY for the child
const child = spawn('script', ['-qec', cmd, '/dev/null'], {
  stdio: ['pipe', 'pipe', 'inherit'],
});

// send the next answer if a new prompt arrived since the last one
const answerIfPrompted = () => {
  if (answerIndex >= answers.length) return;

  // drop the echo of the last answer, so an answer that holds the pattern word is no prompt
  const segment = outputBuffer.slice(answeredUpTo);
  const segmentSansEcho =
    answerLast === null ? segment : segment.split(answerLast).join('');
  if (!new RegExp(promptPattern).test(segmentSansEcho)) return;

  answerLast = answers[answerIndex];
  answerIndex++;
  answeredUpTo = outputBuffer.length;
  writeAnswer(answerLast, answerIndex === answers.length);
};

child.stdout.on('data', (data) => {
  process.stdout.write(data);
  outputBuffer += data.toString();

  // wait for the child to go quiet before an answer
  if (quietTimer) clearTimeout(quietTimer);
  quietTimer = setTimeout(answerIfPrompted, QUIET_MS);
});

child.on('close', (code) => process.exit(code ?? 1));
