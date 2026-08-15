import { given, then, when } from 'test-fns';

import { genCloneSerial } from './genCloneSerial';

describe('genCloneSerial', () => {
  given('[case1] a fresh serial', () => {
    when('[t0] minted', () => {
      then('it is uuid-shaped', () => {
        expect(genCloneSerial()).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      });

      then('two mints never collide', () => {
        expect(genCloneSerial()).not.toEqual(genCloneSerial());
      });
    });
  });
});
