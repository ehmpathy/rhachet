import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { mkdirSync, readlinkSync } from 'node:fs';
import { join } from 'node:path';
import { setCloneSerialIndex } from './setCloneSerialIndex';

describe('setCloneSerialIndex.integration', () => {
  given('[case1] a fresh serial claim', () => {
    const scene = useBeforeAll(async () => {
      const actorsRoot = join(
        genTempDir({ slug: 'serialIndex-fresh' }),
        '.actors',
      );
      mkdirSync(actorsRoot, { recursive: true });
      setCloneSerialIndex({ actorsRoot, actorHash: 'aaa', serial: 's1' });
      return { actorsRoot };
    });

    when('[t0] the index is read', () => {
      then('the symlink points at the owner clone dir', () => {
        const target = readlinkSync(join(scene.actorsRoot, '.serials', 's1'));
        expect(target).toContain('actor.via.hash=aaa');
        expect(target).toContain('serial=s1');
      });
    });
  });

  given('[case2] a re-claim of the SAME serial (idempotent findsert)', () => {
    const scene = useBeforeAll(async () => {
      const actorsRoot = join(
        genTempDir({ slug: 'serialIndex-reclaim' }),
        '.actors',
      );
      mkdirSync(actorsRoot, { recursive: true });
      // two writes of the same serial — a self-heal / a retry, never a fault
      setCloneSerialIndex({ actorsRoot, actorHash: 'aaa', serial: 's1' });
      setCloneSerialIndex({ actorsRoot, actorHash: 'aaa', serial: 's1' });
      return { actorsRoot };
    });

    when('[t0] the index is read after the re-claim', () => {
      then('the link still points at the same owner clone', () => {
        const target = readlinkSync(join(scene.actorsRoot, '.serials', 's1'));
        expect(target).toContain('actor.via.hash=aaa');
        expect(target).toContain('serial=s1');
      });
    });
  });
});
