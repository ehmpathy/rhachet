import { isBrainCliPrintMode } from './isBrainCliPrintMode';

/**
 * .what = does the passthrough declare a print-mode invocation — one whose child owes
 *   an answer on stdout and exits once it has given one?
 * .why = this is the input the mode derivation was MISSING. `computeCloneEnrollMode`
 *   read the tty alone, so a no-tty `enroll … -p '<prompt>'` derived `async`, detached,
 *   and returned an enroll banner where its caller was owed the brain's answer
 */
const TEST_CASES: {
  description: string;
  given: { passthrough: string[] };
  expect: boolean;
}[] = [
  {
    description:
      '[case1] the measured defect row — a guard lane forwards `-p <prompt>`',
    given: {
      passthrough: [
        '--model',
        'claude-sonnet-5[1m]',
        '-p',
        'review the diff for snapshot coverage',
      ],
    },
    expect: true,
  },
  {
    description: '[case2] the long form is the same invocation',
    given: { passthrough: ['--print', 'answer this'] },
    expect: true,
  },
  {
    description: '[case3] a session enroll carries no print flag',
    given: { passthrough: ['--model', 'claude-sonnet-5[1m]'] },
    expect: false,
  },
  {
    description: '[case4] an empty passthrough is a session',
    given: { passthrough: [] },
    expect: false,
  },
  {
    description:
      '[case5] a `-p` INSIDE a prompt value is not a flag — args are tokenized, so the prompt is one token',
    given: { passthrough: ['-p', 'compare -p against --print'] },
    expect: true,
  },
  {
    description:
      '[case6] only the whole token counts — a longer flag that merely starts with -p is not print mode',
    given: { passthrough: ['--permission-mode', 'plan'] },
    expect: false,
  },
  {
    description:
      '[case7] and neither is a prompt that happens to mention the flag, with no flag present',
    given: { passthrough: ['--model', 'pass -p to print'] },
    expect: false,
  },
];

describe('isBrainCliPrintMode', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(
        isBrainCliPrintMode({ passthrough: thisCase.given.passthrough }),
      ).toEqual(thisCase.expect);
    }),
  );
});
