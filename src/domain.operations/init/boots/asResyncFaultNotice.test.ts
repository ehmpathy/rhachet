import { given, then, when } from 'test-fns';

import { asResyncFaultNotice } from './asResyncFaultNotice';

describe('asResyncFaultNotice', () => {
  given('[case1] an Error with a stack', () => {
    when('[t0] the notice is rendered', () => {
      const error = new TypeError('boot.md unwritable');
      const notice = asResyncFaultNotice({ error });

      then('it opens with the qualified malfunction header', () => {
        expect(notice.split('\n')[0]).toEqual(
          '💥 MalfunctionError: the boot + hook resync after the part-way fault faulted too',
        );
      });

      then('it keeps the class and the message', () => {
        expect(notice).toContain('TypeError: boot.md unwritable');
      });

      then('it keeps the stack frames', () => {
        expect(notice).toContain('asResyncFaultNotice.test.ts');
      });
    });
  });

  given('[case2] a thrown non-Error value', () => {
    when('[t0] the value is null', () => {
      then('the notice still names it', () => {
        expect(asResyncFaultNotice({ error: null })).toContain('   │ null');
      });
    });
  });
});
