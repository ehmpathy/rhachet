import type { CloneGetReply } from './asCloneGetReply';
import { asCloneObservationScreen } from './asCloneObservationScreen';
import type { CloneSayBaseline } from './computeCloneSayBaseline';

const baseline: CloneSayBaseline = {
  transcriptCount: 0,
  countInInput: 1,
  countOnScreen: 2,
};

describe('asCloneObservationScreen', () => {
  it('a probe-blind reply maps to null — the honest degrade (V7)', () => {
    const reply: CloneGetReply = {
      probe: 'unsupported',
      reason: 'feed-not-live',
    };
    expect(asCloneObservationScreen({ reply, baseline })).toEqual(null);
  });

  it('a capable reply whose counts ROSE past the baseline reports both rises', () => {
    const reply: CloneGetReply = {
      probe: 'capable',
      state: {
        focus: 'input',
        input: 'clear',
        countInInput: 2,
        countOnScreen: 3,
        queued: false,
      },
    };
    expect(asCloneObservationScreen({ reply, baseline })).toEqual({
      focus: 'input',
      input: 'clear',
      countInInputRose: true,
      countOnScreenRose: true,
      queued: false,
    });
  });

  it('a capable reply whose counts did NOT rise reports both false — a prior echo is not this dispatch', () => {
    const reply: CloneGetReply = {
      probe: 'capable',
      state: {
        focus: 'input',
        input: 'dirty',
        countInInput: 1,
        countOnScreen: 2,
        queued: false,
      },
    };
    expect(asCloneObservationScreen({ reply, baseline })).toEqual({
      focus: 'input',
      input: 'dirty',
      countInInputRose: false,
      countOnScreenRose: false,
      queued: false,
    });
  });

  it('`queued` is carried THROUGH unchanged — never differenced against the baseline', () => {
    // 🔴 the one field that is NOT a rise. a count is cumulative, so a prior tick's echo must be
    // excluded by comparison against a pre-write baseline; a queue is a PRESENT-TENSE state, and
    // "does the queue hold a message NOW" is the whole question `enqueued` asks. were this
    // differenced, a dispatch that joined an ALREADY-busy queue would report `queued: false` —
    // and that is the commonest `enqueued` there is, so the mislabel would be the normal case
    const reply: CloneGetReply = {
      probe: 'capable',
      state: {
        focus: 'input',
        input: 'clear',
        // every count sits AT the baseline, so no rise is reported...
        countInInput: 1,
        countOnScreen: 2,
        // ...and `queued` still reads true, because it was never a comparison
        queued: true,
      },
    };
    expect(asCloneObservationScreen({ reply, baseline })).toEqual({
      focus: 'input',
      input: 'clear',
      countInInputRose: false,
      countOnScreenRose: false,
      queued: true,
    });
  });

  it('a capable reply against an UNMEASURED (null) baseline reports NO rise — a prior tick echo cannot mint a false enqueued (r006-i010-b1)', () => {
    // the pathological case: the baseline probe was blind (new clone, feed not yet attached),
    // so its counts are null. the feed then attaches mid-observe and the viewport already holds
    // a prior tick's echo of this same text (a daemon repeats one nudge — invariant 6). a
    // `post > 0` rise would read that stale echo as THIS dispatch and mint a false `enqueued`
    // on a dropped message. the null-baseline guard reports no rise, so the verdict falls to
    // the honest `absent` residual
    const blindBaseline: CloneSayBaseline = {
      transcriptCount: 0,
      countInInput: null,
      countOnScreen: null,
    };
    const reply: CloneGetReply = {
      probe: 'capable',
      state: {
        focus: 'input',
        input: 'clear',
        countInInput: 1,
        countOnScreen: 1,
        queued: false,
      },
    };
    expect(
      asCloneObservationScreen({ reply, baseline: blindBaseline }),
    ).toEqual({
      focus: 'input',
      input: 'clear',
      countInInputRose: false,
      countOnScreenRose: false,
      queued: false,
    });
  });
});
