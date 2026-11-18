import { given, then, when } from 'test-fns';

import { asCloneBootDriftLines } from './asCloneBootDriftLines';

const COUNTS_NONE = { changed: 0, added: 0, removed: 0 };

describe('asCloneBootDriftLines', () => {
  given('[case1] a clone that spawned on the current boot', () => {
    when('[t0] it is inspected', () => {
      then('it says there is no drift, and names its revision', () => {
        expect(
          asCloneBootDriftLines({
            for: 'inspect',
            address: '@:reviewer',
            drift: {
              kind: 'current',
              revision: '0123456789abcdef',
              drift: null,
              lines: 0,
              counts: COUNTS_NONE,
              outside: false,
            },
          }),
        ).toEqual([
          '😶 boot drift of @:reviewer',
          '   ├─ spawn revision = sha256=0123456789abcdef',
          '   └─ no drift; the clone holds the current boot',
        ]);
      });
    });
  });

  given('[case2] a boot that changed only outside the briefs', () => {
    when('[t0] the clone is nudged', () => {
      const lines = asCloneBootDriftLines({
        for: 'nudge',
        address: '@:reviewer',
        drift: {
          kind: 'drifted',
          revision: '0123456789abcdef',
          drift: 'fedcba9876543210',
          lines: 212,
          counts: COUNTS_NONE,
          outside: true,
        },
      });

      then(
        'it never reads as no drift, and names respawn as the only cure for the outside part',
        () => {
          expect(lines).toContain(
            '   ├─ no block drifted; the change sits outside the briefs, or in whitespace and order alone',
          );
          expect(lines).toContain(
            '   ├─ the boot also changed outside the briefs, which only a respawn takes',
          );
          expect(lines).toMatchSnapshot();
        },
      );
    });
  });
});
