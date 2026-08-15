import { now } from 'iso-time';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getCloneIdentity } from './getCloneIdentity';
import { setCloneIdentity } from './setCloneIdentity';

describe('setCloneIdentity.integration', () => {
  given('[case1] a clone dir with a named clone written into it', () => {
    const scene = useBeforeAll(async () => {
      const cloneDir = join(
        genTempDir({ slug: 'setCloneIdentity' }),
        'serial=abc',
      );
      mkdirSync(cloneDir, { recursive: true });
      const spawnedAt = now();
      setCloneIdentity({
        cloneDir,
        serial: 'abc',
        slug: 'driver',
        socketEligible: true,
        spawnedAt,
        hostHash: 'h1',
        hostPid: 4242,
        hostPidStartedAt: spawnedAt,
      });
      return { cloneDir, spawnedAt };
    });

    when('[t0] the record is read back', () => {
      then('the round-trip recovers every field', () => {
        const record = getCloneIdentity({ cloneDir: scene.cloneDir });
        expect(record).not.toBeNull();
        expect(record).toMatchObject({
          serial: 'abc',
          slug: 'driver',
          socketEligible: true,
          spawnedAt: scene.spawnedAt,
          hostHash: 'h1',
          hostPid: 4242,
          hostPidStartedAt: scene.spawnedAt,
        });
      });

      then(
        'identity.json exists and no temp file lingers (atomic write)',
        () => {
          expect(existsSync(join(scene.cloneDir, 'identity.json'))).toBe(true);
          const temps = readdirSync(scene.cloneDir).filter((n) =>
            n.startsWith('.identity.json.'),
          );
          expect(temps).toEqual([]);
        },
      );
    });
  });

  given('[case2] an unnamed clone (null slug)', () => {
    const scene = useBeforeAll(async () => {
      const cloneDir = join(
        genTempDir({ slug: 'setCloneIdentity-null' }),
        'serial=xyz',
      );
      mkdirSync(cloneDir, { recursive: true });
      const spawnedAt = now();
      setCloneIdentity({
        cloneDir,
        serial: 'xyz',
        slug: null,
        socketEligible: false,
        spawnedAt,
        hostHash: 'h2',
        hostPid: 99,
        hostPidStartedAt: spawnedAt,
      });
      return { cloneDir };
    });

    when('[t0] the record is read back', () => {
      then('the null slug round-trips as null', () => {
        const record = getCloneIdentity({ cloneDir: scene.cloneDir });
        expect(record?.slug).toBeNull();
        expect(record?.socketEligible).toBe(false);
      });
    });
  });
});
