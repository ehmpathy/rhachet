import { given, then, when } from 'test-fns';

import {
  RoleBootSpecSimplified,
  RoleBootSpecSubjected,
  schemaResourceCuration,
  schemaRoleBootSpecSimplified,
  schemaRoleBootSpecSubjected,
  schemaSubjectSection,
} from './RoleBootSpec';

describe('RoleBootSpec', () => {
  given('[case1] schemaResourceCuration', () => {
    when('[t0] valid curation with say and ref arrays', () => {
      const input = {
        say: ['practices/**/*.md'],
        ref: ['glossary.md'],
      };

      then('parses successfully', () => {
        const result = schemaResourceCuration.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.say).toEqual(['practices/**/*.md']);
          expect(result.data.ref).toEqual(['glossary.md']);
        }
      });
    });

    when('[t1] valid curation with only say', () => {
      const input = { say: ['core.md'] };

      then('parses successfully', () => {
        const result = schemaResourceCuration.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.say).toEqual(['core.md']);
          expect(result.data.ref).toBeUndefined();
        }
      });
    });

    when('[t2] valid curation with empty object', () => {
      const input = {};

      then('parses successfully', () => {
        const result = schemaResourceCuration.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    when('[t3] invalid curation with non-array say', () => {
      const input = { say: 'not-an-array' };

      then('fails validation', () => {
        const result = schemaResourceCuration.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  given('[case2] schemaRoleBootSpecSimplified (simple mode)', () => {
    when('[t0] valid simple mode with briefs and skills', () => {
      const input = {
        briefs: { say: ['practices/**/*.md'] },
        skills: { say: ['git.commit/**/*.sh'] },
      };

      then('parses successfully', () => {
        const result = schemaRoleBootSpecSimplified.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.briefs?.say).toEqual(['practices/**/*.md']);
          expect(result.data.skills?.say).toEqual(['git.commit/**/*.sh']);
        }
      });
    });

    when('[t1] valid simple mode with only briefs', () => {
      const input = {
        briefs: { say: ['core.md'] },
      };

      then('parses successfully', () => {
        const result = schemaRoleBootSpecSimplified.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.briefs?.say).toEqual(['core.md']);
          expect(result.data.skills).toBeUndefined();
        }
      });
    });

    when('[t2] valid simple mode with empty object', () => {
      const input = {};

      then('parses successfully', () => {
        const result = schemaRoleBootSpecSimplified.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    when('[t3] valid simple mode with briefs.say empty array', () => {
      const input = {
        briefs: { say: [] },
      };

      then('parses successfully', () => {
        const result = schemaRoleBootSpecSimplified.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.briefs?.say).toEqual([]);
        }
      });
    });

    when('[t4] invalid simple mode with wrong type', () => {
      const input = {
        briefs: 'not-an-object',
      };

      then('fails validation', () => {
        const result = schemaRoleBootSpecSimplified.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  given('[case3] schemaSubjectSection', () => {
    when('[t0] valid subject section with briefs and skills', () => {
      const input = {
        briefs: { say: ['test-rules.md'], ref: ['glossary.md'] },
        skills: { say: ['test-runner.sh'] },
      };

      then('parses successfully', () => {
        const result = schemaSubjectSection.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    when('[t1] valid subject section with empty object', () => {
      const input = {};

      then('parses successfully', () => {
        const result = schemaSubjectSection.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
  });

  given('[case4] schemaRoleBootSpecSubjected (subject mode)', () => {
    when('[t0] valid subject mode with always and subjects', () => {
      const input = {
        always: {
          briefs: { say: ['core.md'] },
          skills: { say: ['commit.sh'] },
        },
        'subject.test': {
          briefs: { say: ['test-rules.md'] },
          skills: { say: ['test-runner.sh'] },
        },
        'subject.prod': {
          briefs: { say: ['prod-rules.md'] },
          skills: { say: ['deploy.sh'] },
        },
      };

      then('parses successfully', () => {
        const result = schemaRoleBootSpecSubjected.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.always?.briefs?.say).toEqual(['core.md']);
          expect(result.data['subject.test']?.briefs?.say).toEqual([
            'test-rules.md',
          ]);
          expect(result.data['subject.prod']?.skills?.say).toEqual([
            'deploy.sh',
          ]);
        }
      });
    });

    when('[t1] valid subject mode with only always', () => {
      const input = {
        always: {
          briefs: { say: ['core.md'] },
        },
      };

      then('parses successfully', () => {
        const result = schemaRoleBootSpecSubjected.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    when('[t2] valid subject mode with only subjects (no always)', () => {
      const input = {
        'subject.test': {
          briefs: { say: ['test-rules.md'] },
        },
      };

      then('parses successfully', () => {
        const result = schemaRoleBootSpecSubjected.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.always).toBeUndefined();
          expect(result.data['subject.test']?.briefs?.say).toEqual([
            'test-rules.md',
          ]);
        }
      });
    });

    when('[t3] valid subject mode with ref lists', () => {
      const input = {
        always: {
          briefs: { say: ['core.md'], ref: ['glossary.md'] },
          skills: { ref: ['lint.sh'] },
        },
      };

      then('parses successfully', () => {
        const result = schemaRoleBootSpecSubjected.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.always?.briefs?.ref).toEqual(['glossary.md']);
          expect(result.data.always?.skills?.ref).toEqual(['lint.sh']);
        }
      });
    });

    when('[t4] invalid subject mode with wrong subject section type', () => {
      const input = {
        always: {
          briefs: { say: ['core.md'] },
        },
        'subject.test': 'not-an-object',
      };

      then('fails validation', () => {
        const result = schemaRoleBootSpecSubjected.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  given('[case5] RoleBootSpecSimplified class', () => {
    when('[t0] instance is created', () => {
      const spec = new RoleBootSpecSimplified({
        mode: 'simple',
        briefs: { say: ['core.md'], ref: ['glossary.md'] },
        skills: null,
      });

      then('mode is simple', () => {
        expect(spec.mode).toEqual('simple');
      });

      then('briefs are accessible', () => {
        expect(spec.briefs?.say).toEqual(['core.md']);
        expect(spec.briefs?.ref).toEqual(['glossary.md']);
      });

      then('skills is null', () => {
        expect(spec.skills).toBeNull();
      });
    });
  });

  given('[case6] RoleBootSpecSubjected class', () => {
    when('[t0] instance is created', () => {
      const spec = new RoleBootSpecSubjected({
        mode: 'subject',
        always: {
          briefs: { say: ['core.md'], ref: [] },
          skills: null,
        },
        subjects: {
          test: {
            briefs: { say: ['test-rules.md'], ref: [] },
            skills: { say: ['test-runner.sh'], ref: [] },
          },
        },
      });

      then('mode is subject', () => {
        expect(spec.mode).toEqual('subject');
      });

      then('always is accessible', () => {
        expect(spec.always?.briefs?.say).toEqual(['core.md']);
      });

      then('subjects are accessible', () => {
        expect(spec.subjects.test?.briefs?.say).toEqual(['test-rules.md']);
        expect(spec.subjects.test?.skills?.say).toEqual(['test-runner.sh']);
      });
    });

    when('[t1] instance with null always', () => {
      const spec = new RoleBootSpecSubjected({
        mode: 'subject',
        always: null,
        subjects: {
          test: {
            briefs: { say: ['test-rules.md'], ref: [] },
            skills: null,
          },
        },
      });

      then('always is null', () => {
        expect(spec.always).toBeNull();
      });

      then('subjects are accessible', () => {
        expect(spec.subjects.test?.briefs?.say).toEqual(['test-rules.md']);
      });
    });
  });
});
