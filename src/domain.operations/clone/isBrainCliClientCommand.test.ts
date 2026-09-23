import { isBrainCliClientCommand } from './isBrainCliClientCommand';

// r029: the advisory on an `enqueued` say claimed the message is "held behind the active turn" and
// "dies with an aborted turn". both clauses are false for a `/…` client command, which the
// brain-cli consumes at SUBMIT and never places in the model's turn queue. measured 2026-09-20
// against this session's own clone — `/model` had already executed while the turn was still live
const TEST_CASES: {
  description: string;
  given: { message: string };
  expect: boolean;
}[] = [
  {
    description: 'a `/model` command → a client command',
    given: { message: '/model claude-sonnet-5[1m]' },
    expect: true,
  },
  {
    description: 'a bare `/` → a client command (the command picker)',
    given: { message: '/' },
    expect: true,
  },
  {
    description: 'a plain prompt → not a client command',
    given: { message: 'reply with exactly PONG' },
    expect: false,
  },
  {
    // the boundary that keeps the prefix test honest: the client reads a space before the slash as
    // prose, so an indented slash IS a prompt and the turn-hold advisory is correct for it
    description:
      'a slash with a space before it → a PROMPT, not a client command',
    given: { message: ' /model claude-sonnet-5[1m]' },
    expect: false,
  },
  {
    // a prompt may MENTION a slash mid-sentence; only the head position makes it a command
    description: 'a slash mid-sentence → not a client command',
    given: { message: 'run /model to switch the brain' },
    expect: false,
  },
  {
    // a newline before the slash is whitespace at the head too — the client sees an empty first
    // line, so the submit is prose. trimStart covers it, and this row states that it must
    description: 'a newline before the slash → not a client command',
    given: { message: '\n/model claude-sonnet-5[1m]' },
    expect: false,
  },
  {
    description: 'an empty message → not a client command',
    given: { message: '' },
    expect: false,
  },
];

describe('isBrainCliClientCommand', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isBrainCliClientCommand(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
