import { given, then, when } from 'test-fns';

import { getOneTokensColumnWidth } from './getOneTokensColumnWidth';

describe('getOneTokensColumnWidth', () => {
  given('[case1] counts that render with thousands separators', () => {
    when('[t0] measured', () => {
      then('the width counts the separators, as the cells render', () => {
        // 1,234,567 renders as 9 chars, not the 7 its digits alone would give
        expect(getOneTokensColumnWidth({ counts: [12, 1234567, 999] })).toBe(9);
      });
    });
  });

  given('[case2] no counts', () => {
    when('[t0] measured', () => {
      then('the width is 0', () => {
        expect(getOneTokensColumnWidth({ counts: [] })).toBe(0);
      });
    });
  });
});
