import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { ActorDeclared } from '@src/domain.objects/ActorDeclared';

import { assertActorsPublishedSound } from './assertActorsPublishedSound';

const genActor = (input: {
  slug: string;
  brain: string | null;
  roles: string[];
}): ActorDeclared => new ActorDeclared(input);

const CASES_SOUND = [
  {
    description: 'concrete roles of this package',
    actors: [
      genActor({
        slug: 'builder',
        brain: 'anthropic/claude/code',
        roles: ['ehmpathy/mechanic', 'ehmpathy/architect'],
      }),
    ],
  },
  {
    description: 'a peer that extends a local base, bare and qualified',
    actors: [
      genActor({
        slug: 'builder',
        brain: 'anthropic/claude/code',
        roles: ['ehmpathy/mechanic'],
      }),
      genActor({
        slug: 'tuner',
        brain: null,
        roles: ['@builder', '+ehmpathy/architect'],
      }),
      genActor({
        slug: 'scholar',
        brain: null,
        roles: ['@ehmpathy/tuner', '-ehmpathy/architect'],
      }),
    ],
  },
  {
    description: 'a base and a role of another package, left to the consumer',
    actors: [
      genActor({
        slug: 'crew',
        brain: null,
        roles: ['@bhrain/scholar', '+bhuild/behaver'],
      }),
    ],
  },
];

const CASES_REFUSED = [
  {
    description: 'a role this package does not declare',
    actors: [
      genActor({
        slug: 'builder',
        brain: 'anthropic/claude/code',
        roles: ['ehmpathy/mechnaic'],
      }),
    ],
    message: "names a role this package does not declare: 'ehmpathy/mechnaic'",
  },
  {
    description: 'a local base not declared',
    actors: [
      genActor({
        slug: 'tuner',
        brain: null,
        roles: ['@biulder', '+ehmpathy/architect'],
      }),
    ],
    message: 'extends a peer not declared: @biulder',
  },
  {
    description: 'a cycle of local bases',
    actors: [
      genActor({ slug: 'a', brain: null, roles: ['@b'] }),
      genActor({ slug: 'b', brain: null, roles: ['@ehmpathy/a'] }),
    ],
    message: 'extension cycle',
  },
];

describe('assertActorsPublishedSound', () => {
  given('[case1] a sound published set', () => {
    CASES_SOUND.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then('it passes', () => {
          expect(() =>
            assertActorsPublishedSound({
              actors: thisCase.actors,
              repo: 'ehmpathy',
              roles: ['mechanic', 'architect'],
              path: '/pkg/actors.yml',
            }),
          ).not.toThrow();
        });
      }),
    );
  });

  given('[case2] an unsound published set', () => {
    CASES_REFUSED.map((thisCase) =>
      when(`[t0] ${thisCase.description}`, () => {
        then('it refuses, and names the fault', async () => {
          const error = await getError(async () =>
            assertActorsPublishedSound({
              actors: thisCase.actors,
              repo: 'ehmpathy',
              roles: ['mechanic', 'architect'],
              path: '/pkg/actors.yml',
            }),
          );
          expect(error.message).toContain(thisCase.message);
        });
      }),
    );
  });
});
