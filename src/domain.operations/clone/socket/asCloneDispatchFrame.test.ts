import { asCloneDispatchFrame } from './asCloneDispatchFrame';
import { CLONE_PASTE_CLOSE, CLONE_PASTE_OPEN, CLONE_SUBMIT } from './constants';

describe('asCloneDispatchFrame', () => {
  test('returns a single-line message byte-identical to the bulk-write path', () => {
    // a single-line message has no interior `\n`, so it is returned UNWRAPPED — the proven
    // bulk-write hot path is untouched by the multi-line cure
    const frame = asCloneDispatchFrame({ message: 'hello' });
    expect(frame).toEqual('hello');
  });

  test('the content carries NO submit — the `\\r` is written separately, once observed', () => {
    // the submit MUST NOT ride in the content: bundled into the same pty read as the
    // last content byte, the TUI submits an empty line and the message is left unsent
    // (dogfood 2026-08-12). the write path writes `\r` only once awaitCloneSubmitReady
    // sees the content in the box, in its own read
    const frame = asCloneDispatchFrame({ message: 'hello' });
    expect(frame).not.toContain(CLONE_SUBMIT);
  });

  test('a multi-line message is wrapped in the bracketed-paste markers, VERBATIM', () => {
    // 🔴 the clamp for the multi-line cure. measured real-opus v2.1.87 2026-09-17: inside
    // the paste markers claude inserts every byte literally — the three lines land in the
    // box across three rendered rows and commit as ONE turn. the two rejected mechanisms
    // each failed here: `\x1b\r` dropped every line but the last, and `\` + CR left a
    // literal `\` at the end of each line in the recorded turn
    const frame = asCloneDispatchFrame({ message: 'line1\nline2\nline3' });
    expect(frame).toEqual(
      `${CLONE_PASTE_OPEN}line1\nline2\nline3${CLONE_PASTE_CLOSE}`,
    );
  });

  test('the multi-line body is untouched — no escape is injected between its lines', () => {
    // the caller's bytes must reach the brain unmodified. an escape injected per line is
    // what corrupted the message under both rejected mechanisms, so this asserts the body
    // between the markers is the caller's own string
    const message = 'alpha\nbravo\ncharlie';
    const frame = asCloneDispatchFrame({ message });
    const body = frame.slice(
      CLONE_PASTE_OPEN.length,
      frame.length - CLONE_PASTE_CLOSE.length,
    );
    expect(body).toEqual(message);
    expect(body).not.toContain('\x1b');
    expect(body).not.toContain('\\');
  });

  test('a lone tail newline is dropped (it precedes the submit `\\r`)', () => {
    // a tail `\n` directly precedes the submit, so it would insert a blank final line
    // before the commit — drop it, and never wrap a message that is single-line without it
    const frame = asCloneDispatchFrame({ message: 'hello\n' });
    expect(frame).toEqual('hello');
    expect(frame).not.toContain(CLONE_PASTE_OPEN);
  });
});
