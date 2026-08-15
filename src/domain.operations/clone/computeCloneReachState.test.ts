import { computeCloneReachState } from './computeCloneReachState';

const TEST_CASES = [
  {
    description:
      'socketless AND process active → DEAF (active-but-deaf, observe-only)',
    given: { socketEligible: false, socketLive: false, processLive: true },
    expect: 'DEAF',
  },
  {
    description:
      'socketless AND process exited → DEAD (finished/gone, the wisher`s transition)',
    given: { socketEligible: false, socketLive: false, processLive: false },
    expect: 'DEAD',
  },
  {
    description: 'had a socket and it answers → LIVE',
    given: { socketEligible: true, socketLive: true, processLive: true },
    expect: 'LIVE',
  },
  {
    description: 'had a socket but it does not answer → DEAD',
    given: { socketEligible: true, socketLive: false, processLive: true },
    expect: 'DEAD',
  },
  {
    description:
      'socket branch ignores processLive — a socket clone`s liveness IS its socket',
    given: { socketEligible: true, socketLive: true, processLive: false },
    expect: 'LIVE',
  },
  {
    description:
      'socketless branch ignores socketLive — a socketless clone has no socket to answer',
    given: { socketEligible: false, socketLive: true, processLive: false },
    expect: 'DEAD',
  },
] as const;

describe('computeCloneReachState', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(computeCloneReachState(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
