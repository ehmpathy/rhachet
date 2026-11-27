import * as path from 'path';
import { getError, given, then, when } from 'test-fns';

import type { MockedBrainCall } from '@src/.test.assets/asMockedBrainCall';
import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';
import { ACTOR_ASK_DEFAULT_SCHEMA } from '@src/domain.operations/actor/actorAsk';
import { genActor } from '@src/domain.operations/actor/genActor';
import { genCloneInmem } from '@src/domain.operations/clone.inmem/genCloneInmem';

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
      // .note = deliberate global mutation: the actor finds its briefs and skills from the cwd; afterAll restores it
      process.chdir(tmpDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
      rmSync(tmpDir, { recursive: true, force: true });
    });

    // two mocked repls on the allowlist, each records its own calls: the first is the default
    // the second sits under the real haiku ref, so the explicit pick matches a real ref
    // .mock = the brains, injected via genMockedBrainRepl; its docblock holds the .why and the .real
    const callsPrimary: MockedBrainCall[] = [];
    const callsSecondary: MockedBrainCall[] = [];
    const brainPrimary = genMockedBrainRepl({
      repo: 'mock',
      slug: 'mock/primary',
      output: {
        act: { prose: 'drafted prose' },
        ask: { answer: 'turtles glide' },
      },
      onInvoke: (call) => callsPrimary.push(call),
    });
    const brainSecondary = genMockedBrainRepl({
      repo: 'anthropic',
      slug: 'claude/code/haiku',
      output: { act: { prose: 'drafted by the second' } },
      onInvoke: (call) => callsSecondary.push(call),
    });
    const author = genCloneInmem({
      actor: genActor({
        roles: [authorRole],
        brains: [brainPrimary, brainSecondary],
      }),
    });

    // each case reads only the calls it made
    // .note = deliberate mutation: each mock closes over its array, so it is reset in place
    beforeEach(() => {
      callsPrimary.length = 0;
      callsSecondary.length = 0;
    });

    when('[t0] author.run({ skill: { wordcount: { text } } })', () => {
      then(
        'executes solid skill and returns rational word count, no brain called',
        async () => {
          // solid skills execute shell scripts
          const result = await author.run({
            skill: { wordcount: { text: 'hello world' } },
          });

          // assert rational response: "hello world" = 2 words
          expect(result).toEqual({ count: 2 });
          expect(callsPrimary).toHaveLength(0);
          expect(callsSecondary).toHaveLength(0);
        },
      );
    });

    when('[t1] author.act({ skill: { draft: { topic } } })', () => {
      then('executes rigid skill with the default brain', async () => {
        const result = await author.act({
          skill: { draft: { topic: 'surfer turtles' } },
        });

        expect(result.output).toEqual({ prose: 'drafted prose' });
        expect(callsPrimary).toHaveLength(1);
        expect(callsPrimary[0]?.verb).toEqual('act');
        expect(callsPrimary[0]?.prompt).toContain('surfer turtles');
        expect(callsPrimary[0]?.briefs.length).toBeGreaterThan(0);
        expect(callsSecondary).toHaveLength(0);
      });
    });

    when('[t2] author.act({ brain: { repo, slug }, skill })', () => {
      then('executes with the explicit brain from the allowlist', async () => {
        const result = await author.act({
          brain: { repo: 'anthropic', slug: 'claude/code/haiku' },
          skill: { draft: { topic: 'ocean waves' } },
        });

        expect(result.output).toEqual({ prose: 'drafted by the second' });
        expect(callsSecondary).toHaveLength(1);
        expect(callsPrimary).toHaveLength(0);
      });
    });

    when('[t3] author.act({ brain: notInAllowlist, skill })', () => {
      then('throws error, and no brain is called', async () => {
        const error = await getError(() =>
          author.act({
            brain: { repo: 'openai', slug: 'openai/codex' },
            skill: { draft: { topic: 'sunshine' } },
          }),
        );

        expect(error?.message).toMatch(/not.*allowlist/i);
        expect(error?.message).toMatchSnapshot();
        expect(callsPrimary).toHaveLength(0);
        expect(callsSecondary).toHaveLength(0);
      });
    });

    when('[t4] author.ask({ prompt })', () => {
      then('starts fluid conversation with the default brain', async () => {
        const result = await author.ask({
          prompt: 'tell me about the turtles',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });

        expect(result.output.answer).toEqual('turtles glide');
        expect(callsPrimary).toHaveLength(1);
        expect(callsPrimary[0]?.verb).toEqual('ask');
        expect(callsSecondary).toHaveLength(0);
      });
    });
  });
});
