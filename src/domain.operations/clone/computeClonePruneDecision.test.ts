import {
  type ClonePruneDecision,
  computeClonePruneDecision,
} from './computeClonePruneDecision';
import type { CloneReachState } from './computeCloneReachState';

const TEST_CASES: {
  description: string;
  given: {
    reachState: CloneReachState;
    ageMs: number;
    olderThanMs: number | null;
  };
  expect: ClonePruneDecision;
}[] = [
  {
    description: 'a LIVE clone is never pruned (it still answers a say)',
    given: { reachState: 'LIVE', ageMs: 999_999, olderThanMs: null },
    expect: 'keep',
  },
  {
    description: 'a DEAF clone is never pruned (it is still an active process)',
    given: { reachState: 'DEAF', ageMs: 999_999, olderThanMs: null },
    expect: 'keep',
  },
  {
    description: 'a DEAD clone with no age gate is pruned',
    given: { reachState: 'DEAD', ageMs: 0, olderThanMs: null },
    expect: 'prune',
  },
  {
    description: 'a DEAD clone older than the gate is pruned',
    given: { reachState: 'DEAD', ageMs: 60_000, olderThanMs: 30_000 },
    expect: 'prune',
  },
  {
    description: 'a DEAD clone exactly at the gate is pruned (>=)',
    given: { reachState: 'DEAD', ageMs: 30_000, olderThanMs: 30_000 },
    expect: 'prune',
  },
  {
    description: 'a DEAD clone younger than the gate is kept',
    given: { reachState: 'DEAD', ageMs: 10_000, olderThanMs: 30_000 },
    expect: 'keep',
  },
];

describe('computeClonePruneDecision', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(computeClonePruneDecision(thisCase.given)).toEqual(
        thisCase.expect,
      );
    }),
  );
});
