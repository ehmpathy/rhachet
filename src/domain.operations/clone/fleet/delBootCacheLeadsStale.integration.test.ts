import { genTempDir, given, then, useThen, when } from 'test-fns';

import { existsSync, mkdirSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BOOT_CACHE_LEAD_PRUNE_MS,
  delBootCacheLeadsStale,
} from './delBootCacheLeadsStale';
import { getBootCacheLeadPath } from './getBootCacheLeadPath';

/**
 * .what = seed one lead record, with its last write set back by the given age
 */
const setLeadRecordAged = (input: {
  repoPath: string;
  bootHash: string;
  ageMs: number;
}): string => {
  const path = getBootCacheLeadPath({
    repoPath: input.repoPath,
    bootHash: input.bootHash,
  });
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ serial: 'x', claimedAtMs: 0 })}\n`);
  const atSeconds = (Date.now() - input.ageMs) / 1000;
  utimesSync(path, atSeconds, atSeconds);
  return path;
};

describe('delBootCacheLeadsStale', () => {
  given('[case1] a repo with no lead records dir', () => {
    when('[t0] the prune runs', () => {
      then('it prunes none, and makes no dir', () => {
        const repoPath = genTempDir({ slug: 'boot-prune-c1' });
        expect(delBootCacheLeadsStale({ repoPath, nowMs: Date.now() })).toEqual(
          { pruned: 0 },
        );
        expect(
          existsSync(join(repoPath, '.agent', '.actors', '.boot.leads')),
        ).toEqual(false);
      });
    });
  });

  given('[case2] one record past the prune age and one within it', () => {
    when('[t0] the prune runs', () => {
      const scene = useThen('it runs', () => {
        const repoPath = genTempDir({ slug: 'boot-prune-c2' });
        const pathStale = setLeadRecordAged({
          repoPath,
          bootHash: 'aaaaaaaaaaaaaaaa',
          ageMs: BOOT_CACHE_LEAD_PRUNE_MS + 60_000,
        });
        const pathFresh = setLeadRecordAged({
          repoPath,
          bootHash: 'bbbbbbbbbbbbbbbb',
          ageMs: BOOT_CACHE_LEAD_PRUNE_MS - 60_000,
        });
        const result = delBootCacheLeadsStale({ repoPath, nowMs: Date.now() });
        return { pathStale, pathFresh, result };
      });

      then('it prunes the stale record', () => {
        expect(scene.result).toEqual({ pruned: 1 });
        expect(existsSync(scene.pathStale)).toEqual(false);
      });

      then('it keeps the record within the prune age', () => {
        expect(existsSync(scene.pathFresh)).toEqual(true);
      });
    });
  });

  given('[case3] a stale record the prune already removed', () => {
    when('[t0] the prune runs twice', () => {
      then('the second run prunes none', () => {
        const repoPath = genTempDir({ slug: 'boot-prune-c3' });
        setLeadRecordAged({
          repoPath,
          bootHash: 'cccccccccccccccc',
          ageMs: BOOT_CACHE_LEAD_PRUNE_MS + 60_000,
        });
        expect(delBootCacheLeadsStale({ repoPath, nowMs: Date.now() })).toEqual(
          { pruned: 1 },
        );
        expect(delBootCacheLeadsStale({ repoPath, nowMs: Date.now() })).toEqual(
          { pruned: 0 },
        );
      });
    });
  });
});
