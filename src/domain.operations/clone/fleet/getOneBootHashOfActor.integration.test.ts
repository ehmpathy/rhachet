import { genTempDir, given, then, when } from 'test-fns';

import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneBootHashOfActor } from './getOneBootHashOfActor';

/**
 * .what = seed an actor dir, with a boot.md of the given content or none
 */
const genActorDir = (input: { slug: string; boot: string | null }): string => {
  const actorDir = genTempDir({ slug: input.slug });
  if (input.boot === null) return actorDir;
  const brainDir = getBrainOndiskDir({ actorDir });
  mkdirSync(brainDir, { recursive: true });
  writeFileSync(join(brainDir, 'boot.md'), input.boot);
  return actorDir;
};

describe('getOneBootHashOfActor', () => {
  given('[case1] an actor whose brain dir holds a boot.md', () => {
    when('[t0] its boot hash is read', () => {
      then('it is the first 16 hex chars of the sha256 of the boot', () => {
        const actorDir = genActorDir({ slug: 'boot-hash-c1', boot: 'boot a' });
        // the oracle: the one place the key is computed apart from the leaf
        const expected = createHash('sha256')
          .update('boot a')
          .digest('hex')
          .slice(0, 16);
        expect(getOneBootHashOfActor({ actorDir })).toEqual(expected);
      });
    });
  });

  given('[case2] two actors whose boots differ by one byte', () => {
    when('[t0] each boot hash is read', () => {
      then('the two hashes differ', () => {
        const first = genActorDir({ slug: 'boot-hash-c2a', boot: 'boot a' });
        const second = genActorDir({ slug: 'boot-hash-c2b', boot: 'boot b' });
        expect(getOneBootHashOfActor({ actorDir: first })).not.toEqual(
          getOneBootHashOfActor({ actorDir: second }),
        );
      });
    });
  });

  given('[case3] an actor whose brain dir holds no boot.md', () => {
    when('[t0] its boot hash is read', () => {
      then('it is null', () => {
        const actorDir = genActorDir({ slug: 'boot-hash-c3', boot: null });
        expect(getOneBootHashOfActor({ actorDir })).toBeNull();
      });
    });
  });
});
