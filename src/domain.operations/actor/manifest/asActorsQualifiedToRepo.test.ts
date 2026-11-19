import { ActorDeclared } from '@src/domain.objects/ActorDeclared';

import { asActorsQualifiedToRepo } from './asActorsQualifiedToRepo';

const TEST_CASES = [
  {
    description: 'a bare concrete role is qualified to the repo',
    roles: ['mechanic', 'bhuild/behaver'],
    expected: ['ehmpathy/mechanic', 'bhuild/behaver'],
  },
  {
    description: 'a bare delta keeps its sigil and is qualified',
    roles: ['@builder', '+architect', '-driver'],
    expected: ['@builder', '+ehmpathy/architect', '-ehmpathy/driver'],
  },
  {
    description: 'a base and a qualified delta pass as written',
    roles: ['@bhuild/crew', '+bhrain/reviewer'],
    expected: ['@bhuild/crew', '+bhrain/reviewer'],
  },
];

describe('asActorsQualifiedToRepo', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const [actor] = asActorsQualifiedToRepo({
        actors: [
          new ActorDeclared({
            slug: 'builder',
            brain: 'anthropic/claude/code',
            roles: thisCase.roles,
          }),
        ],
        repo: 'ehmpathy',
      });
      expect(actor?.roles).toEqual(thisCase.expected);
    }),
  );
});
