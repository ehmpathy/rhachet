import { ActorsManifest } from '@src/domain.objects/ActorsManifest';

import { asSlugsOfActorsDeclared } from './asSlugsOfActorsDeclared';
import { isActorDeclared } from './isActorDeclared';

const MANIFEST = new ActorsManifest({
  ambient: '@builder',
  actor: [
    { slug: 'builder', brain: null, roles: ['@ehmpathy/builder'] },
    { slug: 'scholar', brain: null, roles: ['bhrain/librarian'] },
  ],
});

const CASES = [
  { ref: '@builder', expect: true },
  { ref: '@scholar', expect: true },
  { ref: '@ghost', expect: false },
  { ref: 'builder', expect: false },
];

describe('isActorDeclared', () => {
  CASES.map((thisCase) =>
    test(`${thisCase.ref} → ${thisCase.expect}`, () => {
      expect(
        isActorDeclared({ manifest: MANIFEST, ref: thisCase.ref }),
      ).toEqual(thisCase.expect);
    }),
  );
});

describe('asSlugsOfActorsDeclared', () => {
  test('the declared slugs, in file order', () => {
    expect(asSlugsOfActorsDeclared({ manifest: MANIFEST })).toEqual([
      'builder',
      'scholar',
    ]);
  });
});
