import { given, then, when } from 'test-fns';

import { detectKeyGradeChange } from './detectKeyGradeChange';

describe('detectKeyGradeChange', () => {
  given('[case1] protection changes', () => {
    when('[t0] encrypted → plaintext', () => {
      then('degrades is true', () => {
        const result = detectKeyGradeChange({
          source: { protection: 'encrypted', duration: 'permanent' },
          target: { protection: 'plaintext', duration: 'permanent' },
        });
        expect(result.degrades).toBe(true);
      });

      then('reason mentions protection downgrade', () => {
        const result = detectKeyGradeChange({
          source: { protection: 'encrypted', duration: 'permanent' },
          target: { protection: 'plaintext', duration: 'permanent' },
        });
        expect(result.reason).toContain('protection downgrade');
      });
    });

    when('[t1] plaintext → encrypted', () => {
      then('degrades is false (upgrade ok)', () => {
        const result = detectKeyGradeChange({
          source: { protection: 'plaintext', duration: 'permanent' },
          target: { protection: 'encrypted', duration: 'permanent' },
        });
        expect(result.degrades).toBe(false);
      });
    });

    when('[t2] same protection', () => {
      then('degrades is false', () => {
        const result = detectKeyGradeChange({
          source: { protection: 'encrypted', duration: 'permanent' },
          target: { protection: 'encrypted', duration: 'permanent' },
        });
        expect(result.degrades).toBe(false);
      });
    });
  });

  given('[case2] duration changes', () => {
    when('[t0] transient → ephemeral', () => {
      then('degrades is true', () => {
        const result = detectKeyGradeChange({
          source: { protection: 'encrypted', duration: 'transient' },
          target: { protection: 'encrypted', duration: 'ephemeral' },
        });
        expect(result.degrades).toBe(true);
      });

      then('reason mentions duration downgrade', () => {
        const result = detectKeyGradeChange({
          source: { protection: 'encrypted', duration: 'transient' },
          target: { protection: 'encrypted', duration: 'ephemeral' },
        });
        expect(result.reason).toContain('duration downgrade');
      });
    });

    when('[t1] transient → permanent', () => {
      then('degrades is true', () => {
        const result = detectKeyGradeChange({
          source: { protection: 'encrypted', duration: 'transient' },
          target: { protection: 'encrypted', duration: 'permanent' },
        });
        expect(result.degrades).toBe(true);
      });
    });

    when('[t2] ephemeral → permanent', () => {
      then('degrades is true', () => {
        const result = detectKeyGradeChange({
          source: { protection: 'encrypted', duration: 'ephemeral' },
          target: { protection: 'encrypted', duration: 'permanent' },
        });
        expect(result.degrades).toBe(true);
      });
    });

    when('[t3] permanent → ephemeral', () => {
      then('degrades is false (upgrade ok)', () => {
        const result = detectKeyGradeChange({
          source: { protection: 'encrypted', duration: 'permanent' },
          target: { protection: 'encrypted', duration: 'ephemeral' },
        });
        expect(result.degrades).toBe(false);
      });
    });

    when('[t4] ephemeral → transient', () => {
      then('degrades is false (upgrade ok)', () => {
        const result = detectKeyGradeChange({
          source: { protection: 'encrypted', duration: 'ephemeral' },
          target: { protection: 'encrypted', duration: 'transient' },
        });
        expect(result.degrades).toBe(false);
      });
    });

    when('[t5] permanent → transient', () => {
      then('degrades is false (upgrade ok)', () => {
        const result = detectKeyGradeChange({
          source: { protection: 'encrypted', duration: 'permanent' },
          target: { protection: 'encrypted', duration: 'transient' },
        });
        expect(result.degrades).toBe(false);
      });
    });
  });

  given('[case3] combined changes', () => {
    when('[t0] encrypted+transient → plaintext+permanent', () => {
      then('degrades is true (both degrade)', () => {
        const result = detectKeyGradeChange({
          source: { protection: 'encrypted', duration: 'transient' },
          target: { protection: 'plaintext', duration: 'permanent' },
        });
        expect(result.degrades).toBe(true);
      });
    });

    when('[t1] plaintext+permanent → encrypted+transient', () => {
      then('degrades is false (both upgrade)', () => {
        const result = detectKeyGradeChange({
          source: { protection: 'plaintext', duration: 'permanent' },
          target: { protection: 'encrypted', duration: 'transient' },
        });
        expect(result.degrades).toBe(false);
      });
    });

    when('[t2] encrypted+ephemeral → plaintext+transient', () => {
      then(
        'degrades is true (protection degrades even if duration upgrades)',
        () => {
          const result = detectKeyGradeChange({
            source: { protection: 'encrypted', duration: 'ephemeral' },
            target: { protection: 'plaintext', duration: 'transient' },
          });
          expect(result.degrades).toBe(true);
        },
      );
    });
  });

  given('[case4] no change', () => {
    when('[t0] same grade', () => {
      then('degrades is false', () => {
        const result = detectKeyGradeChange({
          source: { protection: 'encrypted', duration: 'ephemeral' },
          target: { protection: 'encrypted', duration: 'ephemeral' },
        });
        expect(result.degrades).toBe(false);
      });

      then('reason is null', () => {
        const result = detectKeyGradeChange({
          source: { protection: 'encrypted', duration: 'ephemeral' },
          target: { protection: 'encrypted', duration: 'ephemeral' },
        });
        expect(result.reason).toBeNull();
      });
    });
  });
});
