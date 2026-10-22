import { getAllRolesUnlinked } from './getAllRolesUnlinked';

const REFS = [
  { repo: 'ehmpathy', role: 'mechanic' },
  { repo: 'bhrain', role: 'driver' },
];

describe('getAllRolesUnlinked', () => {
  test('names each focused role no ref matches', () => {
    expect(
      getAllRolesUnlinked({
        refs: REFS,
        foci: [{ role: 'mechanic' }, { role: 'architect' }],
      }),
    ).toEqual(['architect']);
  });

  test('names none when every role is linked', () => {
    expect(
      getAllRolesUnlinked({
        refs: REFS,
        foci: [{ role: 'ehmpathy/mechanic' }, { role: 'driver' }],
      }),
    ).toEqual([]);
  });
});
