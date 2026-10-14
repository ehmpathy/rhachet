import { given, then, when } from 'test-fns';

import { asJsonObjectOrNull } from './asJsonObjectOrNull';

describe('asJsonObjectOrNull', () => {
  given('[case1] content that is a json object', () => {
    when('[t0] it is parsed', () => {
      then('the object is returned', () => {
        expect(
          asJsonObjectOrNull({ content: '{"model":"x","hooks":{}}' }),
        ).toEqual({
          model: 'x',
          hooks: {},
        });
      });
    });
  });

  given('[case2] content that is not a json object', () => {
    when('[t0] each is parsed', () => {
      then(
        'null is returned for bad json, an array, a scalar, and json null',
        () => {
          for (const content of [
            '{not json',
            '[1,2]',
            '"text"',
            '42',
            'null',
            '',
          ])
            expect(asJsonObjectOrNull({ content })).toBeNull();
        },
      );
    });
  });
});
