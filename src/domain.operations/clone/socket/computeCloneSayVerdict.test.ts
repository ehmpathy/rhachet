import {
  type CloneSayObservation,
  type CloneSayOutcome,
  computeCloneSayVerdict,
} from './computeCloneSayVerdict';

type Screen = NonNullable<CloneSayObservation['screen']>;

// a live screen read at a given rise/focus, for the observation fixtures
const screenLive = (input: {
  focus?: Screen['focus'];
  region?: Screen['input'];
  inInputRose?: boolean;
  onScreenRose?: boolean;
  queued?: boolean;
}): Screen => ({
  focus: input.focus ?? 'input',
  input: input.region ?? 'clear',
  countInInputRose: input.inInputRose ?? false,
  countOnScreenRose: input.onScreenRose ?? false,
  // an EMPTY queue by default — the idle peer, which is what every extant case here models.
  // a case that asserts the `enqueued`-over-`released` split opts in explicitly
  queued: input.queued ?? false,
});

const TEST_CASES: {
  description: string;
  given: CloneSayObservation;
  expect: CloneSayOutcome;
}[] = [
  {
    description:
      'a modal refusal → withheld, reason modal-holds-focus, not delivered (case=6)',
    given: {
      refusal: 'modal-holds-focus',
      transcriptRose: false,
      screen: screenLive({ focus: 'modal' }),
      probeReason: null,
    },
    expect: {
      verdict: 'withheld',
      reason: 'modal-holds-focus',
      probe: 'capable',
      delivered: false,
    },
  },
  {
    description:
      'a dirty-region refusal → withheld, reason input-region-dirty, not delivered (case=2)',
    given: {
      refusal: 'input-region-dirty',
      transcriptRose: false,
      screen: screenLive({ region: 'dirty' }),
      probeReason: null,
    },
    expect: {
      verdict: 'withheld',
      reason: 'input-region-dirty',
      probe: 'capable',
      delivered: false,
    },
  },
  {
    description:
      'an unrecognized-focus refusal → withheld, reason focus-unrecognized, not delivered (case=6 kin)',
    given: {
      refusal: 'focus-unrecognized',
      transcriptRose: false,
      screen: screenLive({ focus: 'unrecognized' }),
      probeReason: null,
    },
    expect: {
      verdict: 'withheld',
      reason: 'focus-unrecognized',
      probe: 'capable',
      delivered: false,
    },
  },
  {
    description:
      'the transcript rose → released, reason null, delivered (the primary fix)',
    given: {
      refusal: null,
      transcriptRose: true,
      screen: screenLive({ region: 'clear', onScreenRose: true }),
      probeReason: null,
    },
    expect: {
      verdict: 'released',
      reason: null,
      probe: 'capable',
      delivered: true,
    },
  },
  {
    description:
      'the transcript rose + an EMPTY queue outranks an enqueued-shaped box → released',
    given: {
      refusal: null,
      transcriptRose: true,
      screen: screenLive({
        region: 'clear',
        onScreenRose: true,
        queued: false,
      }),
      probeReason: null,
    },
    expect: {
      verdict: 'released',
      reason: null,
      probe: 'capable',
      delivered: true,
    },
  },
  {
    // 🔴 the clamp on the measured refutation of A1. this case read `released` until
    // 2026-09-18, on the vision's premise that a queued message stays OUT of the transcript
    // until it dispatches as a turn. a live peer mid-turn disproved it: the transcript rose
    // within 678ms for a message rendered in the queue region. so a rise alone can no longer
    // carry `released`, and this is the pair that holds that line
    description:
      'the transcript rose but the queue HOLDS it → enqueued, never released (case=1)',
    given: {
      refusal: null,
      transcriptRose: true,
      screen: screenLive({ region: 'clear', onScreenRose: true, queued: true }),
      probeReason: null,
    },
    expect: {
      verdict: 'enqueued',
      reason: null,
      probe: 'capable',
      delivered: true,
    },
  },
  {
    // a probe-blind read cannot know the queue, so the transcript stays its sole basis —
    // case=4's honest degrade. the queue gate binds a CAPABLE read only
    description:
      'the transcript rose on a probe-blind read → released, the queue gate does not bind',
    given: {
      refusal: null,
      transcriptRose: true,
      screen: null,
      probeReason: 'peer-probe-blind',
    },
    expect: {
      verdict: 'released',
      reason: 'peer-probe-blind',
      probe: 'unsupported',
      delivered: true,
    },
  },
  {
    description:
      'focus input + region clear + screen count rose, no transcript rise → enqueued (the screen leads the jsonl)',
    given: {
      refusal: null,
      transcriptRose: false,
      screen: screenLive({
        focus: 'input',
        region: 'clear',
        onScreenRose: true,
      }),
      probeReason: null,
    },
    expect: {
      verdict: 'enqueued',
      reason: null,
      probe: 'capable',
      delivered: true,
    },
  },
  {
    description:
      'the screen count did NOT rise, though region is clear → not enqueued, falls to absent',
    given: {
      refusal: null,
      transcriptRose: false,
      screen: screenLive({
        focus: 'input',
        region: 'clear',
        onScreenRose: false,
      }),
      probeReason: null,
    },
    expect: {
      verdict: 'absent',
      reason: 'no-rise-observed',
      probe: 'capable',
      delivered: true,
    },
  },
  {
    description:
      'our text still holds in the input region (countInInput rose) → buffered (case=3)',
    given: {
      refusal: null,
      transcriptRose: false,
      screen: screenLive({
        focus: 'input',
        region: 'dirty',
        inInputRose: true,
      }),
      probeReason: null,
    },
    expect: {
      verdict: 'buffered',
      reason: 'input-region-holds-text',
      probe: 'capable',
      delivered: true,
    },
  },
  {
    description:
      'the feed was never live and the transcript did not rise → unreadable, feed-not-live (case=4)',
    given: {
      refusal: null,
      transcriptRose: false,
      screen: null,
      probeReason: 'feed-not-live',
    },
    expect: {
      verdict: 'unreadable',
      reason: 'feed-not-live',
      probe: 'unsupported',
      delivered: true,
    },
  },
  {
    description:
      'an older peer cannot answer the probe and the transcript did not rise → unreadable, peer-probe-blind (case=4)',
    given: {
      refusal: null,
      transcriptRose: false,
      screen: null,
      probeReason: 'peer-probe-blind',
    },
    expect: {
      verdict: 'unreadable',
      reason: 'peer-probe-blind',
      probe: 'unsupported',
      delivered: true,
    },
  },
  {
    description:
      'a null screen carries no probe reason → unreadable defaults to feed-not-live',
    given: {
      refusal: null,
      transcriptRose: false,
      screen: null,
      probeReason: null,
    },
    expect: {
      verdict: 'unreadable',
      reason: 'feed-not-live',
      probe: 'unsupported',
      delivered: true,
    },
  },
  {
    description:
      'transcript rose but the feed was not live → released, carries feed-not-live so the success copy self-heals (r008-i004-b1)',
    given: {
      refusal: null,
      transcriptRose: true,
      screen: null,
      probeReason: 'feed-not-live',
    },
    expect: {
      verdict: 'released',
      reason: 'feed-not-live',
      probe: 'unsupported',
      delivered: true,
    },
  },
  {
    description:
      'transcript rose but the peer is probe-blind → released, carries peer-probe-blind so the success copy names re-enroll (r008-i004-b1)',
    given: {
      refusal: null,
      transcriptRose: true,
      screen: null,
      probeReason: 'peer-probe-blind',
    },
    expect: {
      verdict: 'released',
      reason: 'peer-probe-blind',
      probe: 'unsupported',
      delivered: true,
    },
  },
  {
    description:
      'transcript rose on a capable live read → released, reason null (no degrade to brief)',
    given: {
      refusal: null,
      transcriptRose: true,
      screen: screenLive({ region: 'clear', onScreenRose: true }),
      probeReason: null,
    },
    expect: {
      verdict: 'released',
      reason: null,
      probe: 'capable',
      delivered: true,
    },
  },
  {
    description:
      'no count rose and the region reads clear → absent, the residual',
    given: {
      refusal: null,
      transcriptRose: false,
      screen: screenLive({
        focus: 'input',
        region: 'clear',
        inInputRose: false,
        onScreenRose: false,
      }),
      probeReason: null,
    },
    expect: {
      verdict: 'absent',
      reason: 'no-rise-observed',
      probe: 'capable',
      delivered: true,
    },
  },
];

describe('computeCloneSayVerdict', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(computeCloneSayVerdict(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
