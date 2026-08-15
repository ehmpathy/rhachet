import { MalfunctionError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findsertActorOndisk } from './findsertActorOndisk';
import { getAllActorsOndisk } from './getAllActorsOndisk';
import { getOneActorOndiskByHash } from './getOneActorOndiskByHash';

describe('getOneActorOndiskByHash.integration', () => {
  given('[case1] three actors in one repo', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'actorByHash-multi' });
      const mech = findsertActorOndisk({
        repoPath,
        brain: 'claude',
        roles: ['mechanic'],
        delta: null,
        reason: null,
        logEnrollment: true,
      });
      const arch = findsertActorOndisk({
        repoPath,
        brain: 'claude',
        roles: ['architect'],
        delta: null,
        reason: null,
        logEnrollment: true,
      });
      return { repoPath, mech, arch };
    });

    when('[t0] one actor is read by its hash', () => {
      then('it returns THAT actor — brain + roles + hash intact', () => {
        const found = getOneActorOndiskByHash({
          repoPath: scene.repoPath,
          hash: scene.arch.hash,
        });
        expect(found?.hash).toEqual(scene.arch.hash);
        expect(found?.brain).toEqual('claude');
        expect(found?.roles).toEqual(['architect']);
      });

      then('the by-hash read matches the enumerate-then-find result', () => {
        // the direct O(1) read and the O(actors) enumerate path must agree on the
        // SAME identity — this is the equivalence the perf fix rests on
        const direct = getOneActorOndiskByHash({
          repoPath: scene.repoPath,
          hash: scene.mech.hash,
        });
        const viaScan = getAllActorsOndisk({ repoPath: scene.repoPath }).find(
          (a) => a.hash === scene.mech.hash,
        );
        expect(direct?.hash).toEqual(viaScan?.hash);
        expect(direct?.brain).toEqual(viaScan?.brain);
        expect(direct?.roles).toEqual(viaScan?.roles);
      });
    });

    when('[t1] a hash that names no actor is read', () => {
      then('it returns null (a benign no-such-actor)', () => {
        expect(
          getOneActorOndiskByHash({
            repoPath: scene.repoPath,
            hash: 'deadbeef',
          }),
        ).toBeNull();
      });
    });
  });

  given('[case2] a half-built actor dir (no manifest)', () => {
    const repoPath = genTempDir({ slug: 'actorByHash-nomanifest' });
    mkdirSync(join(repoPath, '.agent', '.actors', 'actor.via.hash=abadcafe'), {
      recursive: true,
    });

    when('[t0] the actor is read by that hash', () => {
      then('the half-built dir reads as null, never corrupt', () => {
        expect(
          getOneActorOndiskByHash({ repoPath, hash: 'abadcafe' }),
        ).toBeNull();
      });
    });
  });

  given('[case3] a corrupt actor.json (shared tolerant-read policy)', () => {
    const repoPath = genTempDir({ slug: 'actorByHash-corrupt' });
    const dir = join(repoPath, '.agent', '.actors', 'actor.via.hash=cafef00d');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'actor.json'), '{ not json', 'utf8');

    when('[t0] the actor is read by that hash', () => {
      then('it fails loud, same as the enumerate path', async () => {
        // the by-hash reader composes the SAME getActorOndiskManifest, so a
        // corrupt manifest fails loud here exactly as it does in getAllActorsOndisk
        const error = await getError(() =>
          getOneActorOndiskByHash({ repoPath, hash: 'cafef00d' }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
      });
    });
  });
});
