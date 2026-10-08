import { given, then, when } from 'test-fns';

import { asSnapshotSafe } from './asSnapshotSafe';

describe('asSnapshotSafe', () => {
  given('[case1] a temp dir nested inside the repo root', () => {
    when('[t0] both are masked', () => {
      then('the nested dir keeps its own mask, whatever the mask order', () => {
        expect(
          asSnapshotSafe({
            of: 'refused /repo/.temp/x/boot.yml, outside /repo',
            masks: [
              { path: '/repo', into: '/REPO_ROOT' },
              { path: '/repo/.temp/x', into: '/TMP_REPO' },
            ],
          }),
        ).toBe('refused /TMP_REPO/boot.yml, outside /REPO_ROOT');
      });
    });
  });

  given('[case2] no masks', () => {
    when('[t0] masked', () => {
      then('the message is unchanged', () => {
        expect(asSnapshotSafe({ of: 'as is', masks: [] })).toBe('as is');
      });
    });
  });
});
