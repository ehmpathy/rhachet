import {
  type CloneUnreachableCause,
  computeCloneUnreachableHint,
} from './computeCloneUnreachableHint';

const TEST_CASES: {
  description: string;
  given: { cause: CloneUnreachableCause; hostHash: string | null };
  expect: { messageIncludes: string; hintIncludes: string };
}[] = [
  {
    description: 'DEAF names the socket-capable re-enroll fix',
    given: { cause: 'DEAF', hostHash: null },
    expect: {
      messageIncludes: 'no dispatch socket',
      hintIncludes: 're-enroll',
    },
  },
  {
    description: 'DEAD-same-host names a plain re-enroll',
    given: { cause: 'DEAD-same-host', hostHash: null },
    expect: { messageIncludes: 'socket is gone', hintIncludes: 're-enroll' },
  },
  {
    description: 'DEAD-cross-host names the other host in the message',
    given: { cause: 'DEAD-cross-host', hostHash: 'abc123' },
    expect: { messageIncludes: 'abc123', hintIncludes: 'from the host' },
  },
  {
    description: 'exited-mid-dispatch tells the caller to re-send',
    given: { cause: 'exited-mid-dispatch', hostHash: null },
    expect: { messageIncludes: 'in flight', hintIncludes: 're-send' },
  },
  {
    description: 'wedged tells the caller to retry',
    given: { cause: 'wedged', hostHash: null },
    expect: { messageIncludes: 'did not answer', hintIncludes: 'retry' },
  },
];

describe('computeCloneUnreachableHint', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      const output = computeCloneUnreachableHint(thisCase.given);
      expect(output.message).toContain(thisCase.expect.messageIncludes);
      expect(output.hint).toContain(thisCase.expect.hintIncludes);
    }),
  );

  test('DEAD-cross-host falls back to "unknown" when hostHash is null', () => {
    const output = computeCloneUnreachableHint({
      cause: 'DEAD-cross-host',
      hostHash: null,
    });
    expect(output.message).toContain('unknown');
  });

  test('the whole cause→{message,hint} map matches the snapshot (fix-words regression)', () => {
    // the .toContain asserts above prove each cause names its fix; this snapshot
    // pins the FULL text every fail-loud reach error carries (human stderr +
    // machine json alike), so a drift in the rest of the words surfaces in
    // review (rule.require.snapshots). hostHash is fixed so this is stable
    const causes: CloneUnreachableCause[] = [
      'DEAF',
      'DEAD-same-host',
      'DEAD-cross-host',
      'exited-mid-dispatch',
      'wedged',
    ];
    const map = Object.fromEntries(
      causes.map((cause) => [
        cause,
        computeCloneUnreachableHint({ cause, hostHash: 'abc123' }),
      ]),
    );
    expect(map).toMatchSnapshot();
  });
});
