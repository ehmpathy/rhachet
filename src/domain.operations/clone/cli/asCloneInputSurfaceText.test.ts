import type { CloneGetReply } from '../socket/asCloneGetReply';
import { asCloneInputSurfaceText } from './asCloneInputSurfaceText';

/**
 * .what = a capable reply, with the state and content a case wants to drive
 * .why = every case here is about the RENDER, so the reply is hand-built. the state/content pair
 *   is produced by `computeCloneInputState` + `computeCloneInputContent`, each with its own unit
 *   suite — to drive them here would test them twice and the render not at all
 */
const asReply = (input: {
  focus?: 'input' | 'modal' | 'unrecognized';
  buffer?: string[];
  queue?: string[];
  queued?: boolean;
}): CloneGetReply => ({
  probe: 'capable',
  state: {
    focus: input.focus ?? 'input',
    input: (input.buffer ?? []).length > 0 ? 'dirty' : 'clear',
    countInInput: 0,
    countOnScreen: 0,
    queued: input.queued ?? (input.queue ?? []).length > 0,
  },
  content: { buffer: input.buffer ?? [], queue: input.queue ?? [] },
});

describe('asCloneInputSurfaceText — the false-clear clamps', () => {
  test('🔴 a MODAL screen → could not be read, never "clear"', () => {
    // the probe ANSWERED, so `probe: capable` holds and the content read honestly returns zero
    // rows — a modal screen has no locatable input band. those zero rows must not render as
    // "the input box is clear": that is the exact false clear `rule.forbid.failhide` names, and
    // a caller who read it would send a say that answers the modal (V3, case=6)
    const text = asCloneInputSurfaceText({
      reply: asReply({ focus: 'modal' }),
      what: 'buffer',
      address: '@:x',
    });
    expect(text).toContain('could not be read');
    expect(text).toContain('modal');
    // 🟡 the clamp targets the EXACT false-clear sentence, never the substring `clear` — the
    // modal's own fix line says the human must have "cleared" it, which a substring match would
    // read as the defect. a clamp that fires on the correct render is a clamp nobody keeps
    expect(text).not.toContain('the input box is clear');
  });

  test('🔴 an UNRECOGNIZED screen → could not be read, and names the permanent cause', () => {
    // the two measured causes are permanent (a 0x0 pty geometry, a detached host with no tty), so
    // the fix is a re-enroll rather than a wait — the same dead-end the say hint already names
    const text = asCloneInputSurfaceText({
      reply: asReply({ focus: 'unrecognized' }),
      what: 'queue',
      address: '@:x',
    });
    expect(text).toContain('could not be read');
    expect(text).toContain('re-enroll');
  });

  test('a probe-blind reply → its own cause and fix, never an empty surface', () => {
    const text = asCloneInputSurfaceText({
      reply: { probe: 'unsupported', reason: 'feed-not-live' },
      what: 'buffer',
      address: '@:x',
    });
    expect(text).toContain('could not be read');
    expect(text).toContain('feed-not-live');
  });

  test('🔴 an older daemon that predates the content field → could not be read', () => {
    // `probe: capable` with no `content` means the daemon answers a probe and was built before
    // this read existed. an empty render would claim a box it never looked at
    const text = asCloneInputSurfaceText({
      reply: {
        probe: 'capable',
        state: {
          focus: 'input',
          input: 'clear',
          countInInput: 0,
          countOnScreen: 0,
          queued: false,
        },
      },
      what: 'buffer',
      address: '@:x',
    });
    expect(text).toContain('could not be read');
    expect(text).toContain('predates');
  });
});

describe('asCloneInputSurfaceText — the real answers', () => {
  test('a clear box on an `input` screen → clear, and says what that permits', () => {
    // this is the ONE case where zero rows is a true "clear": the probe answered, the screen is
    // on its input box, and the band held no text
    const text = asCloneInputSurfaceText({
      reply: asReply({ buffer: [] }),
      what: 'buffer',
      address: '@:x',
    });
    expect(text).toContain('the input box is clear');
    expect(text).toContain('a say would land');
  });

  test('an empty queue → empty, and says what that means about the brain', () => {
    const text = asCloneInputSurfaceText({
      reply: asReply({ queue: [], queued: false }),
      what: 'queue',
      address: '@:x',
    });
    expect(text).toContain('the queue is empty');
  });

  test('a non-empty box → one indexed row per line, plus the growth read', () => {
    const text = asCloneInputSurfaceText({
      reply: asReply({ buffer: ['party', 'time'] }),
      what: 'buffer',
      address: '@:x',
    });
    expect(text).toContain('holds 2 row(s)');
    expect(text).toContain('0 │ party');
    expect(text).toContain('1 │ time');
    expect(text).toContain('twice a second apart');
  });

  test('🔴 a non-empty queue → its rows, and its candidate-set bound stated', () => {
    // the bound carries real weight: the rows above the band hold a queued message and a released
    // turn alike (measured 2026-09-18), so the count is provable and a given row is not. a render
    // that omitted the caveat would have a caller treat each row as proof of membership
    const text = asCloneInputSurfaceText({
      reply: asReply({ queue: ['SENTINEL-one'] }),
      what: 'queue',
      address: '@:x',
    });
    expect(text).toContain('the queue holds 1 row(s)');
    expect(text).toContain('0 │ SENTINEL-one');
    expect(text).toContain('a candidate set');
  });

  test('the render answers ONE surface, never both', () => {
    // a `--what buffer` that also printed the queue would widen the read past what was asked, and
    // the two surfaces answer different questions
    const reply = asReply({ buffer: ['in-the-box'], queue: ['in-the-queue'] });
    const buffer = asCloneInputSurfaceText({
      reply,
      what: 'buffer',
      address: '@:x',
    });
    expect(buffer).toContain('in-the-box');
    expect(buffer).not.toContain('in-the-queue');

    const queue = asCloneInputSurfaceText({
      reply,
      what: 'queue',
      address: '@:x',
    });
    expect(queue).toContain('in-the-queue');
    expect(queue).not.toContain('in-the-box');
  });
});
