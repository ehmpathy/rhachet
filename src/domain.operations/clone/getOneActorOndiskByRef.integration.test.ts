import { ConstraintError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { genSampleContextNoAmbient } from '@src/.test/assets/genSampleContextNoAmbient';

import { findsertActorOndisk } from '../actor/enrolled/findsertActorOndisk';
import { getOneActorOndiskByRef } from './getOneActorOndiskByRef';

// every roleset here then lands on a hash actor, never the repo actor
const contextNoAmbient = genSampleContextNoAmbient();

describe('getOneActorOndiskByRef.integration', () => {
  given('[case1] two enrolled actors with distinct hashes', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'actorByRef' });
      const a = await findsertActorOndisk(
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
      const b = await findsertActorOndisk(
        {
          repoPath,
          brain: 'claude',
          roles: ['driver'],
          delta: null,
          reason: null,
          logEnrollment: true,
        },
        contextNoAmbient,
      );
      return { repoPath, a, b };
    });

    when('[t0] a UNIQUE full hash is given', () => {
      then('it resolves to that exact actor', () => {
        const found = getOneActorOndiskByRef({
          repoPath: scene.repoPath,
          ref: { hashPrefix: scene.a.exid },
        });
        expect(found.exid).toEqual(scene.a.exid);
      });
    });

    when(
      '[t1] a UNIQUE prefix is given (first 4 chars of A, if unique)',
      () => {
        then('a prefix that names exactly one actor resolves it', () => {
          // find a prefix length at which A is unique vs B
          let len = 1;
          while (
            len < scene.a.exid.length &&
            scene.b.exid.startsWith(scene.a.exid.slice(0, len))
          )
            len += 1;
          const prefix = scene.a.exid.slice(0, len);
          const found = getOneActorOndiskByRef({
            repoPath: scene.repoPath,
            ref: { hashPrefix: prefix },
          });
          expect(found.exid).toEqual(scene.a.exid);
        });
      },
    );

    when('[t2] a NO-match prefix is given', () => {
      then('it fails loud with a ConstraintError', async () => {
        const error = await getError(() =>
          getOneActorOndiskByRef({
            repoPath: scene.repoPath,
            ref: { hashPrefix: 'zzzzzzzz' },
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('no enrolled actor');
      });

      then(
        'the metadata carries the DUAL-path fix a machine reads',
        async () => {
          // the criteria promise a no-match names BOTH ways forward — list the
          // actors OR enroll one; a machine reads error.metadata.hint, so the
          // dual-path must be a real field, not only prose in the message
          const error = (await getError(() =>
            getOneActorOndiskByRef({
              repoPath: scene.repoPath,
              ref: { hashPrefix: 'zzzzzzzz' },
            }),
          )) as unknown as { metadata?: { hint?: string } };
          const hint = error.metadata?.hint ?? '';
          expect(hint).toContain('rhx actor list');
          expect(hint).toContain('rhx enroll');
        },
      );
    });

    when('[t3] an empty prefix matches BOTH actors (ambiguous)', () => {
      then('it fails loud, names the ambiguity', async () => {
        const error = await getError(() =>
          getOneActorOndiskByRef({
            repoPath: scene.repoPath,
            ref: { hashPrefix: '' },
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('ambiguous');
      });

      then('it NAMES the candidate actors a human picks between', async () => {
        // the crux of the criteria`s ambiguous-prefix then: it must NAME the
        // candidates, not merely say "ambiguous". a machine reads the candidates
        // off error.metadata; each is the reachable `@<full-hash>` form so the
        // human copies one back as a longer prefix
        const error = (await getError(() =>
          getOneActorOndiskByRef({
            repoPath: scene.repoPath,
            ref: { hashPrefix: '' },
          }),
        )) as unknown as {
          metadata?: { candidates?: string[]; hint?: string };
        };
        const candidates = error.metadata?.candidates ?? [];
        expect(candidates).toContain(`@${scene.a.exid}`);
        expect(candidates).toContain(`@${scene.b.exid}`);
        expect(candidates).toHaveLength(2);
        expect(error.metadata?.hint).toContain('longer prefix');
      });
    });
  });
});
