import { getError, given, then, when } from 'test-fns';

import { assertKeyGradeProtected } from './assertKeyGradeProtected';

describe('assertKeyGradeProtected', () => {
  given('[case1] grade degrades', () => {
    when('[t0] encrypted → plaintext', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(async () =>
          assertKeyGradeProtected({
            source: { protection: 'encrypted', duration: 'permanent' },
            target: { protection: 'plaintext', duration: 'permanent' },
          }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('grade degradation forbidden');
      });

      then('error message mentions protection downgrade', async () => {
        const error = await getError(async () =>
          assertKeyGradeProtected({
            source: { protection: 'encrypted', duration: 'permanent' },
            target: { protection: 'plaintext', duration: 'permanent' },
          }),
        );
        expect(error?.message).toContain('protection downgrade');
      });
    });

    when('[t1] ephemeral → permanent', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(async () =>
          assertKeyGradeProtected({
            source: { protection: 'encrypted', duration: 'ephemeral' },
            target: { protection: 'encrypted', duration: 'permanent' },
          }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('grade degradation forbidden');
      });

      then('error message mentions duration downgrade', async () => {
        const error = await getError(async () =>
          assertKeyGradeProtected({
            source: { protection: 'encrypted', duration: 'ephemeral' },
            target: { protection: 'encrypted', duration: 'permanent' },
          }),
        );
        expect(error?.message).toContain('duration downgrade');
      });
    });
  });

  given('[case2] grade upgrades', () => {
    when('[t0] plaintext → encrypted', () => {
      then('does not throw', () => {
        expect(() =>
          assertKeyGradeProtected({
            source: { protection: 'plaintext', duration: 'permanent' },
            target: { protection: 'encrypted', duration: 'permanent' },
          }),
        ).not.toThrow();
      });
    });

    when('[t1] permanent → ephemeral', () => {
      then('does not throw', () => {
        expect(() =>
          assertKeyGradeProtected({
            source: { protection: 'encrypted', duration: 'permanent' },
            target: { protection: 'encrypted', duration: 'ephemeral' },
          }),
        ).not.toThrow();
      });
    });

    when('[t2] permanent → transient', () => {
      then('does not throw', () => {
        expect(() =>
          assertKeyGradeProtected({
            source: { protection: 'encrypted', duration: 'permanent' },
            target: { protection: 'encrypted', duration: 'transient' },
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case3] grade unchanged', () => {
    when('[t0] same grade', () => {
      then('does not throw', () => {
        expect(() =>
          assertKeyGradeProtected({
            source: { protection: 'encrypted', duration: 'ephemeral' },
            target: { protection: 'encrypted', duration: 'ephemeral' },
          }),
        ).not.toThrow();
      });
    });
  });
});
