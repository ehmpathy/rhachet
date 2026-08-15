import { ConstraintError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { mkdirSync, readdirSync, readlinkSync } from 'node:fs';
import { join } from 'node:path';
import { setCloneSlugIndex } from './setCloneSlugIndex';

describe('setCloneSlugIndex.integration', () => {
  given('[case1] a fresh slug claim', () => {
    const scene = useBeforeAll(async () => {
      const actorsRoot = join(
        genTempDir({ slug: 'slugIndex-fresh' }),
        '.actors',
      );
      mkdirSync(actorsRoot, { recursive: true });
      setCloneSlugIndex({
        actorsRoot,
        slug: 'driver',
        actorHash: 'aaa',
        serial: 's1',
      });
      return { actorsRoot };
    });

    when('[t0] the index is read', () => {
      then('the symlink points at the owner clone', () => {
        const target = readlinkSync(join(scene.actorsRoot, '.slugs', 'driver'));
        expect(target).toContain('actor.via.hash=aaa');
        expect(target).toContain('serial=s1');
      });
    });
  });

  given('[case2] a same-actor rebind of the slug to a new serial', () => {
    const scene = useBeforeAll(async () => {
      const actorsRoot = join(
        genTempDir({ slug: 'slugIndex-rebind' }),
        '.actors',
      );
      mkdirSync(actorsRoot, { recursive: true });
      setCloneSlugIndex({
        actorsRoot,
        slug: 'driver',
        actorHash: 'aaa',
        serial: 's1',
      });
      setCloneSlugIndex({
        actorsRoot,
        slug: 'driver',
        actorHash: 'aaa',
        serial: 's2',
      });
      return { actorsRoot };
    });

    when('[t0] the index is read after the rebind', () => {
      then('it repoints to the NEW serial (idempotent by slug)', () => {
        const target = readlinkSync(join(scene.actorsRoot, '.slugs', 'driver'));
        expect(target).toContain('serial=s2');
        expect(target).not.toContain('serial=s1');
      });

      then(
        'the atomic swap leaves NO stray temp behind (only the slug link)',
        () => {
          // the rebind is an atomic symlink-to-temp + rename-over-target; the rename
          // CONSUMES the temp, so `.slugs/` holds only the slug — never a leftover
          // `.rebind.*`. this guards the swap`s cleanup against a future regression
          const entries = readdirSync(join(scene.actorsRoot, '.slugs'));
          expect(entries).toEqual(['driver']);
        },
      );
    });
  });

  given(
    '[case4] repeated same-actor rebinds (a retry cron churns the slug)',
    () => {
      const scene = useBeforeAll(async () => {
        const actorsRoot = join(
          genTempDir({ slug: 'slugIndex-churn' }),
          '.actors',
        );
        mkdirSync(actorsRoot, { recursive: true });
        // ten rapid rebinds of the SAME actor's slug to fresh serials — the pattern a
        // retry cron produces; each must succeed, none may fault or leak a temp
        for (let i = 0; i < 10; i++)
          setCloneSlugIndex({
            actorsRoot,
            slug: 'driver',
            actorHash: 'aaa',
            serial: `s${i}`,
          });
        return { actorsRoot };
      });

      when('[t0] the index is read after ten rebinds', () => {
        then('the link points at the LAST serial, with no stray temp', () => {
          const target = readlinkSync(
            join(scene.actorsRoot, '.slugs', 'driver'),
          );
          expect(target).toContain('serial=s9');
          const entries = readdirSync(join(scene.actorsRoot, '.slugs'));
          expect(entries).toEqual(['driver']);
        });
      });
    },
  );

  given('[case3] a DIFFERENT actor claims a held slug', () => {
    when('[t0] the second claim runs', () => {
      then('it fails loud with a collision ConstraintError', async () => {
        const actorsRoot = join(
          genTempDir({ slug: 'slugIndex-collision' }),
          '.actors',
        );
        mkdirSync(actorsRoot, { recursive: true });
        setCloneSlugIndex({
          actorsRoot,
          slug: 'driver',
          actorHash: 'aaa',
          serial: 's1',
        });
        const error = await getError(() =>
          setCloneSlugIndex({
            actorsRoot,
            slug: 'driver',
            actorHash: 'bbb',
            serial: 's9',
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('different actor');
      });
    });
  });
});
