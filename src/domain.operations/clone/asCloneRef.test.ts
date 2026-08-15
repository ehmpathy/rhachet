import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asCloneRef } from './asCloneRef';

const A_UUID = '7f3a1b2c-0d4e-4f6a-8b9c-1d2e3f4a5b6c';

describe('asCloneRef', () => {
  given('[case1] a slug address', () => {
    when('[t0] via the @: sigil', () => {
      then('it parses as a slug ref', () => {
        expect(asCloneRef({ raw: '@:driver' })).toEqual({
          by: 'slug',
          slug: 'driver',
        });
      });
    });

    when('[t1] via the clone:// uri', () => {
      then('it parses as a slug ref', () => {
        expect(asCloneRef({ raw: 'clone://driver' })).toEqual({
          by: 'slug',
          slug: 'driver',
        });
      });
    });
  });

  given('[case2] a serial address', () => {
    when('[t0] a uuid-shaped body', () => {
      then('it parses as a serial ref (primary)', () => {
        expect(asCloneRef({ raw: `@:${A_UUID}` })).toEqual({
          by: 'serial',
          serial: A_UUID,
        });
      });
    });
  });

  given('[case3] the WRONG grain — an actor address', () => {
    when('[t0] a bare @<actor>', () => {
      then('it fails loud and names the @: fix', async () => {
        const error = await getError(() => asCloneRef({ raw: '@mechanic' }));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('@:mechanic');
      });

      then(
        'it carries the fix in the metadata hint (for --output json)',
        async () => {
          // a machine consumer reads metadata.hint (asCliErrorJson), never the prose
          const error = await getError(() => asCloneRef({ raw: '@mechanic' }));
          expect(error).toMatchObject({
            metadata: { hint: `use '@:mechanic'` },
          });
        },
      );
    });
  });

  given('[case4] a dropped sigil', () => {
    when('[t0] a bare body with no @:', () => {
      then('it fails loud and names the @: fix', async () => {
        const error = await getError(() => asCloneRef({ raw: 'driver' }));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('@:driver');
      });

      then(
        'it carries the fix in the metadata hint (for --output json)',
        async () => {
          const error = await getError(() => asCloneRef({ raw: 'driver' }));
          expect(error).toMatchObject({ metadata: { hint: `use '@:driver'` } });
        },
      );
    });
  });

  given('[case5] an empty body', () => {
    when('[t0] just the @: sigil', () => {
      then('it fails loud with a metadata hint', async () => {
        const error = await getError(() => asCloneRef({ raw: '@:' }));
        expect(error).toBeInstanceOf(ConstraintError);
        // the hint names how to fix an empty address, for a machine consumer
        expect(error).toMatchObject({
          metadata: {
            hint: `name a clone after '@:', e.g. '@:driver' or '@:<serial>'`,
          },
        });
      });
    });
  });
});
