import { asHookDispatcherTimeoutSeconds } from './asHookDispatcherTimeoutSeconds';
import { HOOK_DISPATCH } from './constants';

const FLOOR = HOOK_DISPATCH.timeoutFloorSeconds;
const MARGIN = HOOK_DISPATCH.timeoutMarginSeconds;

const TEST_CASES = [
  {
    description: 'an event with no rules sits at the floor plus the margin',
    given: { rules: [], event: 'Stop' },
    expect: { output: FLOOR + MARGIN },
  },
  {
    description: 'rules within the floor leave the wire at the floor',
    given: {
      rules: [
        { event: 'PreToolUse', timeoutSeconds: 10 },
        { event: 'PreToolUse', timeoutSeconds: FLOOR },
      ],
      event: 'PreToolUse',
    },
    expect: { output: FLOOR + MARGIN },
  },
  {
    description:
      'a rule slower than the floor raises the wire to its own timeout',
    given: {
      rules: [
        { event: 'PreToolUse', timeoutSeconds: 10 },
        { event: 'PreToolUse', timeoutSeconds: FLOOR + 30 },
      ],
      event: 'PreToolUse',
    },
    expect: { output: FLOOR + 30 + MARGIN },
  },
  {
    description: 'a slow rule on another event leaves this wire at the floor',
    given: {
      rules: [{ event: 'Stop', timeoutSeconds: FLOOR + 30 }],
      event: 'PreToolUse',
    },
    expect: { output: FLOOR + MARGIN },
  },
];

describe('asHookDispatcherTimeoutSeconds', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asHookDispatcherTimeoutSeconds(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
