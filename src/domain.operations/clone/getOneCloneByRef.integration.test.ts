import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleCloneOnDisk } from '@src/.test/assets/genSampleCloneOnDisk';

import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { getOneCloneByRef } from './getOneCloneByRef';

describe('getOneCloneByRef.integration', () => {
  given('[case1] a named clone on disk', () => {
    const scene = useBeforeAll(async () => {
      return genSampleCloneOnDisk({
        repoPath: genTempDir({ slug: 'cloneByRef-named' }),
        serial: 'ser-1',
        slug: 'driver',
      });
    });

    when('[t0] looked up by serial', () => {
      then('the clone is found (serial is global-unique)', () => {
        const clone = getOneCloneByRef({
          repoPath: scene.repoPath,
          ref: { by: 'serial', serial: 'ser-1' },
        });
        expect(clone?.serial).toEqual('ser-1');
      });

      then('the reach goes through the O(1) `.serials/` index', () => {
        // the fixture writes the serial index (same as genClone), so the reach is a
        // single readlink — assert the index entry exists to pin the O(1) path
        expect(existsSync(join(scene.actorsRoot, '.serials', 'ser-1'))).toBe(
          true,
        );
      });
    });

    when('[t1] looked up by slug', () => {
      then('the SAME clone is found via the .slugs index', () => {
        const clone = getOneCloneByRef({
          repoPath: scene.repoPath,
          ref: { by: 'slug', slug: 'driver' },
        });
        expect(clone?.serial).toEqual('ser-1');
        expect(clone?.slug).toEqual('driver');
      });
    });
  });

  given(
    '[case3] three actors, each with its own clone (the multi-actor scan)',
    () => {
      // getOneCloneByRef's serial path scans every actor's clones (O(actors×clones));
      // most fixtures exercise it with ONE actor, so this proves it still resolves the
      // RIGHT clone when several actors coexist under one repo — distinct rolesets hash
      // to distinct actor dirs, so three enrollments = three actors to scan across
      const scene = useBeforeAll(async () => {
        const repoPath = genTempDir({ slug: 'cloneByRef-multi' });
        genSampleCloneOnDisk({
          repoPath,
          roles: ['mechanic'],
          serial: 'ser-mech',
          slug: 'mech-clone',
        });
        genSampleCloneOnDisk({
          repoPath,
          roles: ['architect'],
          serial: 'ser-arch',
          slug: 'arch-clone',
        });
        genSampleCloneOnDisk({
          repoPath,
          roles: ['mechanic', 'architect'],
          serial: 'ser-both',
          slug: 'both-clone',
        });
        return { repoPath };
      });

      when('[t0] each clone is looked up by its serial', () => {
        then('every serial resolves to its OWN clone across the scan', () => {
          expect(
            getOneCloneByRef({
              repoPath: scene.repoPath,
              ref: { by: 'serial', serial: 'ser-arch' },
            })?.serial,
          ).toEqual('ser-arch');
          expect(
            getOneCloneByRef({
              repoPath: scene.repoPath,
              ref: { by: 'serial', serial: 'ser-both' },
            })?.serial,
          ).toEqual('ser-both');
          expect(
            getOneCloneByRef({
              repoPath: scene.repoPath,
              ref: { by: 'serial', serial: 'ser-mech' },
            })?.serial,
          ).toEqual('ser-mech');
        });
      });

      when('[t1] a clone is looked up by its slug', () => {
        then(
          'the slug index resolves the right clone amid the three actors',
          () => {
            const clone = getOneCloneByRef({
              repoPath: scene.repoPath,
              ref: { by: 'slug', slug: 'arch-clone' },
            });
            expect(clone?.serial).toEqual('ser-arch');
            expect(clone?.slug).toEqual('arch-clone');
          },
        );
      });
    },
  );

  given('[case4] the serial index entry is absent (the scan fallback)', () => {
    // a pre-index clone, or a crash between the dir rename and the index write,
    // leaves NO `.serials/<serial>` entry. the reach must still find the clone via
    // the full-actor scan fallback — the index is a fast path, never the only path
    const scene = useBeforeAll(async () => {
      const sample = genSampleCloneOnDisk({
        repoPath: genTempDir({ slug: 'cloneByRef-noindex' }),
        serial: 'ser-orphan',
        slug: null,
      });
      // drop the `.serials/<serial>` link to simulate the absent index entry
      rmSync(join(sample.actorsRoot, '.serials', 'ser-orphan'), {
        force: true,
      });
      return sample;
    });

    when('[t0] the serial is looked up with no index entry', () => {
      then('the clone is still found via the scan fallback', () => {
        expect(
          existsSync(join(scene.actorsRoot, '.serials', 'ser-orphan')),
        ).toBe(false);
        const clone = getOneCloneByRef({
          repoPath: scene.repoPath,
          ref: { by: 'serial', serial: 'ser-orphan' },
        });
        expect(clone?.serial).toEqual('ser-orphan');
      });
    });
  });

  given('[case2] an address that names no clone', () => {
    const scene = useBeforeAll(async () => {
      return genSampleCloneOnDisk({
        repoPath: genTempDir({ slug: 'cloneByRef-unknown' }),
        serial: 'ser-real',
        slug: null,
      });
    });

    when('[t0] an unknown serial is looked up', () => {
      then('it returns null (the caller fails loud)', () => {
        expect(
          getOneCloneByRef({
            repoPath: scene.repoPath,
            ref: { by: 'serial', serial: 'ser-nope' },
          }),
        ).toBeNull();
      });
    });

    when('[t1] an unknown slug is looked up', () => {
      then('it returns null', () => {
        expect(
          getOneCloneByRef({
            repoPath: scene.repoPath,
            ref: { by: 'slug', slug: 'ghost' },
          }),
        ).toBeNull();
      });
    });
  });
});
