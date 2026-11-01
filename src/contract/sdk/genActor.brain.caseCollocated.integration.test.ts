import * as path from 'path';
import { genBrainRepl } from 'rhachet-brains-anthropic';
import { given, then, when } from 'test-fns';

import {
  asBrainReplBounded,
  BRAIN_REPL_BOUND_MS,
} from '@src/.test/infra/asBrainReplBounded';
import { describeBrainLiveOnDemand } from '@src/.test/infra/describeBrainLiveOnDemand';
import type { ActorBrain } from '@src/domain.objects/ActorInmem';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import { ACTOR_ASK_DEFAULT_SCHEMA } from '@src/domain.operations/actor/actorAsk';
import { genActor } from '@src/domain.operations/actor/genActor';
import { genCloneInmem } from '@src/domain.operations/clone.inmem/genCloneInmem';

import { chmodSync, cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { EXAMPLE_REPO_COLLOCATED } from '../../../.test/assets/example.repo/directory';
import { scribeRole } from '../../../.test/assets/example.repo/rhachet-roles-example.collocated/role';

describeBrainLiveOnDemand('genActor.brain.caseCollocated (integration)', () => {
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

    // create scribe actor with a claude haiku brain (rule.require.test-claude-cli-against-haiku)
    // cast: an npm brain package declares its own repl shape, not rhachet's BrainRepl; drop the cast once the package types against rhachet's
    // bounded: a vendor refusal hangs the repl, so each call fails loud past 60s
    const brain: ActorBrain = asBrainReplBounded({
      brain: genBrainRepl({
        slug: 'claude/code/haiku',
      }) as unknown as BrainRepl,
      waitMs: BRAIN_REPL_BOUND_MS,
    });
    const scribe = genCloneInmem({
      actor: genActor({
        roles: [scribeRole],
        brains: [brain],
      }),
    });

    // the solid run makes no brain call, so it runs ungated in
    //   genActor.brain.caseSansCall.integration.test.ts
    when('[t0] scribe.act({ skill: { summarize: { content } } })', () => {
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

    when('[t1] scribe.ask({ prompt })', () => {
      then('starts fluid conversation with default brain', async () => {
        const result = await scribe.ask({
          prompt: 'summarize the concept of brevity',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });

        expect(result).toBeDefined();
        expect(result.output.answer).toBeDefined();
      });
    });
  });
});
