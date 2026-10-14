import { given, then, when } from 'test-fns';

import { asRecordOrNull } from './asRecordOrNull';

describe('asRecordOrNull', () => {
  given('[case1] a plain object', () => {
    when('[t0] narrowed', () => {
      then('it is returned as a record of the same entries', () => {
        expect(asRecordOrNull({ value: { a: 1, b: 'two' } })).toEqual({
          a: 1,
          b: 'two',
        });
      });
    });
  });

  given('[case2] a value that is not a plain object', () => {
    when('[t0] narrowed', () => {
      then('null, an array, a string and a number each yield null', () => {
        expect(asRecordOrNull({ value: null })).toBeNull();
        expect(asRecordOrNull({ value: ['a'] })).toBeNull();
        expect(asRecordOrNull({ value: 'scripts' })).toBeNull();
        expect(asRecordOrNull({ value: 7 })).toBeNull();
      });
    });
  });
});
