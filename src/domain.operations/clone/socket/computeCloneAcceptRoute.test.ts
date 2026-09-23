import {
  type CloneAcceptRoute,
  computeCloneAcceptRoute,
} from './computeCloneAcceptRoute';

/**
 * .what = unit tests for the pure accept-time frame classifier
 * .why = the socket server's accept loop reads this to route each frame; the decision was
 *   provable only at the integration grain before the r011-i007-n3 split. these cases lock the
 *   three routes and — above all — the reject-reason ORDER the old inline gates enforced
 */
const TEST_CASES: {
  description: string;
  given: { frame: string };
  expect: CloneAcceptRoute;
}[] = [
  {
    description: 'a non-json frame → reject not-valid-json',
    given: { frame: 'this-is-not-json' },
    expect: { route: 'reject', reason: 'not-valid-json' },
  },
  {
    description:
      'a probe frame → route probe, carries its needle, debug + content OFF by default',
    given: { frame: JSON.stringify({ kind: 'probe', needle: 'SENTINEL' }) },
    expect: {
      route: 'probe',
      needle: 'SENTINEL',
      debug: false,
      content: false,
    },
  },
  {
    description: 'a probe frame with no needle → route probe, empty needle',
    given: { frame: JSON.stringify({ kind: 'probe' }) },
    expect: { route: 'probe', needle: '', debug: false, content: false },
  },
  {
    description:
      'a probe frame with debug:true → route probe, the raw grid is opted in',
    given: {
      frame: JSON.stringify({ kind: 'probe', needle: 'SENTINEL', debug: true }),
    },
    expect: {
      route: 'probe',
      needle: 'SENTINEL',
      debug: true,
      content: false,
    },
  },
  {
    // the NARROW opt-in, and it is independent of `debug`: a `clone get --what buffer` asks
    // for the two input surfaces and never for the whole viewport, so the wide grant stays OFF
    description:
      'a probe frame with content:true → the input surfaces are opted in, the grid stays OFF',
    given: {
      frame: JSON.stringify({ kind: 'probe', content: true }),
    },
    expect: { route: 'probe', needle: '', debug: false, content: true },
  },
  {
    // a truthy non-boolean must NOT opt in: the grid is screen bytes, so the gate that
    // keeps the socket a classifier (F02/F03) may not be tripped by a loose wire value
    description:
      'a probe frame with a truthy non-boolean debug → debug stays OFF',
    given: { frame: JSON.stringify({ kind: 'probe', debug: 'yes' }) },
    expect: { route: 'probe', needle: '', debug: false, content: false },
  },
  {
    // the same gate on the narrow grant — `content` is screen text too, so a loose wire
    // value may not trip it either
    description:
      'a probe frame with a truthy non-boolean content → content stays OFF',
    given: { frame: JSON.stringify({ kind: 'probe', content: 1 }) },
    expect: { route: 'probe', needle: '', debug: false, content: false },
  },
  {
    description: 'an unknown kind → reject not-a-say',
    given: { frame: JSON.stringify({ kind: 'shout', message: 'hi' }) },
    expect: { route: 'reject', reason: 'not-a-say' },
  },
  {
    description: 'a say with a non-string message → reject not-a-say',
    given: { frame: JSON.stringify({ kind: 'say', message: 42 }) },
    expect: { route: 'reject', reason: 'not-a-say' },
  },
  {
    description: 'a well-formed say → route say, force defaults false',
    given: { frame: JSON.stringify({ kind: 'say', message: 'hello clone' }) },
    expect: { route: 'say', message: 'hello clone', force: false },
  },
  {
    description: 'a say with force:true → route say, force true',
    given: {
      frame: JSON.stringify({ kind: 'say', message: 'hello', force: true }),
    },
    expect: { route: 'say', message: 'hello', force: true },
  },
  {
    description: 'a say with force as a non-boolean → force coerces to false',
    given: {
      frame: JSON.stringify({ kind: 'say', message: 'hello', force: 'yes' }),
    },
    expect: { route: 'say', message: 'hello', force: false },
  },
  {
    description:
      'a say that holds a terminal-control escape → reject disallowed-control',
    given: {
      // a cursor-move CSI (ESC [ 2 J) — the content gate must refuse it
      frame: JSON.stringify({ kind: 'say', message: 'x\u001b[2Jy' }),
    },
    expect: { route: 'reject', reason: 'disallowed-control' },
  },
  {
    description:
      'the ORDER holds — a disallowed-control say rejects on content, never falls through to say',
    given: {
      frame: JSON.stringify({
        kind: 'say',
        message: '\u001b]0;title\u0007',
        force: true,
      }),
    },
    // even with force:true, a message with an OSC is a content reject, not a forced say —
    // the content gate precedes any downstream effect, exactly as the old inline order ran
    expect: { route: 'reject', reason: 'disallowed-control' },
  },
];

describe('computeCloneAcceptRoute', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(computeCloneAcceptRoute(thisCase.given)).toEqual(thisCase.expect);
    }),
  );

  test('SGR color is allowed through as a say (color cannot escape the input channel)', () => {
    // an SGR CSI (ESC [ 3 1 m) is the one escape the content gate permits
    const route = computeCloneAcceptRoute({
      frame: JSON.stringify({ kind: 'say', message: '\u001b[31mred\u001b[0m' }),
    });
    expect(route.route).toEqual('say');
  });
});
