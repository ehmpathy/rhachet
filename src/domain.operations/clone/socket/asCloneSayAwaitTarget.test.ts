import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asCloneSayAwaitTarget } from './asCloneSayAwaitTarget';

describe('asCloneSayAwaitTarget', () => {
  given('a valid --await value', () => {
    when('enqueue', () => {
      then('it narrows to enqueue', () => {
        expect(asCloneSayAwaitTarget({ raw: 'enqueue' })).toEqual('enqueue');
      });
    });
    when('release', () => {
      then('it narrows to release', () => {
        expect(asCloneSayAwaitTarget({ raw: 'release' })).toEqual('release');
      });
    });
  });

  given('an unknown --await value', () => {
    when('cast', () => {
      then(
        'it throws a ConstraintError that names the valid set + the fix',
        () => {
          const error = getError(() => asCloneSayAwaitTarget({ raw: 'nope' }));
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain("'enqueue' or 'release'");
          expect(error.message).toContain('nope');
        },
      );
    });
  });
});
