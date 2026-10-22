import { asRoleRefsAtFoci } from './asRoleRefsAtFoci';

const REFS = [
  { repo: 'ehmpathy', role: 'mechanic' },
  { repo: 'bhrain', role: 'driver' },
];

describe('asRoleRefsAtFoci', () => {
  test('each focus gets its linked ref, with the subjects it holds', () => {
    expect(
      asRoleRefsAtFoci({
        refs: REFS,
        foci: [
          { role: 'ehmpathy/mechanic', subjects: ['flow'] },
          { role: 'driver', subjects: null },
        ],
      }),
    ).toEqual([
      { repo: 'ehmpathy', role: 'mechanic', subjects: ['flow'] },
      { repo: 'bhrain', role: 'driver', subjects: null },
    ]);
  });

  test('a focus no ref matches yields naught', () => {
    expect(
      asRoleRefsAtFoci({
        refs: REFS,
        foci: [{ role: 'architect', subjects: ['terms'] }],
      }),
    ).toEqual([]);
  });
});
