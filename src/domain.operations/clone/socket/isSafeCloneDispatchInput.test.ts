import { isSafeCloneDispatchInput } from './isSafeCloneDispatchInput';

const TEST_CASES = [
  {
    description: 'plain text is safe',
    given: 'wrap up and commit what you have',
    expect: true,
  },
  {
    description: 'a multi-line plain message is safe',
    given: 'do this:\n1. build\n2. test',
    expect: true,
  },
  {
    description: 'an SGR color sequence is ALLOWED (the comms-relay usecase)',
    given: '\x1b[31mred alert\x1b[0m',
    expect: true,
  },
  {
    description: 'a multi-param SGR (bold + color) is allowed',
    given: '\x1b[1;31mbold red\x1b[0m',
    expect: true,
  },
  {
    description: 'a cursor-move CSI is rejected',
    given: 'hi\x1b[2Amoved up',
    expect: false,
  },
  {
    description: 'a screen-clear CSI is rejected',
    given: '\x1b[2Jcleared',
    expect: false,
  },
  {
    description: 'a bracketed-paste TERMINATOR (frame forgery) is rejected',
    given: 'escape\x1b[201~then raw',
    expect: false,
  },
  {
    description: 'a bracketed-paste OPENER is rejected',
    given: '\x1b[200~nested',
    expect: false,
  },
  {
    description: 'an OSC (set title / clipboard) is rejected',
    given: '\x1b]0;pwned\x07',
    expect: false,
  },
  {
    description: 'a bare ESC is rejected',
    given: 'danger\x1bhere',
    expect: false,
  },
  {
    description: 'a malformed CSI with no final byte is rejected',
    given: 'oops\x1b[12',
    expect: false,
  },
] as const;

describe('isSafeCloneDispatchInput', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(isSafeCloneDispatchInput({ message: thisCase.given })).toEqual(
        thisCase.expect,
      );
    }),
  );
});
