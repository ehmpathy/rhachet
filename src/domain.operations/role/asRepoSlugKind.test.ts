import { asRepoSlugKind } from './asRepoSlugKind';

const TEST_CASES = [
  {
    description: 'the bare `.this` slug is native',
    slug: '.this',
    kind: 'native',
  },
  {
    description: 'the `.this` dir entry is native',
    slug: 'repo=.this',
    kind: 'native',
  },
  { description: 'the bare `.mods` slug is mods', slug: '.mods', kind: 'mods' },
  {
    description: 'the `.mods` dir entry is mods',
    slug: 'repo=.mods',
    kind: 'mods',
  },
  {
    description: 'a package slug is a package',
    slug: 'ehmpathy',
    kind: 'package',
  },
  {
    description: 'a package dir entry is a package',
    slug: 'repo=bhrain',
    kind: 'package',
  },
  {
    description: 'a near-miss of a reserved literal is a package',
    slug: '.mod',
    kind: 'package',
  },
] as const;

describe('asRepoSlugKind', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(asRepoSlugKind({ slug: thisCase.slug })).toEqual(thisCase.kind);
    }),
  );
});
