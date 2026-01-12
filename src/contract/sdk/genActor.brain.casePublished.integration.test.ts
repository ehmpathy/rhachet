import * as path from 'path';
import { genBrainRepl } from 'rhachet-brains-openai';
import { getError, given, then, when } from 'test-fns';

import { ACTOR_ASK_DEFAULT_SCHEMA } from '@src/domain.operations/actor/actorAsk';
import { genActor } from '@src/domain.operations/actor/genActor';

import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { EXAMPLE_REPO_PUBLISHED } from '../../../.test/assets/example.repo/directory';
import { authorRole } from '../../../.test/assets/example.repo/rhachet-roles-example.published/role';

describe('genActor.brain.casePublished (integration)', () => {
  given('[case1] published pattern (rhachet-roles-example.published)', () => {
    // setup: use temp dir within project (avoids codex trust issues)
    const tmpDir = path.resolve(__dirname, './.temp/casePublished');
    const originalCwd = process.cwd();

    beforeAll(() => {
      // clean and recreate temp directory
      rmSync(tmpDir, { recursive: true, force: true });
      mkdirSync(tmpDir, { recursive: true });

      // copy fixture to temp directory
      cpSync(EXAMPLE_REPO_PUBLISHED, tmpDir, { recursive: true });

      // create .agent/ symlink structure (simulates `rhachet roles link`)
      const agentDir = path.join(tmpDir, '.agent/repo=.this/role=author');
      mkdirSync(agentDir, { recursive: true });

      // copy skills to .agent location (instead of symlink, for test simplicity)
      const skillsSrc = path.join(tmpDir, 'src/domain.roles/author/skills');
      const skillsDest = path.join(agentDir, 'skills');
      cpSync(skillsSrc, skillsDest, { recursive: true });

      // ensure shell scripts are executable
      const wordcountPath = path.join(skillsDest, 'solid/wordcount.sh');
      if (existsSync(wordcountPath)) {
        chmodSync(wordcountPath, '755');
      }

      // create draft.sh executable for rigid skill
      const draftShPath = path.join(skillsDest, 'draft.sh');
      writeFileSync(
        draftShPath,
        `#!/usr/bin/env bash
# rigid skill: draft
# echoes the input for testing purposes
echo '{"content":"drafted content about $1"}'
`,
      );
      chmodSync(draftShPath, '755');

      // copy briefs to .agent location
      const briefsSrc = path.join(tmpDir, 'src/domain.roles/author/briefs');
      const briefsDest = path.join(agentDir, 'briefs');
      cpSync(briefsSrc, briefsDest, { recursive: true });

      // switch to temp directory
      process.chdir(tmpDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
      rmSync(tmpDir, { recursive: true, force: true });
    });

    // create author actor with openai brain
    const brain = genBrainRepl({ slug: 'openai/codex' });
    const author = genActor({
      role: authorRole,
      brains: [brain],
    });

    when('[t0] author.run({ skill: { wordcount: { text } } })', () => {
      then('executes solid skill and returns rational word count', async () => {
        // solid skills execute shell scripts
        const result = await author.run({
          skill: { wordcount: { text: 'hello world' } },
        });

        // assert rational response: "hello world" = 2 words
        expect(result).toEqual({ count: 2 });
      });
    });

    when('[t1] author.act({ skill: { draft: { topic } } })', () => {
      then('executes rigid skill with default brain', async () => {
        const result = await author.act({
          skill: { draft: { topic: 'surfer turtles' } },
        });

        // brain.act returns structured result
        expect(result).toBeDefined();
      });
    });

    when('[t2] author.act({ brain: { repo, slug }, skill })', () => {
      then('executes with explicit brain from allowlist', async () => {
        const result = await author.act({
          brain: { repo: 'openai', slug: 'codex' },
          skill: { draft: { topic: 'ocean waves' } },
        });

        expect(result).toBeDefined();
      });
    });

    when('[t3] author.act({ brain: notInAllowlist, skill })', () => {
      then('throws error', async () => {
        const error = await getError(() =>
          author.act({
            brain: { repo: 'anthropic', slug: 'claude/code' },
            skill: { draft: { topic: 'sunshine' } },
          }),
        );

        expect(error).toBeDefined();
        expect(error?.message).toMatch(/not.*allowlist/i);
      });
    });

    when('[t4] author.ask({ prompt })', () => {
      then('starts fluid conversation with default brain', async () => {
        const result = await author.ask({
          prompt: 'tell me about the turtles',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });

        expect(result).toBeDefined();
        expect(result.answer).toBeDefined();
      });
    });
  });
});
