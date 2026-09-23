import {
  type CloneSayPollRead,
  type CloneSayPollStep,
  computeCloneSayPollStep,
} from './computeCloneSayPollStep';

// the enqueued SHAPE — focus input, region clear, screen count rose (isCloneSayEnqueuedShape true).
// `queued: false` here, so the shape alone is modelled apart from the queue read: this is the
// IN-FLIGHT RELEASE screen (the box cleared, the echo landed, the jsonl has not caught up)
const ENQUEUED_SCREEN: CloneSayPollRead['screen'] = {
  focus: 'input',
  input: 'clear',
  countInInputRose: false,
  countOnScreenRose: true,
  queued: false,
};

// the same shape with the brain's queue NON-EMPTY — the genuinely-held dispatch. it is what a
// busy peer renders, and the transcript rises for it too (the brain writes the turn on submit),
// so this is the screen that parts `enqueued` from `released`
const QUEUED_SCREEN: CloneSayPollRead['screen'] = {
  focus: 'input',
  input: 'clear',
  countInInputRose: false,
  countOnScreenRose: true,
  queued: true,
};

// the buffered shape — our text still sits in the input region (its count rose there)
const BUFFERED_SCREEN: CloneSayPollRead['screen'] = {
  focus: 'input',
  input: 'clear',
  countInInputRose: true,
  countOnScreenRose: false,
  queued: false,
};

// the residual shape — a read that is neither enqueued nor buffered (no rise anywhere)
const RESIDUAL_SCREEN: CloneSayPollRead['screen'] = {
  focus: 'input',
  input: 'clear',
  countInInputRose: false,
  countOnScreenRose: false,
  queued: false,
};

const TEST_CASES: {
  description: string;
  given: CloneSayPollRead;
  expect: CloneSayPollStep;
}[] = [
  {
    description:
      'a transcript rise is terminal for target enqueue, on cycle 0 — released outranks all',
    given: {
      transcriptRose: true,
      screen: ENQUEUED_SCREEN,
      probeReason: null,
      target: 'enqueue',
      cyclesElapsed: 0,
      deadlineReached: false,
    },
    expect: {
      done: true,
      observation: {
        refusal: null,
        transcriptRose: true,
        screen: ENQUEUED_SCREEN,
        probeReason: null,
      },
    },
  },
  {
    description:
      'a transcript rise is terminal for target release too — the strongest observation',
    given: {
      transcriptRose: true,
      screen: null,
      probeReason: 'feed-not-live',
      target: 'release',
      cyclesElapsed: 3,
      deadlineReached: false,
    },
    expect: {
      done: true,
      observation: {
        refusal: null,
        transcriptRose: true,
        screen: null,
        probeReason: 'feed-not-live',
      },
    },
  },
  {
    // 🔴 the clamp on the measured refutation of A1 (2026-09-18): the brain writes the user turn
    // to the jsonl on SUBMIT, so a busy peer raises the transcript for a message it has merely
    // held. with the released branch on the rise alone this returned terminal at cycle 0 and
    // `enqueued` was unreachable in production; the queue read is what holds the line
    description:
      'a transcript rise with a NON-EMPTY queue is not terminal on cycle 0 — the rise proves submit, never release',
    given: {
      transcriptRose: true,
      screen: QUEUED_SCREEN,
      probeReason: null,
      target: 'enqueue',
      cyclesElapsed: 0,
      deadlineReached: false,
    },
    expect: { done: false },
  },
  {
    description:
      'a transcript rise with a NON-EMPTY queue lands enqueued on cycle 1 — target enqueue is satisfied by the hold (case=1)',
    given: {
      transcriptRose: true,
      screen: QUEUED_SCREEN,
      probeReason: null,
      target: 'enqueue',
      cyclesElapsed: 1,
      deadlineReached: false,
    },
    expect: {
      done: true,
      observation: {
        // 🔴 `true`, the MEASURED value. this case had encoded the misreport: the enqueued branch
        // hardcoded a `false` here, so the fixture asserted a fact contrary to its own `given`.
        // it is the very pair this wish rests on — a rise beside a non-empty queue — so the
        // hardcode erased the discovery from the report built to show it
        transcriptRose: true,
        refusal: null,
        screen: QUEUED_SCREEN,
        probeReason: null,
      },
    },
  },
  {
    // the knob this repairs: `--await release` polls ON past a submit, since the queue still
    // holds the message. before the queue read it returned at the first rise, so it waited for
    // a submit and called it a release
    description:
      'target release + a transcript rise with a NON-EMPTY queue is NOT terminal — release owes an empty queue',
    given: {
      transcriptRose: true,
      screen: QUEUED_SCREEN,
      probeReason: null,
      target: 'release',
      cyclesElapsed: 7,
      deadlineReached: false,
    },
    expect: { done: false },
  },
  {
    description:
      'target release + a transcript rise once the queue DRAINED is terminal — released',
    given: {
      transcriptRose: true,
      screen: ENQUEUED_SCREEN,
      probeReason: null,
      target: 'release',
      cyclesElapsed: 8,
      deadlineReached: false,
    },
    expect: {
      done: true,
      observation: {
        refusal: null,
        transcriptRose: true,
        screen: ENQUEUED_SCREEN,
        probeReason: null,
      },
    },
  },
  {
    description:
      '[case=5 guard] target enqueue + enqueued shape on cycle 0 is NOT terminal — the first cycle is reserved for the transcript to settle',
    given: {
      transcriptRose: false,
      screen: ENQUEUED_SCREEN,
      probeReason: null,
      target: 'enqueue',
      cyclesElapsed: 0,
      deadlineReached: false,
    },
    expect: { done: false },
  },
  {
    description:
      '[case=5 guard] target enqueue + enqueued shape on cycle 1 IS terminal — the busy brain held it past the settle window',
    given: {
      transcriptRose: false,
      screen: ENQUEUED_SCREEN,
      probeReason: null,
      target: 'enqueue',
      cyclesElapsed: 1,
      deadlineReached: false,
    },
    expect: {
      done: true,
      observation: {
        refusal: null,
        transcriptRose: false,
        screen: ENQUEUED_SCREEN,
        probeReason: null,
      },
    },
  },
  {
    description:
      'target release + enqueued shape is NOT terminal, however many cycles elapsed — release owes a transcript rise',
    given: {
      transcriptRose: false,
      screen: ENQUEUED_SCREEN,
      probeReason: null,
      target: 'release',
      cyclesElapsed: 9,
      deadlineReached: false,
    },
    expect: { done: false },
  },
  {
    description:
      'target release + enqueued shape at the deadline IS terminal — the residual, no transcript rise',
    given: {
      transcriptRose: false,
      screen: ENQUEUED_SCREEN,
      probeReason: null,
      target: 'release',
      cyclesElapsed: 9,
      deadlineReached: true,
    },
    expect: {
      done: true,
      observation: {
        refusal: null,
        transcriptRose: false,
        screen: ENQUEUED_SCREEN,
        probeReason: null,
      },
    },
  },
  {
    description:
      'the deadline is terminal on a buffered read — the residual hands back the last screen',
    given: {
      transcriptRose: false,
      screen: BUFFERED_SCREEN,
      probeReason: null,
      target: 'enqueue',
      cyclesElapsed: 4,
      deadlineReached: true,
    },
    expect: {
      done: true,
      observation: {
        refusal: null,
        transcriptRose: false,
        screen: BUFFERED_SCREEN,
        probeReason: null,
      },
    },
  },
  {
    description:
      'the deadline is terminal on a probe-blind read — screen null, the probe-blind cause carried through',
    given: {
      transcriptRose: false,
      screen: null,
      probeReason: 'peer-probe-blind',
      target: 'enqueue',
      cyclesElapsed: 4,
      deadlineReached: true,
    },
    expect: {
      done: true,
      observation: {
        refusal: null,
        transcriptRose: false,
        screen: null,
        probeReason: 'peer-probe-blind',
      },
    },
  },
  {
    description:
      'a residual read before the deadline is NOT terminal — poll again',
    given: {
      transcriptRose: false,
      screen: RESIDUAL_SCREEN,
      probeReason: null,
      target: 'enqueue',
      cyclesElapsed: 2,
      deadlineReached: false,
    },
    expect: { done: false },
  },
];

describe('computeCloneSayPollStep', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(computeCloneSayPollStep(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});

// 🔴 the observation handed back must STATE what was measured. found 2026-09-18 by a dogfood of
// the `--debug` capture: the enqueued branch hardcoded `transcriptRose: false`, so the decision
// block read `transcriptRose false` while its own trail row for the SAME cycle read `true`. two
// views of one measurement, in disagreement — and the view that disagreed was the one a reader
// consults to diagnose a verdict.
//
// the cost is not cosmetic. the pair `transcriptRose=true` beside `queued=true` IS the discovery
// this wish rests on (a rise proves submit, never release), and the hardcode erased exactly that
// pair from the instrument built to show it.
//
// verdict-neutrality is why the repair is safe, and these clamp it: the verdict's `released`
// branch is gated on an empty queue, so a `true` carried through cannot reach it
describe('computeCloneSayPollStep — the observation states the MEASURED rise, never a hardcoded false', () => {
  test('the enqueued branch carries a TRUE rise through — the queued-plus-risen pair survives', () => {
    const step = computeCloneSayPollStep({
      // the measured shape: the brain wrote the user turn at submit AND still holds the message
      transcriptRose: true,
      screen: QUEUED_SCREEN,
      probeReason: null,
      target: 'enqueue',
      cyclesElapsed: 1,
      deadlineReached: false,
    });
    expect(step).toEqual({
      done: true,
      observation: {
        refusal: null,
        transcriptRose: true,
        screen: QUEUED_SCREEN,
        probeReason: null,
      },
    });
  });

  test('a FALSE rise stays false — the carry-through invents no rise either', () => {
    // the other direction of the same clamp: it reports what was read, whichever way
    const step = computeCloneSayPollStep({
      transcriptRose: false,
      screen: QUEUED_SCREEN,
      probeReason: null,
      target: 'enqueue',
      cyclesElapsed: 1,
      deadlineReached: false,
    });
    expect(step).toEqual({
      done: true,
      observation: {
        refusal: null,
        transcriptRose: false,
        screen: QUEUED_SCREEN,
        probeReason: null,
      },
    });
  });

  test('the DEADLINE residual carries its rise through too — where a reader looks hardest', () => {
    // reachable with a rise: target `release`, a risen transcript, a non-empty queue. the
    // released branch is gated by the queue and the enqueued branch by the target, so the read
    // falls to the residual WITH a measured rise in hand
    const step = computeCloneSayPollStep({
      transcriptRose: true,
      screen: QUEUED_SCREEN,
      probeReason: null,
      target: 'release',
      cyclesElapsed: 4,
      deadlineReached: true,
    });
    expect(step).toEqual({
      done: true,
      observation: {
        refusal: null,
        transcriptRose: true,
        screen: QUEUED_SCREEN,
        probeReason: null,
      },
    });
  });
});
