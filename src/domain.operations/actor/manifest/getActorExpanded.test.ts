import { getError, given, then, when } from 'test-fns';

import { ActorDeclared } from '@src/domain.objects/ActorDeclared';
import { ActorsManifest } from '@src/domain.objects/ActorsManifest';

import { type GetPublishedActor, getActorExpanded } from './getActorExpanded';

/**
 * .what = a published-actor lookup over a fixed set, as installed packages would answer
 */
const genGetPublishedActor =
  (input: { actors: Record<string, ActorDeclared> }): GetPublishedActor =>
  ({ repo, slug }) =>
    input.actors[`${repo}/${slug}`] ?? null;

const PUBLISHED = {
  'ehmpathy/builder': new ActorDeclared({
    slug: 'builder',
    brain: 'anthropic/claude/code',
    roles: ['ehmpathy/mechanic', 'bhrain/driver', 'bhuild/behaver'],
  }),
};

describe('getActorExpanded', () => {
  given(
    '[case1] an actor that extends a published base and omits its brain',
    () => {
      const manifest = new ActorsManifest({
        ambient: '@builder',
        actor: [
          new ActorDeclared({
            slug: 'builder',
            brain: null,
            roles: ['@ehmpathy/builder', '+bhrowser/playwright', '-driver'],
          }),
        ],
      });
      const context = {
        manifest,
        getPublishedActor: genGetPublishedActor({ actors: PUBLISHED }),
      };

      when('[t0] it is expanded', () => {
        const expanded = getActorExpanded(
          { ref: '@builder', scope: null, trail: [] },
          context,
        );

        then('the base brain propagates up (F11, S8)', () => {
          expect(expanded.brain).toEqual('anthropic/claude/code');
        });
        then(
          'the deltas apply over the base roles; a bare -driver matches bhrain/driver',
          () => {
            expect(expanded.roles).toEqual([
              'ehmpathy/mechanic',
              'bhuild/behaver',
              'bhrowser/playwright',
            ]);
          },
        );
        then('each role names its source', () => {
          expect(expanded.rolesVia).toEqual({
            'ehmpathy/mechanic': '@ehmpathy/builder',
            'bhuild/behaver': '@ehmpathy/builder',
            'bhrowser/playwright': null,
          });
        });
      });
    },
  );

  given('[case2] a local brain overrides the base brain', () => {
    const manifest = new ActorsManifest({
      ambient: '@mechanic',
      actor: [
        new ActorDeclared({
          slug: 'mechanic',
          brain: 'claude',
          roles: ['ehmpathy/mechanic'],
        }),
        new ActorDeclared({
          slug: 'foreman',
          brain: 'codex',
          roles: ['@mechanic', '+supervisor'],
        }),
      ],
    });
    const context = {
      manifest,
      getPublishedActor: genGetPublishedActor({ actors: {} }),
    };

    when('[t0] the peer extension is expanded', () => {
      const expanded = getActorExpanded(
        { ref: '@foreman', scope: null, trail: [] },
        context,
      );

      then('the local brain wins', () => {
        expect(expanded.brain).toEqual('codex');
      });
      then('the roles hold the base plus the addition', () => {
        expect(expanded.roles).toEqual(['ehmpathy/mechanic', 'supervisor']);
      });
    });
  });

  given('[case3] a -role the base does not hold', () => {
    const manifest = new ActorsManifest({
      ambient: '@a',
      actor: [
        new ActorDeclared({
          slug: 'a',
          brain: 'claude',
          roles: ['ehmpathy/mechanic'],
        }),
        new ActorDeclared({ slug: 'b', brain: null, roles: ['@a', '-driver'] }),
      ],
    });
    const context = {
      manifest,
      getPublishedActor: genGetPublishedActor({ actors: {} }),
    };

    when('[t0] it is expanded', () => {
      const expanded = getActorExpanded(
        { ref: '@b', scope: null, trail: [] },
        context,
      );

      then('it warns, and intent holds', () => {
        expect(expanded.roles).toEqual(['ehmpathy/mechanic']);
        expect(expanded.warnings).toEqual([
          '@b removes -driver, which @a does not hold',
        ]);
      });
    });
  });

  given(
    '[case5] a published actor that extends a peer of its own package',
    () => {
      const published = {
        'ehmpathy/mechanic': new ActorDeclared({
          slug: 'mechanic',
          brain: 'anthropic/claude/code',
          roles: ['ehmpathy/mechanic', 'bhrain/driver'],
        }),
        'ehmpathy/builder': new ActorDeclared({
          slug: 'builder',
          brain: null,
          roles: ['@mechanic', '+bhuild/behaver'],
        }),
      };
      const manifest = new ActorsManifest({
        ambient: '@mechanic',
        actor: [
          new ActorDeclared({
            slug: 'mechanic',
            brain: 'codex',
            roles: ['ghlitch/operator'],
          }),
          new ActorDeclared({
            slug: 'crew',
            brain: null,
            roles: ['@ehmpathy/builder'],
          }),
        ],
      });
      const context = {
        manifest,
        getPublishedActor: genGetPublishedActor({ actors: published }),
      };

      when('[t0] the consumer actor is expanded', () => {
        const expanded = getActorExpanded(
          { ref: '@crew', scope: null, trail: [] },
          context,
        );

        then(
          "the package's @mechanic resolves in its own scope, not the consumer's",
          () => {
            expect(expanded.roles).toEqual([
              'ehmpathy/mechanic',
              'bhrain/driver',
              'bhuild/behaver',
            ]);
          },
        );
        then('the brain propagates up two levels', () => {
          expect(expanded.brain).toEqual('anthropic/claude/code');
        });
        then('each role names the base the consumer wrote', () => {
          expect(expanded.rolesVia).toEqual({
            'ehmpathy/mechanic': '@ehmpathy/builder',
            'bhrain/driver': '@ehmpathy/builder',
            'bhuild/behaver': '@ehmpathy/builder',
          });
        });
      });
    },
  );

  given('[case4] refusals', () => {
    when('[t0] a base names an undeclared peer', () => {
      then('it lists the declared actors', async () => {
        const manifest = new ActorsManifest({
          ambient: '@a',
          actor: [
            new ActorDeclared({ slug: 'a', brain: null, roles: ['@nobody'] }),
          ],
        });
        const error = await getError(() =>
          getActorExpanded(
            { ref: '@a', scope: null, trail: [] },
            {
              manifest,
              getPublishedActor: genGetPublishedActor({ actors: {} }),
            },
          ),
        );
        expect(error.message).toContain(
          'actors.yml names an actor not declared: @nobody',
        );
        expect(error.message).toContain("'@a'");
      });
    });

    when('[t1] a published base is not installed', () => {
      then('it names the package to install', async () => {
        const manifest = new ActorsManifest({
          ambient: '@a',
          actor: [
            new ActorDeclared({
              slug: 'a',
              brain: null,
              roles: ['@ghlitch/watcher'],
            }),
          ],
        });
        const error = await getError(() =>
          getActorExpanded(
            { ref: '@a', scope: null, trail: [] },
            {
              manifest,
              getPublishedActor: genGetPublishedActor({ actors: {} }),
            },
          ),
        );
        expect(error.message).toContain(
          'published actor not found: @ghlitch/watcher',
        );
        expect(error.message).toContain('rhachet-roles-ghlitch');
      });
    });

    when('[t2] two actors extend each other', () => {
      then('it names the cycle path', async () => {
        const manifest = new ActorsManifest({
          ambient: '@a',
          actor: [
            new ActorDeclared({ slug: 'a', brain: null, roles: ['@b'] }),
            new ActorDeclared({ slug: 'b', brain: null, roles: ['@a'] }),
          ],
        });
        const error = await getError(() =>
          getActorExpanded(
            { ref: '@a', scope: null, trail: [] },
            {
              manifest,
              getPublishedActor: genGetPublishedActor({ actors: {} }),
            },
          ),
        );
        expect(error.message).toContain('actors.yml has an extension cycle');
        expect(error.message).toContain('@a → @b → @a');
      });
    });
  });
});
