import { asRoleSlugsOfSpecifiers } from './asRoleSlugsOfSpecifiers';
import { asRoleSpecifiersOfLinkedRefs } from './asRoleSpecifiersOfLinkedRefs';
import { asRoleSpecifiersToLink } from './asRoleSpecifiersToLink';

describe('asRoleSpecifiersOfLinkedRefs', () => {
  test('splits package roles from native `.this` roles, as `repo/role`', () => {
    expect(
      asRoleSpecifiersOfLinkedRefs({
        refs: [
          { repo: 'ehmpathy', role: 'mechanic' },
          { repo: '.this', role: 'any' },
          { repo: 'bhrain', role: 'driver' },
        ],
      }),
    ).toEqual({
      linked: ['ehmpathy/mechanic', 'bhrain/driver'],
      linkedNative: ['.this/any'],
    });
  });

  test('no refs yields two empty lists', () => {
    expect(asRoleSpecifiersOfLinkedRefs({ refs: [] })).toEqual({
      linked: [],
      linkedNative: [],
    });
  });
});

describe('asRoleSpecifiersToLink', () => {
  test('drops every native `.this` role, keeps the rest in order', () => {
    expect(
      asRoleSpecifiersToLink({
        union: [
          { role: 'ehmpathy/mechanic' },
          { role: '.this/any' },
          { role: 'bhrain/driver' },
        ],
      }),
    ).toEqual(['ehmpathy/mechanic', 'bhrain/driver']);
  });
});

describe('asRoleSlugsOfSpecifiers', () => {
  test('strips the repo half; a bare slug passes as is', () => {
    expect(
      asRoleSlugsOfSpecifiers({
        specifiers: ['ehmpathy/mechanic', 'bhrain/driver', 'architect'],
      }),
    ).toEqual(['mechanic', 'driver', 'architect']);
  });
});
