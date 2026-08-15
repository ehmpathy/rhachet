import { asCloneDispatchFrame } from './asCloneDispatchFrame';
import { CLONE_SOFT_NEWLINE, CLONE_SUBMIT } from './constants';

describe('asCloneDispatchFrame', () => {
  test('returns a single-line message byte-identical to the bulk-write path', () => {
    // a single-line message has no interior `\n`, so it is untouched — the proven
    // bulk-write hot path is unchanged (no bracketed-paste wrapper; claude renders
    // `\x1b[200~`/`\x1b[201~` as literal text, dogfood 2026-08-13)
    const frame = asCloneDispatchFrame({ message: 'hello' });
    expect(frame).toEqual('hello');
  });

  test('the content carries NO submit — the `\\r` is written separately, a tick later', () => {
    // the submit MUST NOT ride in the content: bundled into the same pty read as the
    // last content byte, the TUI submits an empty line and the message is left unsent
    // (dogfood 2026-08-12). the write path (genCloneSocketServer) writes `\r` after a
    // delay, in its own read
    const frame = asCloneDispatchFrame({ message: 'hello' });
    expect(frame).not.toContain(CLONE_SUBMIT);
  });

  test('a multi-line message maps each interior `\\n` to the soft-newline escape', () => {
    // the clamp for multi-line `say`: an interior newline becomes CLONE_SOFT_NEWLINE
    // (`\x1b\r`, the injectable Shift/Option-Enter), so the whole block lands as ONE
    // turn — NOT a bare `\n` that would submit line one early
    const frame = asCloneDispatchFrame({ message: 'line1\nline2\nline3' });
    expect(frame).toEqual(
      `line1${CLONE_SOFT_NEWLINE}line2${CLONE_SOFT_NEWLINE}line3`,
    );
    // no bare interior newline survives — a bare `\n` would submit line one early
    expect(frame).not.toContain('\n');
  });

  test('a lone tail newline is dropped (it precedes the submit `\\r`)', () => {
    // a tail `\n` directly precedes the submit, so it would insert a blank final line
    // before the commit — drop it, and never emit a soft-newline for it
    const frame = asCloneDispatchFrame({ message: 'hello\n' });
    expect(frame).toEqual('hello');
    expect(frame).not.toContain(CLONE_SOFT_NEWLINE);
  });
});
