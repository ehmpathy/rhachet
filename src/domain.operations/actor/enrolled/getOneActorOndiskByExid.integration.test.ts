import { MalfunctionError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { genSampleContextNoAmbient } from '@src/.test/assets/genSampleContextNoAmbient';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findsertActorOndisk } from './findsertActorOndisk';
import { getAllActorsOndisk } from './getAllActorsOndisk';
import { getOneActorOndiskByExid } from './getOneActorOndiskByExid';

// every roleset here then lands on a hash actor, never the repo actor
const contextNoAmbient = genSampleContextNoAmbient();

describe('getOneActorOndiskByExid.integration', () => {
  given('[case1] two actors in one repo', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'actorByExid-multi' });
      const mech = await findsertActorOndisk(
        {
          repoPath,
          brain: 'claude',
          roles: ['mechanic'],
          delta: null,
          reason: null,
          logEnrollment: true,
        },
        contextNoAmbient,
      );
      const arch = await findsertActorOndisk(
        {
          repoPath,
          brain: 'claude',
          roles: ['architect'],
          delta: null,
          reason: null,
          logEnrollment: true,
        },
        contextNoAmbient,
      );
      return { repoPath, mech, arch };
    });

    when('[t0] one actor is read by its exid', () => {
      then('it returns THAT actor — brain + roles + exid intact', () => {
        const found = getOneActorOndiskByExid({
          repoPath: scene.repoPath,
          exid: scene.arch.exid,
        });
        expect(found?.exid).toEqual(scene.arch.exid);
        expect(found?.brain).toEqual('claude');
        expect(found?.roles).toEqual(['architect']);
      });

      then('the by-exid read matches the enumerate-then-find result', () => {
        // the direct O(1) read and the O(actors) enumerate path must agree on the
        // SAME identity — this is the equivalence the perf fix rests on
        const direct = getOneActorOndiskByExid({
          repoPath: scene.repoPath,
          exid: scene.mech.exid,
        });
        const viaScan = getAllActorsOndisk({ repoPath: scene.repoPath }).find(
          (a) => a.exid === scene.mech.exid,
        );
        expect(direct?.exid).toEqual(viaScan?.exid);
        expect(direct?.brain).toEqual(viaScan?.brain);
        expect(direct?.roles).toEqual(viaScan?.roles);
      });
    });

    when('[t1] an exid that names no actor is read', () => {
      then('it returns null (a benign no-such-actor)', () => {
        expect(
          getOneActorOndiskByExid({
            repoPath: scene.repoPath,
            exid: 'hash=deadbeef',
          }),
        ).toBeNull();
      });
    });
  });

  given('[case2] a half-built actor dir (no manifest)', () => {
    const repoPath = genTempDir({ slug: 'actorByExid-nomanifest' });
    mkdirSync(join(repoPath, '.agent', '.actors', 'actor.via.hash=abadcafe'), {
      recursive: true,
    });

    when('[t0] the actor is read by that exid', () => {
      then('the half-built dir reads as null, never corrupt', () => {
        expect(
          getOneActorOndiskByExid({ repoPath, exid: 'hash=abadcafe' }),
        ).toBeNull();
      });
    });
  });

  given('[case3] a corrupt actor.json (shared tolerant-read policy)', () => {
    const repoPath = genTempDir({ slug: 'actorByExid-corrupt' });
    const dir = join(repoPath, '.agent', '.actors', 'actor.via.hash=cafef00d');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'actor.json'), '{ not json', 'utf8');

    when('[t0] the actor is read by that exid', () => {
      then('it fails loud, same as the enumerate path', async () => {
        // the by-exid reader composes the SAME getActorOndiskManifest, so a
        // corrupt manifest fails loud here exactly as it does in getAllActorsOndisk
        const error = await getError(() =>
          getOneActorOndiskByExid({ repoPath, exid: 'hash=cafef00d' }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
      });
    });
  });
});
