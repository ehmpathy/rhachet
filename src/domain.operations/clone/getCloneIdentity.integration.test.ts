import { MalfunctionError } from 'helpful-errors';
import { genTempDir, getError, given, then, when } from 'test-fns';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLONE_IDENTITY_SCHEMA_VERSION } from './constants';
import { getCloneIdentity } from './getCloneIdentity';

/**
 * .what = write a raw identity.json for the tolerant-read cases
 */
const writeRawIdentity = (input: { slug: string; body: string }): string => {
  const cloneDir = join(genTempDir({ slug: input.slug }), 'serial=raw');
  mkdirSync(cloneDir, { recursive: true });
  writeFileSync(join(cloneDir, 'identity.json'), input.body, 'utf8');
  return cloneDir;
};

const validRecord = {
  schemaVersion: CLONE_IDENTITY_SCHEMA_VERSION,
  serial: 'raw',
  slug: null,
  socketEligible: true,
  spawnedAt: '2026-08-10T00:00:00Z',
  hostHash: 'h',
  hostPid: 1,
  hostPidStartedAt: '2026-08-10T00:00:00Z',
};

describe('getCloneIdentity.integration', () => {
  given('[case1] a clone dir with NO identity.json', () => {
    when('[t0] the record is read', () => {
      then('it returns null — a benign "no record", not an error', () => {
        const cloneDir = join(
          genTempDir({ slug: 'getCloneIdentity-none' }),
          'serial=none',
        );
        mkdirSync(cloneDir, { recursive: true });
        expect(getCloneIdentity({ cloneDir })).toBeNull();
      });
    });
  });

  given('[case2] a corrupt identity.json (bad json)', () => {
    when('[t0] the record is read', () => {
      then('it fails loud with a MalfunctionError', async () => {
        const cloneDir = writeRawIdentity({
          slug: 'getCloneIdentity-corrupt',
          body: '{ not json',
        });
        const error = await getError(() => getCloneIdentity({ cloneDir }));
        expect(error).toBeInstanceOf(MalfunctionError);
      });
    });
  });

  given('[case3] a record with a newer-unknown schemaVersion', () => {
    when('[t0] the record is read', () => {
      then('it fails loud with an upgrade hint', async () => {
        const cloneDir = writeRawIdentity({
          slug: 'getCloneIdentity-newer',
          body: JSON.stringify({
            ...validRecord,
            schemaVersion: CLONE_IDENTITY_SCHEMA_VERSION + 1,
          }),
        });
        const error = await getError(() => getCloneIdentity({ cloneDir }));
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain('newer schema');
      });
    });
  });

  given('[case4] a record absent a required field', () => {
    when('[t0] the record is read', () => {
      then('it fails loud — a corrupt record', async () => {
        const { serial: _drop, ...withoutSerial } = validRecord;
        const cloneDir = writeRawIdentity({
          slug: 'getCloneIdentity-partial',
          body: JSON.stringify(withoutSerial),
        });
        const error = await getError(() => getCloneIdentity({ cloneDir }));
        expect(error).toBeInstanceOf(MalfunctionError);
      });
    });
  });
});
