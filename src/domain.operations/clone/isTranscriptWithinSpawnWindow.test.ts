import { asIsoTimeStamp } from 'iso-time';

import { isTranscriptWithinSpawnWindow } from './isTranscriptWithinSpawnWindow';

const spawnedAt = asIsoTimeStamp('2026-08-10T00:00:00.000Z');
const spawnedAtMs = Date.parse(spawnedAt);

/**
 * .what = the spawn-window predicate across the boundary of spawnedAt ± tolerance,
 *   read from CREATION where the filesystem knows it and from MODIFICATION where
 *   it does not
 */
const TEST_CASES: {
  description: string;
  transcriptBirthtimeMs: number | null;
  transcriptMtimeMs: number;
  expect: boolean;
}[] = [
  {
    description: 'a transcript created well after spawn is in-window',
    transcriptBirthtimeMs: spawnedAtMs + 60_000,
    transcriptMtimeMs: spawnedAtMs + 60_000,
    expect: true,
  },
  {
    description: 'a transcript at the exact spawn instant is in-window',
    transcriptBirthtimeMs: spawnedAtMs,
    transcriptMtimeMs: spawnedAtMs,
    expect: true,
  },
  {
    description:
      'a transcript a hair before spawn (within tolerance) is in-window',
    transcriptBirthtimeMs: spawnedAtMs - 1_000,
    transcriptMtimeMs: spawnedAtMs - 1_000,
    expect: true,
  },
  {
    description:
      'a transcript well before spawn (past tolerance) is out-of-window',
    transcriptBirthtimeMs: spawnedAtMs - 10_000,
    transcriptMtimeMs: spawnedAtMs - 10_000,
    expect: false,
  },
  {
    // 🔴 the clamp. measured 2026-09-16: a peer clone adopted its LIVE PARENT's
    // transcript and rendered the parent's own turns as the clone's talk. the
    // parent writes every turn, so a mtime-only window can never exclude it
    description:
      'a LIVE PEER transcript — created hours before spawn, written after it — is out-of-window',
    transcriptBirthtimeMs: spawnedAtMs - 3 * 60 * 60 * 1_000,
    transcriptMtimeMs: spawnedAtMs + 30_000,
    expect: false,
  },
  {
    // the same shape one layer down: a session that COMPACTS starts a fresh
    // `.jsonl`, so its creation stamp is fresh too — a compaction mid-run is
    // ours to claim, and creation says so
    description:
      'a transcript born after spawn but written later still reads from creation',
    transcriptBirthtimeMs: spawnedAtMs + 1_000,
    transcriptMtimeMs: spawnedAtMs + 900_000,
    expect: true,
  },
  {
    // the fallback: a filesystem with no creation time yields null, and the
    // predicate degrades to mtime — exactly the behavior that predates this fix,
    // so a narrower window is never traded for a wider one on an exotic fs
    description:
      'with no creation time (null), an in-window mtime is in-window (mtime fallback)',
    transcriptBirthtimeMs: null,
    transcriptMtimeMs: spawnedAtMs + 60_000,
    expect: true,
  },
  {
    description:
      'with no creation time (null), an out-of-window mtime is out-of-window (mtime fallback)',
    transcriptBirthtimeMs: null,
    transcriptMtimeMs: spawnedAtMs - 10_000,
    expect: false,
  },
  {
    // no real file is written before it was created, so a birthtime past its
    // mtime is a filesystem that reports a stamp it does not keep — distrust it
    description:
      'an UNTRUSTWORTHY birthtime (later than mtime) falls back to mtime',
    transcriptBirthtimeMs: spawnedAtMs + 60_000,
    transcriptMtimeMs: spawnedAtMs - 10_000,
    expect: false,
  },
];

describe('isTranscriptWithinSpawnWindow', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(
        isTranscriptWithinSpawnWindow({
          transcriptBirthtimeMs: thisCase.transcriptBirthtimeMs,
          transcriptMtimeMs: thisCase.transcriptMtimeMs,
          spawnedAt,
        }),
      ).toEqual(thisCase.expect);
    }),
  );
});
