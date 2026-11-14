import { ConstraintError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { genSampleFileTree } from '@src/.test/assets/genSampleFileTree';
import { RoleRegistry } from '@src/domain.objects/RoleRegistry';

import { join } from 'node:path';
import { getActorsPublishedOfRegistry } from './getActorsPublishedOfRegistry';

/**
 * .what = a registry with no roles, that names the actors yml at `actorsUri` (or none)
 */
const genRegistry = (input: { actorsUri: string | null }): RoleRegistry =>
  new RoleRegistry({
    slug: 'surfschool',
    readme: { uri: 'readme.md' },
    roles: [],
    ...(input.actorsUri ? { actors: { uri: input.actorsUri } } : {}),
  });

describe('getActorsPublishedOfRegistry', () => {
  given('[case1] a registry with no `actors` ref', () => {
    when('[t0] its published actors are read', () => {
      then('it publishes none', () => {
        expect(
          getActorsPublishedOfRegistry({
            registry: genRegistry({ actorsUri: null }),
          }),
        ).toEqual([]);
      });
    });
  });

  given('[case2] a registry whose `actors` ref names a valid yml', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'actors-published-registry' });
      genSampleFileTree({
        dir,
        files: {
          'actors.yml': [
            'actor:',
            '  - slug: instructor',
            '    brain: claude',
            '    roles: [surfschool/coach, surfschool/lifeguard]',
            '  - slug: apprentice',
            "    roles: ['@instructor', -lifeguard]",
            '',
          ].join('\n'),
        },
      });
      return { uri: join(dir, 'actors.yml') };
    });

    when('[t0] its published actors are read', () => {
      then('each declared actor is returned, in order, with its roles', () => {
        const actors = getActorsPublishedOfRegistry({
          registry: genRegistry({ actorsUri: scene.uri }),
        });
        expect(actors.map((one) => one.slug)).toEqual([
          'instructor',
          'apprentice',
        ]);
        expect(actors[0]?.roles).toEqual([
          'surfschool/coach',
          'surfschool/lifeguard',
        ]);
      });
    });
  });

  given('[case3] a registry whose `actors` ref names an absent file', () => {
    when('[t0] its published actors are read', () => {
      then('it fails fast, and names the path', async () => {
        const error = await getError(() =>
          getActorsPublishedOfRegistry({
            registry: genRegistry({ actorsUri: '/absent/actors.yml' }),
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain(
          'getRoleRegistry names an actors yml that is absent',
        );
      });
    });
  });

  given('[case4] a registry whose actors yml is invalid yaml', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'actors-published-registry-bad' });
      genSampleFileTree({
        dir,
        files: { 'actors.yml': 'actor: [\n  - slug: : :\n' },
      });
      return { uri: join(dir, 'actors.yml') };
    });

    when('[t0] its published actors are read', () => {
      then(
        'it fails fast as invalid yaml, with the parse fault as cause',
        async () => {
          const error = await getError(() =>
            getActorsPublishedOfRegistry({
              registry: genRegistry({ actorsUri: scene.uri }),
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain(
            'published actors yml has invalid yaml',
          );
          expect(error).toMatchObject({ cause: expect.any(Error) });
        },
      );
    });
  });

  given('[case5] a registry whose actors yml names `ambient:`', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'actors-published-registry-ambient' });
      genSampleFileTree({
        dir,
        files: {
          'actors.yml': [
            "ambient: '@instructor'",
            'actor:',
            '  - slug: instructor',
            '    brain: claude',
            '    roles: [surfschool/coach]',
            '',
          ].join('\n'),
        },
      });
      return { uri: join(dir, 'actors.yml') };
    });

    when('[t0] its published actors are read', () => {
      then(
        'it is refused: the repo actor is the consumer choice (F9)',
        async () => {
          const error = await getError(() =>
            getActorsPublishedOfRegistry({
              registry: genRegistry({ actorsUri: scene.uri }),
            }),
          );
          expect(error.message).toContain(
            'published actors yml declares `ambient:`',
          );
        },
      );
    });
  });
});
