import { given, then, when } from 'test-fns';

import { getOneColumnWidth } from './getOneColumnWidth';

describe('getOneColumnWidth', () => {
  given('[case1] cells of mixed length', () => {
    when('[t0] measured', () => {
      then('the width is the length of the widest cell', () => {
        expect(getOneColumnWidth({ cells: ['a', 'abcd', 'ab'] })).toBe(4);
      });
    });
  });

  given('[case2] no cells', () => {
    when('[t0] measured', () => {
      then('the width is 0, never -Infinity', () => {
        expect(getOneColumnWidth({ cells: [] })).toBe(0);
      });
    });
  });
});
