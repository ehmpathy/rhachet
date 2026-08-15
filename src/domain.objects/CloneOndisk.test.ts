import { getUniqueIdentifier } from 'domain-objects';
import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { CloneOndisk } from './CloneOndisk';

/**
 * .what = build a CloneOndisk with sane defaults, overridable per case
 * .why = every case varies only the field under test; the rest is noise
 */
const genSampleCloneOndisk = (
  input: Partial<CloneOndisk> & { serial: string },
): CloneOndisk =>
  new CloneOndisk({
    serial: input.serial,
    slug: input.slug ?? null,
    actor: input.actor ?? { repoPath: '/home/dev/repo', hash: '9c1e0af3' },
    socketEligible: input.socketEligible ?? true,
    spawnedAt: input.spawnedAt ?? asIsoTimeStamp('2026-08-07T00:00:00.000Z'),
    hostHash: input.hostHash ?? 'host0001',
    hostPid: input.hostPid ?? 1234,
    hostPidStartedAt:
      input.hostPidStartedAt ?? asIsoTimeStamp('2026-08-07T00:00:00.000Z'),
    historyDir: input.historyDir ?? '/run/clone/history',
  });

describe('CloneOndisk', () => {
  given('[case1] the CloneOndisk class', () => {
    when('[t0] the key statics are checked', () => {
      then('serial is the primary key', () => {
        expect(CloneOndisk.primary).toEqual(['serial']);
      });

      then('slug is the unique key', () => {
        expect(CloneOndisk.unique).toEqual(['slug']);
      });
    });
  });

  given('[case2] a named CloneOndisk instance', () => {
    when('[t0] constructed with a slug + actor ref', () => {
      const clone = genSampleCloneOndisk({ serial: '7f3a', slug: 'driver' });

      then('the fields are accessible', () => {
        expect(clone.serial).toEqual('7f3a');
        expect(clone.slug).toEqual('driver');
        expect(clone.actor).toEqual({
          repoPath: '/home/dev/repo',
          hash: '9c1e0af3',
        });
      });

      then('the unique handle is the slug', () => {
        expect(getUniqueIdentifier(clone)).toEqual({ slug: 'driver' });
      });
    });
  });

  given('[case3] an unnamed CloneOndisk instance', () => {
    when('[t0] constructed with no slug', () => {
      const clone = genSampleCloneOndisk({ serial: '7f3a', slug: null });

      then('a null slug is accepted — a name is optional', () => {
        expect(clone.slug).toBeNull();
      });

      then('the clone is still addressable by its serial', () => {
        expect(clone.serial).toEqual('7f3a');
      });
    });
  });
});
