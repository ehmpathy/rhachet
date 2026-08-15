import { MalfunctionError } from 'helpful-errors';
import { getError } from 'test-fns';

import { asCloneDispatchAck } from './asCloneDispatchAck';
import { asCloneDispatchAckFrame } from './asCloneDispatchAckFrame';

describe('asCloneDispatchAck + asCloneDispatchAckFrame', () => {
  test('a queued ack round-trips through frame + parse', () => {
    const frame = asCloneDispatchAckFrame({
      ack: { phase: 'queued', reason: null },
    });
    expect(frame.endsWith('\n')).toBe(true);
    const parsed = asCloneDispatchAck({ line: frame.trimEnd() });
    expect(parsed).toEqual({ phase: 'queued', reason: null });
  });

  test('a rejected ack carries its reason', () => {
    const frame = asCloneDispatchAckFrame({
      ack: { phase: 'rejected', reason: 'queue is full' },
    });
    const parsed = asCloneDispatchAck({ line: frame.trimEnd() });
    expect(parsed).toEqual({ phase: 'rejected', reason: 'queue is full' });
  });

  test('a delivered ack parses', () => {
    const parsed = asCloneDispatchAck({
      line: JSON.stringify({ phase: 'delivered', reason: null }),
    });
    expect(parsed.phase).toEqual('delivered');
  });

  test('a non-json ack line fails loud', async () => {
    const error = await getError(() =>
      asCloneDispatchAck({ line: 'not json' }),
    );
    expect(error).toBeInstanceOf(MalfunctionError);
  });

  test('an unknown phase fails loud', async () => {
    const error = await getError(() =>
      asCloneDispatchAck({ line: JSON.stringify({ phase: 'weird' }) }),
    );
    expect(error).toBeInstanceOf(MalfunctionError);
  });
});
