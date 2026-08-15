import { asIsoTimeStamp } from 'iso-time';

import { isTranscriptWithinSpawnWindow } from './isTranscriptWithinSpawnWindow';

const spawnedAt = asIsoTimeStamp('2026-08-10T00:00:00.000Z');
const spawnedAtMs = Date.parse(spawnedAt);

/**
 * .what = the spawn-window predicate across the boundary of spawnedAt ± tolerance
 */
const TEST_CASES: {
  description: string;
  transcriptMtimeMs: number;
  expect: boolean;
}[] = [
  {
    description: 'a transcript created well after spawn is in-window',
    transcriptMtimeMs: spawnedAtMs + 60_000,
    expect: true,
  },
  {
    description: 'a transcript at the exact spawn instant is in-window',
    transcriptMtimeMs: spawnedAtMs,
    expect: true,
  },
  {
    description:
      'a transcript a hair before spawn (within tolerance) is in-window',
    transcriptMtimeMs: spawnedAtMs - 1_000,
    expect: true,
  },
  {
    description:
      'a transcript well before spawn (past tolerance) is out-of-window',
    transcriptMtimeMs: spawnedAtMs - 10_000,
    expect: false,
  },
];

describe('isTranscriptWithinSpawnWindow', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(
        isTranscriptWithinSpawnWindow({
          transcriptMtimeMs: thisCase.transcriptMtimeMs,
          spawnedAt,
        }),
      ).toEqual(thisCase.expect);
    }),
  );
});
