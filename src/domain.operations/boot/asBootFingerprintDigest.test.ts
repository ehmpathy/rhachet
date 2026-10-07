import { given, then, when } from 'test-fns';

import { asBootFingerprintDigest } from './asBootFingerprintDigest';

describe('asBootFingerprintDigest', () => {
  given('[case1] one set of lines', () => {
    const lines = ['a.md:10:1\n', 'b.md:20:2\n'];

    when('[t0] it is digested twice', () => {
      then('the digest is identical', () => {
        expect(asBootFingerprintDigest({ version: 'v1', lines })).toEqual(
          asBootFingerprintDigest({ version: 'v1', lines }),
        );
      });
    });

    when('[t1] the same lines arrive in another order', () => {
      then('the digest is identical — it keys on the set', () => {
        expect(asBootFingerprintDigest({ version: 'v1', lines })).toEqual(
          asBootFingerprintDigest({
            version: 'v1',
            lines: [...lines].reverse(),
          }),
        );
      });
    });

    when('[t2] one line changes', () => {
      then('the digest moves', () => {
        expect(asBootFingerprintDigest({ version: 'v1', lines })).not.toEqual(
          asBootFingerprintDigest({
            version: 'v1',
            lines: ['a.md:11:1\n', 'b.md:20:2\n'],
          }),
        );
      });
    });

    when('[t3] the version changes', () => {
      then(
        'the digest moves — a memo shape bump invalidates every prior',
        () => {
          expect(asBootFingerprintDigest({ version: 'v1', lines })).not.toEqual(
            asBootFingerprintDigest({ version: 'v2', lines }),
          );
        },
      );
    });

    when('[t4] the input array is digested', () => {
      then('the caller array is left in its own order', () => {
        const unsorted = ['z\n', 'a\n'];
        asBootFingerprintDigest({ version: 'v1', lines: unsorted });
        expect(unsorted).toEqual(['z\n', 'a\n']);
      });
    });
  });
});
