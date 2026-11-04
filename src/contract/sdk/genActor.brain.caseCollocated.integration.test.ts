import * as path from 'path';
import { given, then, when } from 'test-fns';

import type { MockedBrainCall } from '@src/.test.assets/asMockedBrainCall';
import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';
import { ACTOR_ASK_DEFAULT_SCHEMA } from '@src/domain.operations/actor/actorAsk';
import { genActor } from '@src/domain.operations/actor/genActor';
import { genCloneInmem } from '@src/domain.operations/clone.inmem/genCloneInmem';

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
      // .note = deliberate global mutation: the actor finds its briefs and skills from the cwd; afterAll restores it
      process.chdir(tmpDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
      rmSync(tmpDir, { recursive: true, force: true });
    });

    // create scribe actor with a mocked repl brain that records each call
    // .mock = the brain, injected via genMockedBrainRepl; its docblock holds the .why and the .real
    const calls: MockedBrainCall[] = [];
    const brain = genMockedBrainRepl({
      output: {
        act: { summary: 'brief' },
        ask: { answer: 'say less' },
      },
      onInvoke: (call) => calls.push(call),
    });
    const scribe = genCloneInmem({
      actor: genActor({
        roles: [scribeRole],
        brains: [brain],
      }),
    });

    // each case reads only the calls it made
    // .note = deliberate mutation: the mock closes over this array, so it is reset in place
    beforeEach(() => {
      calls.length = 0;
    });

    when('[t0] scribe.run({ skill: { linecount: { text } } })', () => {
      then(
        'executes solid skill and returns rational line count, no brain called',
        async () => {
          // solid skills execute shell scripts (use simple text to avoid shell newline issues)
          const result = await scribe.run({
            skill: { linecount: { text: 'hello world' } },
          });

          // assert rational response: single-line text = 1 line
          expect(result).toEqual({ lines: 1 });
          expect(calls).toHaveLength(0);
        },
      );
    });

    when('[t1] scribe.act({ skill: { summarize: { content } } })', () => {
      then(
        'executes rigid skill with default brain, handed the role brief',
        async () => {
          const result = await scribe.act({
            skill: {
              summarize: { content: 'a long verbose text about many things' },
            },
          });

          expect(result.output).toEqual({ summary: 'brief' });
          expect(calls).toHaveLength(1);
          expect(calls[0]?.verb).toEqual('act');
          expect(calls[0]?.prompt).toContain('summarize');
          expect(
            calls[0]?.briefs.some((uri) => uri.endsWith('.brief.md')),
          ).toBe(true);
        },
      );
    });

    when('[t2] scribe.ask({ prompt })', () => {
      then('starts fluid conversation with default brain', async () => {
        const result = await scribe.ask({
          prompt: 'summarize the concept of brevity',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });

        expect(result.output.answer).toEqual('say less');
        expect(calls).toHaveLength(1);
        expect(calls[0]?.verb).toEqual('ask');
        expect(calls[0]?.prompt).toEqual('summarize the concept of brevity');
      });
    });
  });
});
