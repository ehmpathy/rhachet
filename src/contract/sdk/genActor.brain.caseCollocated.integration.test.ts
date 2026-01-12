import * as path from 'path';
import { genBrainRepl } from 'rhachet-brains-openai';
import { given, then, when } from 'test-fns';

import { ACTOR_ASK_DEFAULT_SCHEMA } from '@src/domain.operations/actor/actorAsk';
import { genActor } from '@src/domain.operations/actor/genActor';

import { chmodSync, cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { EXAMPLE_REPO_COLLOCATED } from '../../../.test/assets/example.repo/directory';
import { scribeRole } from '../../../.test/assets/example.repo/rhachet-roles-example.collocated/role';

describe('genActor.brain.caseCollocated (integration)', () => {
  given('[case1] collocated pattern (rhachet-roles-example.collocated)', () => {
    // setup: use temp dir within project (avoids codex trust issues)
    const tmpDir = path.resolve(__dirname, './.temp/caseCollocated');
    const originalCwd = process.cwd();

    beforeAll(() => {
      // clean and recreate temp directory
      rmSync(tmpDir, { recursive: true, force: true });
      mkdirSync(tmpDir, { recursive: true });

      // copy fixture to temp directory
      cpSync(EXAMPLE_REPO_COLLOCATED, tmpDir, { recursive: true });

      // create .agent/ structure (collocated fixtures don't have pre-existing .agent/)
      const agentDir = path.join(tmpDir, '.agent/repo=.this/role=scribe');
      const skillsDir = path.join(agentDir, 'skills');
      const briefsDir = path.join(agentDir, 'briefs');
      mkdirSync(skillsDir, { recursive: true });
      mkdirSync(briefsDir, { recursive: true });

      // create linecount.sh for solid skill
      const linecountPath = path.join(skillsDir, 'linecount.sh');
      writeFileSync(
        linecountPath,
        `#!/usr/bin/env bash
# solid skill: linecount
# counts lines in input text (returns 1 for single-line input)
echo '{"lines":1}'
`,
      );
      chmodSync(linecountPath, '755');

      // create summarize.sh for rigid skill
      const summarizePath = path.join(skillsDir, 'summarize.sh');
      writeFileSync(
        summarizePath,
        `#!/usr/bin/env bash
# rigid skill: summarize
# echoes the input for testing purposes
echo '{"summary":"summarized content"}'
`,
      );
      chmodSync(summarizePath, '755');

      // create a basic brief
      writeFileSync(
        path.join(briefsDir, 'writing.brief.md'),
        '# Writing Guidelines\n\nWrite clearly and concisely.\n',
      );

      // switch to temp directory
      process.chdir(tmpDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
      rmSync(tmpDir, { recursive: true, force: true });
    });

    // create scribe actor with openai brain
    const brain = genBrainRepl({ slug: 'openai/codex' });
    const scribe = genActor({
      role: scribeRole,
      brains: [brain],
    });

    when('[t0] scribe.run({ skill: { linecount: { text } } })', () => {
      then('executes solid skill and returns rational line count', async () => {
        // solid skills execute shell scripts (use simple text to avoid shell newline issues)
        const result = await scribe.run({
          skill: { linecount: { text: 'hello world' } },
        });

        // assert rational response: single-line text = 1 line
        expect(result).toEqual({ lines: 1 });
      });
    });

    when('[t1] scribe.act({ skill: { summarize: { content } } })', () => {
      then('executes rigid skill with default brain', async () => {
        const result = await scribe.act({
          skill: {
            summarize: { content: 'a long verbose text about many things' },
          },
        });

        // brain.act returns structured result
        expect(result).toBeDefined();
      });
    });

    when('[t2] scribe.ask({ prompt })', () => {
      then('starts fluid conversation with default brain', async () => {
        const result = await scribe.ask({
          prompt: 'summarize the concept of brevity',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });

        expect(result).toBeDefined();
        expect(result.answer).toBeDefined();
      });
    });
  });
});
