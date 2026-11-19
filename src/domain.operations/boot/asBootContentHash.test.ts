import { given, then, when } from 'test-fns';

import { asBootContentHash } from './asBootContentHash';

describe('asBootContentHash', () => {
  given('[case1] a boot as a string', () => {
    when('[t0] it is hashed', () => {
      const hash = asBootContentHash({ bytes: 'paddle out at dawn\n' });

      then('the hash is 16 lowercase hex chars', () => {
        expect(hash).toMatch(/^[0-9a-f]{16}$/);
      });

      then('the same bytes give the same hash', () => {
        expect(asBootContentHash({ bytes: 'paddle out at dawn\n' })).toEqual(
          hash,
        );
      });

      then('different bytes give a different hash', () => {
        expect(
          asBootContentHash({ bytes: 'paddle out at dusk\n' }),
        ).not.toEqual(hash);
      });

      then('a one-byte difference (the last newline) changes the hash', () => {
        expect(asBootContentHash({ bytes: 'paddle out at dawn' })).not.toEqual(
          hash,
        );
      });
    });
  });

  given('[case2] the same bytes as a string and as a buffer', () => {
    const bytes = 'paddle out at dawn\n';

    when('[t0] each is hashed', () => {
      then('the hashes are equal', () => {
        expect(
          asBootContentHash({ bytes: Buffer.from(bytes, 'utf8') }),
        ).toEqual(asBootContentHash({ bytes }));
      });
    });
  });

  given('[case3] empty bytes', () => {
    when('[t0] they are hashed', () => {
      then('the hash is the known sha256 prefix of empty input', () => {
        expect(asBootContentHash({ bytes: '' })).toEqual('e3b0c44298fc1c14');
        expect(asBootContentHash({ bytes: Buffer.alloc(0) })).toEqual(
          'e3b0c44298fc1c14',
        );
      });
    });
  });
});
