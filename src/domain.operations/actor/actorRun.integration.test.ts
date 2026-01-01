import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { Role } from '@src/domain.objects/Role';

import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { actorRun } from './actorRun';
import { findActorRoleSkillBySlug } from './findActorRoleSkillBySlug';

describe('actorRun (integration)', () => {
  const testDir = resolve(__dirname, './.temp/actorRun');
  const originalCwd = process.cwd();

  beforeAll(() => {
    // create test directory and switch to it
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);

    // create .agent structure with a solid skill
    const skillsDir = resolve(testDir, '.agent/repo=.this/role=tester/skills');
    mkdirSync(skillsDir, { recursive: true });

    // create a simple echo skill
    const skillPath = resolve(skillsDir, 'echo.sh');
    writeFileSync(
      skillPath,
      `#!/usr/bin/env bash
echo "received: $@"
`,
    );
    chmodSync(skillPath, '755');

    // create a wordcount skill
    const wordcountPath = resolve(skillsDir, 'wordcount.sh');
    writeFileSync(
      wordcountPath,
      `#!/usr/bin/env bash
text="$2"
count=$(echo "$text" | wc -w | tr -d ' ')
echo "{\\"count\\": $count}"
`,
    );
    chmodSync(wordcountPath, '755');
  });

  afterAll(() => {
    process.chdir(originalCwd);
    rmSync(testDir, { recursive: true, force: true });
  });

  // create test role with schemas for skills
  const testRole = new Role({
    slug: 'tester',
    name: 'Tester',
    purpose: 'test role for integration tests',
    readme: 'a role for testing actorRun',
    traits: [],
    skills: {
      solid: {
        echo: {
          input: z.object({ message: z.string() }),
          output: z.object({ received: z.string() }),
        },
        wordcount: {
          input: z.object({ text: z.string() }),
          output: z.object({ count: z.number() }),
        },
      },
      dirs: { uri: '.agent/repo=.this/role=tester/skills' },
      refs: [],
    },
    briefs: { dirs: { uri: '.agent/repo=.this/role=tester/briefs' } },
  });

  given(
    'a solid skill with schema in role.skills and executable in .agent/',
    () => {
      when('actorRun is called with pre-resolved skill', () => {
        then('executes the skill via spawn', async () => {
          // resolve skill first (as genActor would)
          const skill = findActorRoleSkillBySlug({
            slug: 'echo',
            role: testRole,
            route: 'solid',
          });

          // actorRun just executes
          await expect(
            actorRun({
              skill,
              args: { message: 'hello world' },
            }),
          ).resolves.not.toThrow();
        });
      });
    },
  );

  given('a typed solid skill in role.skills', () => {
    when('actorRun is called with resolved skill', () => {
      then('executes without error', async () => {
        // resolve skill first
        const skill = findActorRoleSkillBySlug({
          slug: 'wordcount',
          role: testRole,
          route: 'solid',
        });

        // execute - skill outputs to stdout via executeSkill's inherited stdio
        // note: executeSkill uses stdio: 'inherit', so output goes to console
        await expect(
          actorRun({
            skill,
            args: { text: 'hello world foo bar' },
          }),
        ).resolves.not.toThrow();
      });
    });
  });
});
