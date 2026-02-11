import { given, then, when } from 'test-fns';

import {
  RoleBootSpecSimplified,
  RoleBootSpecSubjected,
} from '@src/domain.objects/RoleBootSpec';
import type { RoleBriefRef } from '@src/domain.operations/role/briefs/getRoleBriefRefs';

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { computeBootPlan } from './computeBootPlan';

describe('computeBootPlan', () => {
  // create a temp directory with test files for each suite
  const tempDir = join(tmpdir(), 'computeBootPlan-test');

  beforeAll(() => {
    // create temp directory structure
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true });
    mkdirSync(tempDir, { recursive: true });
    mkdirSync(join(tempDir, 'briefs'), { recursive: true });
    mkdirSync(join(tempDir, 'briefs', 'practices'), { recursive: true });
    mkdirSync(join(tempDir, 'skills'), { recursive: true });

    // create test files
    writeFileSync(join(tempDir, 'briefs', 'core.md'), 'core');
    writeFileSync(join(tempDir, 'briefs', 'glossary.md'), 'glossary');
    writeFileSync(join(tempDir, 'briefs', 'practices', 'rule1.md'), 'rule1');
    writeFileSync(join(tempDir, 'briefs', 'practices', 'rule2.md'), 'rule2');
    writeFileSync(join(tempDir, 'skills', 'commit.sh'), 'commit');
    writeFileSync(join(tempDir, 'skills', 'lint.sh'), 'lint');
  });

  afterAll(() => {
    // cleanup temp directory
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true });
  });

  // helper to get brief refs (no minified variants in this test)
  const getBriefRefs = (): RoleBriefRef[] => [
    {
      pathToOriginal: resolve(tempDir, 'briefs', 'core.md'),
      pathToMinified: null,
    },
    {
      pathToOriginal: resolve(tempDir, 'briefs', 'glossary.md'),
      pathToMinified: null,
    },
    {
      pathToOriginal: resolve(tempDir, 'briefs', 'practices', 'rule1.md'),
      pathToMinified: null,
    },
    {
      pathToOriginal: resolve(tempDir, 'briefs', 'practices', 'rule2.md'),
      pathToMinified: null,
    },
  ];

  const getSkillPaths = () => [
    resolve(tempDir, 'skills', 'commit.sh'),
    resolve(tempDir, 'skills', 'lint.sh'),
  ];

  given('[case1] no config (backwards compat)', () => {
    when('[t0] config is null', () => {
      then('all briefs and skills are said', async () => {
        const result = await computeBootPlan({
          config: null,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
        });

        expect(result.briefs.say).toHaveLength(4);
        expect(result.briefs.ref).toHaveLength(0);
        expect(result.skills.say).toHaveLength(2);
        expect(result.skills.ref).toHaveLength(0);
      });
    });
  });

  given('[case2] simple mode: briefs key absent', () => {
    when('[t0] briefs is null (key absent)', () => {
      then('all briefs are said', async () => {
        const config = new RoleBootSpecSimplified({
          mode: 'simple',
          briefs: null,
          skills: null,
        });

        const result = await computeBootPlan({
          config,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
        });

        expect(result.briefs.say).toHaveLength(4);
        expect(result.briefs.ref).toHaveLength(0);
      });
    });
  });

  given('[case3] simple mode: briefs.say is null (absent)', () => {
    when('[t0] briefs object present but say key absent', () => {
      then('all briefs are said', async () => {
        const config = new RoleBootSpecSimplified({
          mode: 'simple',
          briefs: { say: null, ref: [] },
          skills: null,
        });

        const result = await computeBootPlan({
          config,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
        });

        expect(result.briefs.say).toHaveLength(4);
        expect(result.briefs.ref).toHaveLength(0);
      });
    });

    when('[t1] briefs.say absent but ref globs present', () => {
      then('all briefs except ref-matched are said', async () => {
        const config = new RoleBootSpecSimplified({
          mode: 'simple',
          briefs: { say: null, ref: ['briefs/glossary.md'] },
          skills: null,
        });

        const result = await computeBootPlan({
          config,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
        });

        // glossary.md should be ref, rest should be say
        expect(result.briefs.say).toHaveLength(3);
        expect(result.briefs.ref).toHaveLength(1);
        expect(result.briefs.ref[0]!.pathToOriginal).toContain('glossary.md');
      });
    });
  });

  given('[case4] simple mode: briefs.say is empty []', () => {
    when('[t0] briefs.say is empty array', () => {
      then('all briefs become ref (say none)', async () => {
        const config = new RoleBootSpecSimplified({
          mode: 'simple',
          briefs: { say: [], ref: [] },
          skills: null,
        });

        const result = await computeBootPlan({
          config,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
        });

        expect(result.briefs.say).toHaveLength(0);
        expect(result.briefs.ref).toHaveLength(4);
      });
    });
  });

  given('[case5] simple mode: briefs.say has globs', () => {
    when('[t0] say globs match some briefs', () => {
      then('matched briefs are said, unmatched are ref', async () => {
        const config = new RoleBootSpecSimplified({
          mode: 'simple',
          briefs: {
            say: ['briefs/core.md', 'briefs/practices/**/*.md'],
            ref: [],
          },
          skills: null,
        });

        const result = await computeBootPlan({
          config,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
        });

        // core.md + rule1.md + rule2.md = 3 said
        // glossary.md = 1 ref
        expect(result.briefs.say).toHaveLength(3);
        expect(result.briefs.ref).toHaveLength(1);
        expect(result.briefs.ref[0]!.pathToOriginal).toContain('glossary.md');
      });
    });

    when('[t1] say globs match all briefs', () => {
      then('all briefs are said, none ref', async () => {
        const config = new RoleBootSpecSimplified({
          mode: 'simple',
          briefs: { say: ['briefs/**/*.md'], ref: [] },
          skills: null,
        });

        const result = await computeBootPlan({
          config,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
        });

        expect(result.briefs.say).toHaveLength(4);
        expect(result.briefs.ref).toHaveLength(0);
      });
    });

    when('[t2] say globs match no briefs', () => {
      then('all briefs become ref', async () => {
        const config = new RoleBootSpecSimplified({
          mode: 'simple',
          briefs: { say: ['nonexistent/**/*.md'], ref: [] },
          skills: null,
        });

        const result = await computeBootPlan({
          config,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
        });

        expect(result.briefs.say).toHaveLength(0);
        expect(result.briefs.ref).toHaveLength(4);
      });
    });
  });

  given('[case6] simple mode: skills curation', () => {
    when('[t0] skills.say has globs', () => {
      then('matched skills are said, unmatched are ref', async () => {
        const config = new RoleBootSpecSimplified({
          mode: 'simple',
          briefs: null,
          skills: { say: ['skills/commit.sh'], ref: [] },
        });

        const result = await computeBootPlan({
          config,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
        });

        // all briefs said (briefs null)
        expect(result.briefs.say).toHaveLength(4);
        // only commit.sh said, lint.sh ref
        expect(result.skills.say).toHaveLength(1);
        expect(result.skills.ref).toHaveLength(1);
        expect(result.skills.say[0]).toContain('commit.sh');
        expect(result.skills.ref[0]).toContain('lint.sh');
      });
    });
  });

  given('[case7] simple mode: both briefs and skills curated', () => {
    when('[t0] both have say globs', () => {
      then('both are curated independently', async () => {
        const config = new RoleBootSpecSimplified({
          mode: 'simple',
          briefs: { say: ['briefs/core.md'], ref: [] },
          skills: { say: ['skills/lint.sh'], ref: [] },
        });

        const result = await computeBootPlan({
          config,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
        });

        // only core.md said
        expect(result.briefs.say).toHaveLength(1);
        expect(result.briefs.say[0]!.pathToOriginal).toContain('core.md');
        expect(result.briefs.ref).toHaveLength(3);

        // only lint.sh said
        expect(result.skills.say).toHaveLength(1);
        expect(result.skills.say[0]).toContain('lint.sh');
        expect(result.skills.ref).toHaveLength(1);
      });
    });
  });

  given('[case8] subject mode: empty config', () => {
    when('[t0] config has empty always and subjects', () => {
      then('all resources appear in also section', async () => {
        const config = new RoleBootSpecSubjected({
          mode: 'subject',
          always: null,
          subjects: {},
        });

        const result = await computeBootPlan({
          config,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
        });

        // no say or ref, all in also
        expect(result.briefs.say).toHaveLength(0);
        expect(result.briefs.ref).toHaveLength(0);
        expect(result.skills.say).toHaveLength(0);
        expect(result.skills.ref).toHaveLength(0);
        expect(result.also.briefs).toHaveLength(4);
        expect(result.also.skills).toHaveLength(2);
      });
    });
  });

  given('[case9] subject mode: always section only', () => {
    when('[t0] always.briefs.say has globs', () => {
      then('matched briefs are said, rest in also', async () => {
        const config = new RoleBootSpecSubjected({
          mode: 'subject',
          always: {
            briefs: { say: ['briefs/core.md'], ref: [] },
            skills: null,
          },
          subjects: {},
        });

        const result = await computeBootPlan({
          config,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
        });

        // core.md said, rest in also
        expect(result.briefs.say).toHaveLength(1);
        expect(result.briefs.say[0]!.pathToOriginal).toContain('core.md');
        expect(result.briefs.ref).toHaveLength(0);
        expect(result.also.briefs).toHaveLength(3);
        expect(result.also.skills).toHaveLength(2);
      });
    });

    when('[t1] always.briefs.ref has globs', () => {
      then('matched briefs are ref, rest in also', async () => {
        const config = new RoleBootSpecSubjected({
          mode: 'subject',
          always: {
            briefs: { say: null, ref: ['briefs/glossary.md'] },
            skills: null,
          },
          subjects: {},
        });

        const result = await computeBootPlan({
          config,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
        });

        // glossary.md is ref, rest in also
        expect(result.briefs.ref).toHaveLength(1);
        expect(result.briefs.ref[0]!.pathToOriginal).toContain('glossary.md');
      });
    });
  });

  given('[case10] subject mode: single subject', () => {
    when('[t0] subject.test.briefs.say has globs', () => {
      then('matched briefs are said, rest in also (all subjects)', async () => {
        const config = new RoleBootSpecSubjected({
          mode: 'subject',
          always: null,
          subjects: {
            test: {
              briefs: { say: ['briefs/practices/**/*.md'], ref: [] },
              skills: null,
            },
          },
        });

        const result = await computeBootPlan({
          config,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
        });

        // rule1.md and rule2.md said
        expect(result.briefs.say).toHaveLength(2);
        expect(result.briefs.ref).toHaveLength(0);
        // core.md and glossary.md in also
        expect(result.also.briefs).toHaveLength(2);
        expect(result.also.skills).toHaveLength(2);
      });
    });

    when('[t1] specific usecase selected', () => {
      then('only that subject is booted, no also section', async () => {
        const config = new RoleBootSpecSubjected({
          mode: 'subject',
          always: null,
          subjects: {
            test: {
              briefs: { say: ['briefs/practices/**/*.md'], ref: [] },
              skills: null,
            },
            prod: {
              briefs: { say: ['briefs/core.md'], ref: [] },
              skills: null,
            },
          },
        });

        const result = await computeBootPlan({
          config,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
          subjects: ['test'],
        });

        // only test subject: rule1.md and rule2.md said
        expect(result.briefs.say).toHaveLength(2);
        expect(result.briefs.ref).toHaveLength(0);
        // no also section when specific subjects
        expect(result.also.briefs).toHaveLength(0);
        expect(result.also.skills).toHaveLength(0);
      });
    });
  });

  given('[case11] subject mode: always + subjects', () => {
    when('[t0] both always and subject have say globs', () => {
      then('always first, then subject, dedupe via ref', async () => {
        const config = new RoleBootSpecSubjected({
          mode: 'subject',
          always: {
            briefs: { say: ['briefs/core.md'], ref: [] },
            skills: null,
          },
          subjects: {
            test: {
              briefs: {
                say: ['briefs/core.md', 'briefs/practices/**/*.md'],
                ref: [],
              },
              skills: null,
            },
          },
        });

        const result = await computeBootPlan({
          config,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
        });

        // core.md said from always, rule1.md and rule2.md from test
        expect(result.briefs.say).toHaveLength(3);
        // core.md appears as ref (dedupe from subject.test)
        expect(result.briefs.ref).toHaveLength(1);
        expect(result.briefs.ref[0]!.pathToOriginal).toContain('core.md');
        // glossary.md in also
        expect(result.also.briefs).toHaveLength(1);
      });
    });
  });

  given('[case12] subject mode: overlap between subjects', () => {
    when('[t0] same brief in multiple subjects', () => {
      then('first subject says, subsequent become ref', async () => {
        const config = new RoleBootSpecSubjected({
          mode: 'subject',
          always: null,
          subjects: {
            test: {
              briefs: { say: ['briefs/core.md'], ref: [] },
              skills: null,
            },
            prod: {
              briefs: {
                say: ['briefs/core.md', 'briefs/glossary.md'],
                ref: [],
              },
              skills: null,
            },
          },
        });

        const result = await computeBootPlan({
          config,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
        });

        // core.md said from test, glossary.md from prod
        expect(result.briefs.say).toHaveLength(2);
        // core.md appears as ref (dedupe from prod)
        expect(result.briefs.ref).toHaveLength(1);
        expect(result.briefs.ref[0]!.pathToOriginal).toContain('core.md');
      });
    });
  });

  given('[case13] subject mode: say wins over ref', () => {
    when('[t0] same brief in always.ref and subject.say', () => {
      then('subject.say wins, brief is said', async () => {
        const config = new RoleBootSpecSubjected({
          mode: 'subject',
          always: {
            briefs: { say: null, ref: ['briefs/core.md'] },
            skills: null,
          },
          subjects: {
            test: {
              briefs: { say: ['briefs/core.md'], ref: [] },
              skills: null,
            },
          },
        });

        const result = await computeBootPlan({
          config,
          briefRefs: getBriefRefs(),
          skillPaths: getSkillPaths(),
          cwd: tempDir,
        });

        // core.md: ref from always, then say from test
        // say should add it to say (since not yet in saidBriefs)
        expect(result.briefs.say).toHaveLength(1);
        expect(result.briefs.say[0]!.pathToOriginal).toContain('core.md');
      });
    });
  });

  given('[case14] subject mode: unknown subject in --subject', () => {
    when('[t0] --subject specifies non-existent subject', () => {
      then('throws error', async () => {
        const config = new RoleBootSpecSubjected({
          mode: 'subject',
          always: null,
          subjects: {
            test: {
              briefs: { say: ['briefs/core.md'], ref: [] },
              skills: null,
            },
          },
        });

        await expect(
          computeBootPlan({
            config,
            briefRefs: getBriefRefs(),
            skillPaths: getSkillPaths(),
            cwd: tempDir,
            subjects: ['unknown'],
          }),
        ).rejects.toThrow('subject not found: unknown');
      });
    });
  });
});
