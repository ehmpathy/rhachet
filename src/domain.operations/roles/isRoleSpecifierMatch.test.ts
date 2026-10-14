import { given, then, when } from 'test-fns';

import { isRoleSpecifierMatch } from './isRoleSpecifierMatch';

describe('isRoleSpecifierMatch', () => {
  given('[case1] two specifiers of the same slug', () => {
    when('[t0] both are unqualified', () => {
      then('they match', () => {
        expect(
          isRoleSpecifierMatch({ left: 'architect', right: 'architect' }),
        ).toEqual(true);
      });
    });

    when('[t1] one is qualified, one is not', () => {
      then('they match — the unqualified one may name any repo', () => {
        expect(
          isRoleSpecifierMatch({
            left: 'ehmpathy/architect',
            right: 'architect',
          }),
        ).toEqual(true);
      });
    });

    when('[t2] both are qualified, in one repo', () => {
      then('they match', () => {
        expect(
          isRoleSpecifierMatch({
            left: 'ehmpathy/architect',
            right: 'ehmpathy/architect',
          }),
        ).toEqual(true);
      });
    });

    when('[t3] both are qualified, in two repos', () => {
      then('they do not match', () => {
        expect(
          isRoleSpecifierMatch({
            left: 'ehmpathy/architect',
            right: 'bhuild/architect',
          }),
        ).toEqual(false);
      });
    });
  });

  given('[case2] two specifiers of different slugs', () => {
    when('[t0] both are unqualified', () => {
      then('they do not match', () => {
        expect(
          isRoleSpecifierMatch({ left: 'architect', right: 'mechanic' }),
        ).toEqual(false);
      });
    });
  });
});
