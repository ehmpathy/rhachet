import type { CloneInputState } from '../screen/computeCloneInputState';
import {
  type CloneDispatchPrecheck,
  computeCloneDispatchPrecheck,
} from './computeCloneDispatchPrecheck';

// a classified input state at a given focus/region, for the precheck fixtures
const stateOf = (input: {
  focus?: CloneInputState['focus'];
  region?: CloneInputState['input'];
}): CloneInputState => ({
  focus: input.focus ?? 'input',
  input: input.region ?? 'clear',
  countInInput: 0,
  countOnScreen: 0,
  // the precheck decides on `focus` + `input` alone — a queue is downstream of the write, so it
  // asserts naught about whether the write is SAFE. an empty queue is the neutral fixture
  queued: false,
});

const TEST_CASES: {
  description: string;
  given: { state: CloneInputState; force: boolean };
  expect: CloneDispatchPrecheck;
}[] = [
  {
    description: 'focus input + region clear → proceed',
    given: {
      state: stateOf({ focus: 'input', region: 'clear' }),
      force: false,
    },
    expect: { proceed: true },
  },
  {
    description:
      'a modal holds focus → withhold, modal-holds-focus (no force path)',
    given: { state: stateOf({ focus: 'modal' }), force: false },
    expect: { proceed: false, reason: 'modal-holds-focus' },
  },
  {
    description:
      'a modal holds focus, even under --force → still withheld (force cannot override a modal)',
    given: { state: stateOf({ focus: 'modal' }), force: true },
    expect: { proceed: false, reason: 'modal-holds-focus' },
  },
  {
    description:
      'an unrecognized screen → withhold, focus-unrecognized (no force path)',
    given: { state: stateOf({ focus: 'unrecognized' }), force: false },
    expect: { proceed: false, reason: 'focus-unrecognized' },
  },
  {
    description:
      'an unrecognized screen, even under --force → still withheld (force cannot override focus)',
    given: { state: stateOf({ focus: 'unrecognized' }), force: true },
    expect: { proceed: false, reason: 'focus-unrecognized' },
  },
  {
    description:
      'focus input + region dirty, no force → withhold, input-region-dirty',
    given: {
      state: stateOf({ focus: 'input', region: 'dirty' }),
      force: false,
    },
    expect: { proceed: false, reason: 'input-region-dirty' },
  },
  {
    description:
      'focus input + region dirty, under --force → proceed (the one forceable refusal)',
    given: { state: stateOf({ focus: 'input', region: 'dirty' }), force: true },
    expect: { proceed: true },
  },
];

describe('computeCloneDispatchPrecheck', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(computeCloneDispatchPrecheck(thisCase.given)).toEqual(
        thisCase.expect,
      );
    }),
  );
});
