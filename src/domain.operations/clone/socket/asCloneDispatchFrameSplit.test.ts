import { asCloneDispatchFrameSplit } from './asCloneDispatchFrameSplit';

const MAX = 1000;

describe('asCloneDispatchFrameSplit', () => {
  test('one complete frame in one chunk yields the frame, empty rest', () => {
    const out = asCloneDispatchFrameSplit({
      buffered: '',
      chunk: '{"a":1}\n',
      maxFrameBytes: MAX,
    });
    expect(out.frames).toEqual(['{"a":1}']);
    expect(out.rest).toEqual('');
    expect(out.overflow).toBe(false);
  });

  test('a frame split across two chunks reassembles on the second', () => {
    const first = asCloneDispatchFrameSplit({
      buffered: '',
      chunk: '{"a":',
      maxFrameBytes: MAX,
    });
    expect(first.frames).toEqual([]);
    expect(first.rest).toEqual('{"a":');

    const second = asCloneDispatchFrameSplit({
      buffered: first.rest,
      chunk: '1}\n',
      maxFrameBytes: MAX,
    });
    expect(second.frames).toEqual(['{"a":1}']);
    expect(second.rest).toEqual('');
  });

  test('two frames in one chunk both come through, whole', () => {
    const out = asCloneDispatchFrameSplit({
      buffered: '',
      chunk: '{"a":1}\n{"b":2}\n',
      maxFrameBytes: MAX,
    });
    expect(out.frames).toEqual(['{"a":1}', '{"b":2}']);
    expect(out.rest).toEqual('');
  });

  test('an incomplete tail past the cap flags overflow', () => {
    const out = asCloneDispatchFrameSplit({
      buffered: '',
      chunk: 'x'.repeat(MAX + 1), // no newline — an unbounded tail
      maxFrameBytes: MAX,
    });
    expect(out.frames).toEqual([]);
    expect(out.overflow).toBe(true);
  });

  test('a tail at the cap does NOT overflow (boundary)', () => {
    const out = asCloneDispatchFrameSplit({
      buffered: '',
      chunk: 'x'.repeat(MAX),
      maxFrameBytes: MAX,
    });
    expect(out.overflow).toBe(false);
  });
});
