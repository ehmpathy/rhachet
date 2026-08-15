import { genTempDir, given, then, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { readlinkSync } from 'node:fs';
import { join } from 'node:path';
import { genAtomicSymlinkClaim } from './genAtomicSymlinkClaim';

describe('genAtomicSymlinkClaim.integration', () => {
  given('[case1] an unclaimed name', () => {
    when('[t0] two racers claim the same name in turn', () => {
      then(
        'the first wins (true + link points at its target), the second loses (false)',
        () => {
          const dir = genTempDir({ slug: 'atomicClaim' });
          const linkPath = join(dir, '.exids', `exid-${getUuid()}`);

          const first = genAtomicSymlinkClaim({
            linkPath,
            target: '/some/transcript/first.jsonl',
          });
          const second = genAtomicSymlinkClaim({
            linkPath,
            target: '/some/transcript/second.jsonl',
          });

          expect(first).toBe(true);
          expect(second).toBe(false);
          // the winner's target holds — a lost claim never overwrites it (readlink
          // proves the link exists; existsSync would follow it to an absent target)
          expect(readlinkSync(linkPath)).toEqual(
            '/some/transcript/first.jsonl',
          );
        },
      );
    });
  });
});
