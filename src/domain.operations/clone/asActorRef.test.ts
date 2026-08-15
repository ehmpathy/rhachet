import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asActorRef } from './asActorRef';

describe('asActorRef', () => {
  given('[case1] an actor address', () => {
    when('[t0] via the bare @ sigil (a hash prefix)', () => {
      then('it parses as a hash-prefix ref', () => {
        expect(asActorRef({ raw: '@9c1e' })).toEqual({ hashPrefix: '9c1e' });
      });
    });

    when('[t1] via the actor:// uri', () => {
      then('it parses as a hash-prefix ref', () => {
        expect(asActorRef({ raw: 'actor://9c1e0af3' })).toEqual({
          hashPrefix: '9c1e0af3',
        });
      });
    });
  });

  given('[case2] the WRONG grain — a clone address', () => {
    when('[t0] a @:<clone>', () => {
      then('it fails loud and names the @ fix', async () => {
        const error = await getError(() => asActorRef({ raw: '@:driver' }));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('@driver');
      });

      then(
        'it carries the fix in the metadata hint (for --output json)',
        async () => {
          // a machine consumer reads metadata.hint (asCliErrorJson), never the prose
          const error = await getError(() => asActorRef({ raw: '@:driver' }));
          expect(error).toMatchObject({ metadata: { hint: `use '@driver'` } });
        },
      );
    });
  });

  given('[case3] a dropped sigil', () => {
    when('[t0] a bare hash with no @', () => {
      then('it fails loud and names the @ fix', async () => {
        const error = await getError(() => asActorRef({ raw: '9c1e' }));
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('@9c1e');
      });

      then(
        'it carries the fix in the metadata hint (for --output json)',
        async () => {
          const error = await getError(() => asActorRef({ raw: '9c1e' }));
          expect(error).toMatchObject({ metadata: { hint: `use '@9c1e'` } });
        },
      );
    });
  });

  given('[case4] an empty body', () => {
    when('[t0] just the @ sigil', () => {
      then('it fails loud with a metadata hint', async () => {
        const error = await getError(() => asActorRef({ raw: '@' }));
        expect(error).toBeInstanceOf(ConstraintError);
        // the hint names how to fix an empty address, for a machine consumer
        expect(error).toMatchObject({
          metadata: { hint: `name an actor after '@', e.g. '@<hash-prefix>'` },
        });
      });
    });
  });
});
