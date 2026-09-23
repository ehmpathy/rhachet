import { getError } from 'test-fns';

import { asCloneGetReply } from './asCloneGetReply';
import { asCloneGetReplyFrame } from './asCloneGetReplyFrame';
import { CloneWireCorruptionError } from './CloneWireCorruptionError';

describe('asCloneGetReply + asCloneGetReplyFrame', () => {
  test('a capable reply round-trips through frame + parse', () => {
    const frame = asCloneGetReplyFrame({
      reply: {
        probe: 'capable',
        state: {
          focus: 'input',
          input: 'dirty',
          countInInput: 1,
          countOnScreen: 1,
          queued: true,
        },
      },
    });
    expect(frame.endsWith('\n')).toBe(true);
    const parsed = asCloneGetReply({ line: frame.trimEnd() });
    expect(parsed).toEqual({
      probe: 'capable',
      state: {
        focus: 'input',
        input: 'dirty',
        countInInput: 1,
        countOnScreen: 1,
        queued: true,
      },
    });
  });

  test('an unsupported reply carries the feed-not-live degrade', () => {
    const frame = asCloneGetReplyFrame({
      reply: { probe: 'unsupported', reason: 'feed-not-live' },
    });
    const parsed = asCloneGetReply({ line: frame.trimEnd() });
    expect(parsed).toEqual({ probe: 'unsupported', reason: 'feed-not-live' });
  });

  test('an unsupported reply carries the feed-faulted degrade (distinct from feed-not-live)', () => {
    // a faulted emulator is a DISTINCT probe-blind cause: the wire declares it, and the
    // parse must preserve it — a flatten to feed-not-live would misstate the fix (a
    // wait, where a re-enroll is owed)
    const frame = asCloneGetReplyFrame({
      reply: { probe: 'unsupported', reason: 'feed-faulted' },
    });
    const parsed = asCloneGetReply({ line: frame.trimEnd() });
    expect(parsed).toEqual({ probe: 'unsupported', reason: 'feed-faulted' });
  });

  test('an unsupported reply with a PRESENT unknown reason → peer-probe-blind (the re-enroll remedy, r7-n1)', () => {
    // a reason the wire named but this client does not know — a newer peer's slug, a corrupt
    // producer. it must fall to the re-enroll remedy, NOT the milder feed-not-live "wait": for
    // a cause we cannot classify, "wait forever" is the hazardous default rule.forbid.failhide bars
    const parsed = asCloneGetReply({
      line: JSON.stringify({ probe: 'unsupported', reason: 'some-new-slug' }),
    });
    expect(parsed).toEqual({
      probe: 'unsupported',
      reason: 'peer-probe-blind',
    });
  });

  test('an unsupported reply that OMITS its reason → feed-not-live (the milder wait default)', () => {
    // an under-specified reply that named no cause at all keeps the mild wait default — an
    // omitted reason is plausibly a transient serialization gap, not an unclassifiable cause
    const parsed = asCloneGetReply({
      line: JSON.stringify({ probe: 'unsupported' }),
    });
    expect(parsed).toEqual({ probe: 'unsupported', reason: 'feed-not-live' });
  });

  test('a non-json reply line fails loud as a CloneWireCorruptionError', async () => {
    const error = await getError(() => asCloneGetReply({ line: 'not json' }));
    expect(error).toBeInstanceOf(CloneWireCorruptionError);
  });

  test('an unknown probe fails loud as a CloneWireCorruptionError', async () => {
    const error = await getError(() =>
      asCloneGetReply({ line: JSON.stringify({ probe: 'weird' }) }),
    );
    expect(error).toBeInstanceOf(CloneWireCorruptionError);
  });

  test('an older daemon replies with a dispatch ack → degrade to peer-probe-blind (case=4)', () => {
    // an older daemon predates the `probe` kind, so it parses our probe as an
    // invalid say and replies with a dispatch ack (a `phase`, no `probe`)
    const parsed = asCloneGetReply({
      line: JSON.stringify({ phase: 'rejected', reason: 'unknown kind' }),
    });
    expect(parsed).toEqual({
      probe: 'unsupported',
      reason: 'peer-probe-blind',
    });
  });

  test('a capable reply with a malformed state fails loud as a CloneWireCorruptionError', async () => {
    const error = await getError(() =>
      asCloneGetReply({
        line: JSON.stringify({ probe: 'capable', state: { focus: 'weird' } }),
      }),
    );
    expect(error).toBeInstanceOf(CloneWireCorruptionError);
  });

  test('a capable reply that OMITS `queued` → degrade to peer-probe-blind, never a defaulted false', () => {
    // 🔴 `queued` is the ONE field that parts `enqueued` from `released` (the transcript rose at
    // SUBMIT, so a rise is satisfied by both — measured 2026-09-18). a default of `false` would
    // read every busy peer as `released`, which is the exact mislabel the field exists to close,
    // laundered through a fallback. so this must NEVER return a capable state.
    //
    // and it must not THROW either: a state well-formed on every field that existed when the
    // peer spawned is version SKEW, not corruption — an INTERMEDIATE daemon, older than the
    // field and newer than the read channel. a throw here refuses to dispatch at all against an
    // otherwise-healthy clone, the exact false-failure class this wish exists to kill (measured
    // 2026-09-20: a live 2026-09-16 daemon made `say` unusable). so it degrades in the RE-ENROLL
    // direction — a wait never grows the peer a field it does not ship
    const parsed = asCloneGetReply({
      line: JSON.stringify({
        probe: 'capable',
        state: {
          focus: 'input',
          input: 'clear',
          countInInput: 1,
          countOnScreen: 1,
        },
      }),
    });
    expect(parsed).toEqual({
      probe: 'unsupported',
      reason: 'peer-probe-blind',
    });
  });

  test('a capable reply that omits `queued` AND malforms a field still fails loud', async () => {
    // the skew degrade is narrow by construction: it fires only when every OTHER field is
    // well-formed. a state that is also malformed elsewhere is real corruption, and the
    // degrade must not launder it into a benign probe-blind read (rule.forbid.failhide)
    const error = await getError(() =>
      asCloneGetReply({
        line: JSON.stringify({
          probe: 'capable',
          state: {
            focus: 'weird',
            input: 'clear',
            countInInput: 1,
            countOnScreen: 1,
          },
        }),
      }),
    );
    expect(error).toBeInstanceOf(CloneWireCorruptionError);
  });

  // ── the OPTIONAL debug grid ──────────────────────────────────────────────────────────
  //
  // 🔴 the grid parse carried NO clamp until 2026-09-18, and that gap is how a real defect
  // landed: `CloneScreenLive` gained a required `linesBright` field (the dim signal the
  // dirty/clear read decides on) and the guard was never taught to check it. so a peer that
  // omitted it passed the guard, got cast to a type that DECLARES `linesBright: string[]`,
  // and handed a consumer an `undefined` typed as an array — a crash the compiler cannot see.
  //
  // the grid is diagnostic-only, so the correct answer to a malformed one is to DROP it and
  // keep the state (a throw would kill a say whose bytes already landed). these clamp both
  // halves: the drop, and the survival of the state beside it

  const STATE = {
    focus: 'input' as const,
    input: 'dirty' as const,
    countInInput: 1,
    countOnScreen: 1,
    queued: false,
  };

  const GRID_LINES = ['● a turn', '─────', '❯ a box', '─────'];

  test('a capable reply with a WELL-FORMED grid keeps the grid, linesBright included', () => {
    const grid = {
      live: true,
      lines: GRID_LINES,
      linesBright: ['● a turn', '─────', '', '─────'],
      cursorX: 2,
      cursorY: 2,
      cols: 40,
      rows: 4,
    };
    const parsed = asCloneGetReply({
      line: JSON.stringify({ probe: 'capable', state: STATE, grid }),
    });
    expect(parsed).toEqual({ probe: 'capable', state: STATE, grid });
  });

  test('a grid that OMITS linesBright is DROPPED — never cast to a type that declares it', () => {
    // goes RED under the pre-cure guard, which validated `lines` alone and let the cast
    // through. the drop is the fail-safe direction: a diagnostic is lost, a say is not
    const parsed = asCloneGetReply({
      line: JSON.stringify({
        probe: 'capable',
        state: STATE,
        grid: {
          live: true,
          lines: GRID_LINES,
          cursorX: 2,
          cursorY: 2,
          cols: 40,
          rows: 4,
        },
      }),
    });
    expect(parsed).toEqual({ probe: 'capable', state: STATE });
  });

  test('a grid whose linesBright LENGTH mismatches is DROPPED — the pair must be index-aligned', () => {
    // the classifier slices BOTH grids with one row window and reads them as index-aligned
    // (getInputBand). a mismatched pair would read one screen's rules against another
    // screen's intensities, so it is not a usable grid at all
    const parsed = asCloneGetReply({
      line: JSON.stringify({
        probe: 'capable',
        state: STATE,
        grid: {
          live: true,
          lines: GRID_LINES,
          linesBright: ['● a turn'],
          cursorX: 2,
          cursorY: 2,
          cols: 40,
          rows: 4,
        },
      }),
    });
    expect(parsed).toEqual({ probe: 'capable', state: STATE });
  });

  test('a malformed grid NEVER kills the reply — the state survives the drop', () => {
    // the reason the grid is dropped rather than thrown on: a say reaches this parse only
    // after its bytes were delivered, so a throw over a log field would be the exact
    // false-failure-on-a-landed-message class this wish exists to kill
    const parsed = asCloneGetReply({
      line: JSON.stringify({
        probe: 'capable',
        state: STATE,
        grid: { live: true, lines: 'not an array' },
      }),
    });
    expect(parsed).toEqual({ probe: 'capable', state: STATE });
  });
});
