import { getError } from 'test-fns';

import { asActorsManifest } from './asActorsManifest';

const PATH = '.agent/actors.yml';

const CASES_ACCEPTED = [
  {
    description: 'an actor with concrete roles and a brain',
    parsed: {
      ambient: '@scholar',
      actor: [
        {
          slug: 'scholar',
          brain: 'anthropic/claude/code',
          roles: ['bhrain/librarian', 'ehmpathy/architect'],
        },
      ],
    },
    expect: {
      ambient: '@scholar',
      slugs: ['scholar'],
      brains: ['anthropic/claude/code'],
    },
  },
  {
    description: 'an actor that extends a base may omit its brain (F11, S8)',
    parsed: {
      ambient: '@builder',
      actor: [
        {
          slug: 'builder',
          roles: ['@ehmpathy/builder', '+bhrowser/playwright'],
        },
      ],
    },
    expect: { ambient: '@builder', slugs: ['builder'], brains: [null] },
  },
  {
    description: 'a peer base with plus and minus deltas',
    parsed: {
      ambient: '@mechanic',
      actor: [
        {
          slug: 'mechanic',
          brain: 'claude',
          roles: ['ehmpathy/mechanic', 'bhrain/driver'],
        },
        { slug: 'foreman', roles: ['@mechanic', '-driver', '+supervisor'] },
      ],
    },
    expect: {
      ambient: '@mechanic',
      slugs: ['mechanic', 'foreman'],
      brains: ['claude', null],
    },
  },
];

const CASES_REFUSED = [
  {
    description: 'no `ambient:` key, even with a sole actor (S9)',
    parsed: {
      actor: [
        { slug: 'scholar', brain: 'claude', roles: ['bhrain/librarian'] },
      ],
    },
    message: 'actors.yml has no `ambient:` key',
  },
  {
    description: '`ambient:` names an undeclared actor',
    parsed: {
      ambient: '@nobody',
      actor: [
        { slug: 'scholar', brain: 'claude', roles: ['bhrain/librarian'] },
      ],
    },
    message: 'actors.yml `ambient:` names an actor not declared',
  },
  {
    description: 'a typo in `ambient:` names the actor meant',
    parsed: {
      ambient: '@scholr',
      actor: [
        { slug: 'scholar', brain: 'claude', roles: ['bhrain/librarian'] },
        { slug: 'builder', brain: 'claude', roles: ['ehmpathy/mechanic'] },
      ],
    },
    message: "did you mean '@scholar'?",
  },
  {
    description: '`ambient:` without the `@` sigil',
    parsed: {
      ambient: 'scholar',
      actor: [
        { slug: 'scholar', brain: 'claude', roles: ['bhrain/librarian'] },
      ],
    },
    message: 'actors.yml `ambient:` does not name an actor',
  },
  {
    description: 'concrete roles mixed with deltas (S6)',
    parsed: {
      ambient: '@a',
      actor: [
        { slug: 'a', brain: 'claude', roles: ['ehmpathy/mechanic', '-driver'] },
      ],
    },
    message: 'actors.yml actor @a mixes concrete roles with a base or deltas',
  },
  {
    description: 'deltas with no base',
    parsed: {
      ambient: '@a',
      actor: [{ slug: 'a', brain: 'claude', roles: ['+mechanic', '-driver'] }],
    },
    message: 'actors.yml actor @a has deltas with no base',
  },
  {
    description: 'two bases',
    parsed: {
      ambient: '@a',
      actor: [{ slug: 'a', roles: ['@b', '@c'] }],
    },
    message: 'actors.yml actor @a names more than one base',
  },
  {
    description: 'a base after a delta',
    parsed: {
      ambient: '@a',
      actor: [{ slug: 'a', roles: ['+mechanic', '@b'] }],
    },
    message: 'actors.yml actor @a names its base after a role',
  },
  {
    description: 'concrete roles and no brain (F11, S7)',
    parsed: {
      ambient: '@a',
      actor: [{ slug: 'a', roles: ['ehmpathy/mechanic'] }],
    },
    message: 'actors.yml actor @a reaches no brain',
  },
  {
    description: 'a slug declared twice',
    parsed: {
      ambient: '@a',
      actor: [
        { slug: 'a', brain: 'claude', roles: ['ehmpathy/mechanic'] },
        { slug: 'a', brain: 'claude', roles: ['bhrain/driver'] },
      ],
    },
    message: 'actors.yml declares a slug more than once',
  },
  {
    description: 'a slug with a path separator',
    parsed: {
      ambient: '@a',
      actor: [{ slug: 'a/b', brain: 'claude', roles: ['ehmpathy/mechanic'] }],
    },
    message: "actors.yml actor[0] has a slug that cannot name a dir: 'a/b'",
  },
  {
    description: 'a slug with a lead dot',
    parsed: {
      ambient: '@a',
      actor: [
        { slug: '.hidden', brain: 'claude', roles: ['ehmpathy/mechanic'] },
      ],
    },
    message: "actors.yml actor[0] has a slug that cannot name a dir: '.hidden'",
  },
  {
    description: 'no actor list',
    parsed: { ambient: '@a' },
    message: 'actors.yml declares no actor',
  },
  {
    description: 'not a map',
    parsed: ['@a'],
    message: 'actors.yml is not a map',
  },
];

describe('asActorsManifest', () => {
  CASES_ACCEPTED.map((thisCase) =>
    test(`accepts ${thisCase.description}`, () => {
      const manifest = asActorsManifest({
        parsed: thisCase.parsed,
        path: PATH,
      });
      expect(manifest.ambient).toEqual(thisCase.expect.ambient);
      expect(manifest.actor.map((one) => one.slug)).toEqual(
        thisCase.expect.slugs,
      );
      expect(manifest.actor.map((one) => one.brain)).toEqual(
        thisCase.expect.brains,
      );
    }),
  );

  CASES_REFUSED.map((thisCase) =>
    test(`refuses ${thisCase.description}`, async () => {
      const error = await getError(() =>
        asActorsManifest({ parsed: thisCase.parsed, path: PATH }),
      );
      expect(error.message).toContain(thisCase.message);
      expect(error.message).toContain('hint');
    }),
  );
});
