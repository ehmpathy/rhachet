import { given, then, when } from 'test-fns';

import { computeBootMode } from './computeBootMode';

describe('computeBootMode', () => {
  given('[case1] simple mode detection', () => {
    when('[t0] raw has briefs key only', () => {
      const raw = { briefs: { say: ['*.md'] } };

      then('returns simple', () => {
        const result = computeBootMode({ raw });
        expect(result).toEqual('simple');
      });
    });

    when('[t1] raw has skills key only', () => {
      const raw = { skills: { say: ['*.sh'] } };

      then('returns simple', () => {
        const result = computeBootMode({ raw });
        expect(result).toEqual('simple');
      });
    });

    when('[t2] raw has both briefs and skills keys', () => {
      const raw = {
        briefs: { say: ['*.md'] },
        skills: { say: ['*.sh'] },
      };

      then('returns simple', () => {
        const result = computeBootMode({ raw });
        expect(result).toEqual('simple');
      });
    });

    when('[t3] raw has empty briefs object', () => {
      const raw = { briefs: {} };

      then('returns simple', () => {
        const result = computeBootMode({ raw });
        expect(result).toEqual('simple');
      });
    });
  });

  given('[case2] subject mode detection', () => {
    when('[t0] raw has always key only', () => {
      const raw = {
        always: {
          briefs: { say: ['core.md'] },
        },
      };

      then('returns subject', () => {
        const result = computeBootMode({ raw });
        expect(result).toEqual('subject');
      });
    });

    when('[t1] raw has subject.test key only', () => {
      const raw = {
        'subject.test': {
          briefs: { say: ['test/*.md'] },
        },
      };

      then('returns subject', () => {
        const result = computeBootMode({ raw });
        expect(result).toEqual('subject');
      });
    });

    when('[t2] raw has always and multiple subjects', () => {
      const raw = {
        always: { briefs: { say: ['core.md'] } },
        'subject.test': { briefs: { say: ['test/*.md'] } },
        'subject.prod': { briefs: { say: ['prod/*.md'] } },
      };

      then('returns subject', () => {
        const result = computeBootMode({ raw });
        expect(result).toEqual('subject');
      });
    });

    when('[t3] raw has subjects without always', () => {
      const raw = {
        'subject.test': { briefs: { say: ['test/*.md'] } },
      };

      then('returns subject', () => {
        const result = computeBootMode({ raw });
        expect(result).toEqual('subject');
      });
    });
  });

  given('[case3] none mode detection', () => {
    when('[t0] raw is empty object', () => {
      const raw = {};

      then('returns none', () => {
        const result = computeBootMode({ raw });
        expect(result).toEqual('none');
      });
    });

    when('[t1] raw has unrelated keys', () => {
      const raw = { version: '1.0', author: 'test' };

      then('returns none', () => {
        const result = computeBootMode({ raw });
        expect(result).toEqual('none');
      });
    });
  });

  given('[case4] mixed mode detection (error)', () => {
    when('[t0] raw has both briefs and always', () => {
      const raw = {
        briefs: { say: ['*.md'] },
        always: { briefs: { say: ['core.md'] } },
      };

      then('throws BadRequestError', () => {
        expect(() => computeBootMode({ raw })).toThrow(
          'mixed mode not allowed',
        );
      });
    });

    when('[t1] raw has both skills and subject.test', () => {
      const raw = {
        skills: { say: ['*.sh'] },
        'subject.test': { briefs: { say: ['test/*.md'] } },
      };

      then('throws BadRequestError', () => {
        expect(() => computeBootMode({ raw })).toThrow(
          'mixed mode not allowed',
        );
      });
    });

    when('[t2] raw has briefs, skills, always, and subjects', () => {
      const raw = {
        briefs: { say: ['*.md'] },
        skills: { say: ['*.sh'] },
        always: { briefs: { say: ['core.md'] } },
        'subject.test': { briefs: { say: ['test/*.md'] } },
      };

      then('throws BadRequestError', () => {
        expect(() => computeBootMode({ raw })).toThrow(
          'mixed mode not allowed',
        );
      });
    });
  });
});
