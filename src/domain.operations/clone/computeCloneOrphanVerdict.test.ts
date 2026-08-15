import { computeCloneOrphanVerdict } from './computeCloneOrphanVerdict';
import type { CloneReachState } from './computeCloneReachState';

const TEST_CASES: {
  description: string;
  given: {
    reachState: CloneReachState;
    recordedHostHash: string;
    currentHostHash: string;
    recordedPidStartedAt: string;
    livePidStartedAt: string | null;
  };
  expect: boolean;
}[] = [
  {
    description: 'a LIVE clone is never an orphan',
    given: {
      reachState: 'LIVE',
      recordedHostHash: 'h1',
      currentHostHash: 'h1',
      recordedPidStartedAt: '2026-08-10T00:00:00Z',
      livePidStartedAt: '2026-08-10T00:00:00Z',
    },
    expect: false,
  },
  {
    description: 'a DEAF clone is never an orphan',
    given: {
      reachState: 'DEAF',
      recordedHostHash: 'h1',
      currentHostHash: 'h1',
      recordedPidStartedAt: '2026-08-10T00:00:00Z',
      livePidStartedAt: '2026-08-10T00:00:00Z',
    },
    expect: false,
  },
  {
    description:
      'a DEAD clone on a DIFFERENT host cannot be probed → not an orphan',
    given: {
      reachState: 'DEAD',
      recordedHostHash: 'h1',
      currentHostHash: 'h2',
      recordedPidStartedAt: '2026-08-10T00:00:00Z',
      livePidStartedAt: '2026-08-10T00:00:00Z',
    },
    expect: false,
  },
  {
    description:
      'a DEAD same-host clone whose pid is not alive → not an orphan',
    given: {
      reachState: 'DEAD',
      recordedHostHash: 'h1',
      currentHostHash: 'h1',
      recordedPidStartedAt: '2026-08-10T00:00:00Z',
      livePidStartedAt: null,
    },
    expect: false,
  },
  {
    description:
      'a DEAD same-host clone whose live pid start-time DIFFERS → pid reuse, not an orphan',
    given: {
      reachState: 'DEAD',
      recordedHostHash: 'h1',
      currentHostHash: 'h1',
      recordedPidStartedAt: '2026-08-10T00:00:00Z',
      livePidStartedAt: '2026-08-10T09:30:00Z',
    },
    expect: false,
  },
  {
    description:
      'a DEAD same-host clone whose live pid start-time MATCHES → a real orphan',
    given: {
      reachState: 'DEAD',
      recordedHostHash: 'h1',
      currentHostHash: 'h1',
      recordedPidStartedAt: '2026-08-10T00:00:00Z',
      livePidStartedAt: '2026-08-10T00:00:00Z',
    },
    expect: true,
  },
];

describe('computeCloneOrphanVerdict', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(computeCloneOrphanVerdict(thisCase.given).orphan).toEqual(
        thisCase.expect,
      );
    }),
  );
});
