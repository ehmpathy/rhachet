import { given, then, when } from 'test-fns';

import { getOneTreeSpine } from './getOneTreeSpine';

describe('getOneTreeSpine', () => {
  given('[case1] a parent that is not the last row', () => {
    when('[t0] its children indent', () => {
      then('the spine continues, 3 chars wide', () => {
        expect(getOneTreeSpine({ index: 0, length: 2 })).toBe('│  ');
      });
    });
  });

  given('[case2] a parent that is the last row', () => {
    when('[t0] its children indent', () => {
      then('the spine is blank, 3 chars wide', () => {
        expect(getOneTreeSpine({ index: 1, length: 2 })).toBe('   ');
      });
    });
  });
});
