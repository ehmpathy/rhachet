import { given, then, when } from 'test-fns';

import { parseRoleBootYaml } from './parseRoleBootYaml';

describe('parseRoleBootYaml', () => {
  given('[case1] valid simple mode yaml', () => {
    when('[t0] briefs.say and skills.say are present', () => {
      const content = `
briefs:
  say:
    - practices/**/*.md
    - glossary.md
  ref:
    - archive/**/*.md

skills:
  say:
    - git.commit/**/*.sh
`;

      then('parses successfully with mode simple', () => {
        const result = parseRoleBootYaml({
          content,
          path: 'boot.yml',
        });
        expect(result).not.toBeNull();
        expect(result?.mode).toEqual('simple');
      });

      then('briefs.say contains the globs', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        if (result?.mode !== 'simple') throw new Error('expected simple');
        expect(result.briefs?.say).toEqual([
          'practices/**/*.md',
          'glossary.md',
        ]);
      });

      then('briefs.ref contains the globs', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        if (result?.mode !== 'simple') throw new Error('expected simple');
        expect(result.briefs?.ref).toEqual(['archive/**/*.md']);
      });

      then('skills.say contains the globs', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        if (result?.mode !== 'simple') throw new Error('expected simple');
        expect(result.skills?.say).toEqual(['git.commit/**/*.sh']);
      });
    });

    when('[t1] only briefs is present', () => {
      const content = `
briefs:
  say:
    - core.md
`;

      then('parses successfully with skills as null', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result).not.toBeNull();
        expect(result?.mode).toEqual('simple');
        if (result?.mode !== 'simple') throw new Error('expected simple');
        expect(result.skills).toBeNull();
      });
    });

    when('[t2] empty briefs object', () => {
      const content = `
briefs: {}
`;

      then('parses successfully with say null (absent) and ref empty', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result).not.toBeNull();
        expect(result?.mode).toEqual('simple');
        if (result?.mode !== 'simple') throw new Error('expected simple');
        // say: null means say key was absent -> say all; handled in computeBootPlan
        expect(result.briefs?.say).toBeNull();
        expect(result.briefs?.ref).toEqual([]);
      });
    });

    when('[t3] briefs with only ref array', () => {
      const content = `
briefs:
  ref:
    - archive.md
`;

      then('parses successfully with say as null (absent)', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result).not.toBeNull();
        if (result?.mode !== 'simple') throw new Error('expected simple');
        // say key absent -> null -> means "say all"
        expect(result.briefs?.say).toBeNull();
        expect(result.briefs?.ref).toEqual(['archive.md']);
      });
    });

    when('[t4] briefs with empty say array', () => {
      const content = `
briefs:
  say: []
`;

      then(
        'parses successfully with say as empty array (means say none)',
        () => {
          const result = parseRoleBootYaml({ content, path: 'boot.yml' });
          expect(result).not.toBeNull();
          if (result?.mode !== 'simple') throw new Error('expected simple');
          // say key present but empty -> [] -> means "say none"
          expect(result.briefs?.say).toEqual([]);
          expect(result.briefs?.ref).toEqual([]);
        },
      );
    });
  });

  given('[case2] valid subject mode yaml', () => {
    when('[t0] always and subjects are present', () => {
      const content = `
always:
  briefs:
    say:
      - core.md
    ref:
      - glossary.md
  skills:
    say:
      - commit.sh

subject.test:
  briefs:
    say:
      - test-rules.md
  skills:
    say:
      - test-runner.sh

subject.prod:
  briefs:
    say:
      - prod-rules.md
`;

      then('parses successfully with mode subject', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result).not.toBeNull();
        expect(result?.mode).toEqual('subject');
      });

      then('always.briefs is parsed correctly', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        if (result?.mode !== 'subject') throw new Error('expected subject');
        expect(result.always?.briefs?.say).toEqual(['core.md']);
        expect(result.always?.briefs?.ref).toEqual(['glossary.md']);
      });

      then('always.skills is parsed correctly', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        if (result?.mode !== 'subject') throw new Error('expected subject');
        expect(result.always?.skills?.say).toEqual(['commit.sh']);
      });

      then('subjects are parsed correctly', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        if (result?.mode !== 'subject') throw new Error('expected subject');
        expect(result.subjects.test?.briefs?.say).toEqual(['test-rules.md']);
        expect(result.subjects.test?.skills?.say).toEqual(['test-runner.sh']);
        expect(result.subjects.prod?.briefs?.say).toEqual(['prod-rules.md']);
      });
    });

    when('[t1] only subjects without always', () => {
      const content = `
subject.test:
  briefs:
    say:
      - test.md
`;

      then('parses successfully with always as null', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result).not.toBeNull();
        expect(result?.mode).toEqual('subject');
        if (result?.mode !== 'subject') throw new Error('expected subject');
        expect(result.always).toBeNull();
        expect(result.subjects.test?.briefs?.say).toEqual(['test.md']);
      });
    });

    when('[t2] only always without subjects', () => {
      const content = `
always:
  briefs:
    say:
      - core.md
`;

      then('parses successfully with empty subjects', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result).not.toBeNull();
        expect(result?.mode).toEqual('subject');
        if (result?.mode !== 'subject') throw new Error('expected subject');
        expect(result.always?.briefs?.say).toEqual(['core.md']);
        expect(Object.keys(result.subjects)).toEqual([]);
      });
    });
  });

  given('[case3] null or empty content', () => {
    when('[t0] content is empty string', () => {
      then('returns null', () => {
        const result = parseRoleBootYaml({ content: '', path: 'boot.yml' });
        expect(result).toBeNull();
      });
    });

    when('[t1] content is null yaml', () => {
      then('returns null', () => {
        const result = parseRoleBootYaml({
          content: 'null',
          path: 'boot.yml',
        });
        expect(result).toBeNull();
      });
    });

    when('[t2] content is whitespace only', () => {
      then('returns null', () => {
        const result = parseRoleBootYaml({
          content: '   \n   ',
          path: 'boot.yml',
        });
        expect(result).toBeNull();
      });
    });
  });

  given('[case4] invalid yaml syntax', () => {
    when('[t0] content has invalid yaml', () => {
      const content = `
briefs:
  say:
    - valid
  this is not valid yaml
`;

      then('throws BadRequestError', () => {
        expect(() => parseRoleBootYaml({ content, path: 'boot.yml' })).toThrow(
          'boot.yml has invalid yaml',
        );
      });
    });
  });

  given('[case5] invalid schema', () => {
    when('[t0] briefs.say is not an array', () => {
      const content = `
briefs:
  say: not-an-array
`;

      then('throws BadRequestError', () => {
        expect(() => parseRoleBootYaml({ content, path: 'boot.yml' })).toThrow(
          'boot.yml has invalid schema',
        );
      });
    });

    when('[t1] subject value is not an object', () => {
      const content = `
subject.test: not-an-object
`;

      then('throws BadRequestError', () => {
        expect(() => parseRoleBootYaml({ content, path: 'boot.yml' })).toThrow(
          'boot.yml has invalid schema',
        );
      });
    });
  });

  given('[case6] mixed mode detection', () => {
    when('[t0] has both briefs and always', () => {
      const content = `
briefs:
  say:
    - core.md

always:
  briefs:
    say:
      - core.md
`;

      then('throws BadRequestError for mixed mode', () => {
        expect(() => parseRoleBootYaml({ content, path: 'boot.yml' })).toThrow(
          'mixed mode not allowed',
        );
      });
    });

    when('[t1] has both skills and subject.test', () => {
      const content = `
skills:
  say:
    - test.sh

subject.test:
  briefs:
    say:
      - test.md
`;

      then('throws BadRequestError for mixed mode', () => {
        expect(() => parseRoleBootYaml({ content, path: 'boot.yml' })).toThrow(
          'mixed mode not allowed',
        );
      });
    });
  });

  given('[case7] none mode detection', () => {
    when('[t0] content has unrelated keys only', () => {
      const content = `
version: 1.0
author: test
`;

      then('returns null (none mode)', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result).toBeNull();
      });
    });
  });
});
