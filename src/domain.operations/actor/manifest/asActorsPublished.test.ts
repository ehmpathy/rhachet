import { getError, given, then, when } from 'test-fns';

import { asActorsPublished } from './asActorsPublished';

const PATH = 'src/actors.yml';

describe('asActorsPublished', () => {
  given('[case1] a published actor list in the consumer shape', () => {
    when('[t0] it is cast', () => {
      then('each actor is returned', () => {
        const actors = asActorsPublished({
          parsed: {
            actor: [
              {
                slug: 'builder',
                brain: 'claude',
                roles: ['ehmpathy/mechanic'],
              },
              {
                slug: 'reader',
                roles: ['@builder', '-mechanic', '+bhrain/librarian'],
              },
            ],
          },
          path: PATH,
        });
        expect(actors.map((one) => one.slug)).toEqual(['builder', 'reader']);
      });
    });
  });

  given('[case2] a published yml that names `ambient:`', () => {
    when('[t0] it is cast', () => {
      then(
        'it is refused: the repo actor is the consumer choice (F9)',
        async () => {
          const error = await getError(() =>
            asActorsPublished({
              parsed: {
                ambient: '@builder',
                actor: [
                  {
                    slug: 'builder',
                    brain: 'claude',
                    roles: ['ehmpathy/mechanic'],
                  },
                ],
              },
              path: PATH,
            }),
          );
          expect(error.message).toContain(
            'published actors yml declares `ambient:`',
          );
        },
      );
    });
  });

  given('[case3] a published entry that breaks the entry rules', () => {
    when('[t0] it is cast', () => {
      then(
        'the same entry refusal applies as for a consumer (S6)',
        async () => {
          const error = await getError(() =>
            asActorsPublished({
              parsed: {
                actor: [{ slug: 'x', brain: 'claude', roles: ['a/b', '+c'] }],
              },
              path: PATH,
            }),
          );
          expect(error.message).toContain(
            'mixes concrete roles with a base or deltas',
          );
        },
      );
    });
  });
});
