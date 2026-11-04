import * as path from 'path';
import { given, then, when } from 'test-fns';
import { z } from 'zod';

import type { MockedBrainCall } from '@src/.test.assets/asMockedBrainCall';
import { genMockedBrainAtom } from '@src/.test.assets/genMockedBrainAtom';
import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';
import { Role } from '@src/domain.objects/Role';
import { ACTOR_ASK_DEFAULT_SCHEMA } from '@src/domain.operations/actor/actorAsk';
import { genActor } from '@src/domain.operations/actor/genActor';
import { genCloneInmem } from '@src/domain.operations/clone.inmem/genCloneInmem';

import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

/**
 * .what = integration test for actor.ask() with BrainAtom support
 * .why = demonstrates that both BrainAtom and BrainRepl work with actor.ask()
 */
describe('genActor.brain.caseAskable (integration)', () => {
  given('[case1] author role with mixed brain allowlist', () => {
    // setup: use temp dir within project
    const tmpDir = path.resolve(__dirname, './.temp/caseAskable');
    const originalCwd = process.cwd();

    beforeAll(() => {
      // clean and recreate temp directory
      rmSync(tmpDir, { recursive: true, force: true });
      mkdirSync(tmpDir, { recursive: true });

      // create .agent/ structure
      const agentDir = path.join(tmpDir, '.agent/repo=.this/role=author');
      const skillsDir = path.join(agentDir, 'skills');
      const briefsDir = path.join(agentDir, 'briefs');
      mkdirSync(skillsDir, { recursive: true });
      mkdirSync(briefsDir, { recursive: true });

      // create wordcount.sh for solid skill
      const wordcountPath = path.join(skillsDir, 'wordcount.sh');
      writeFileSync(
        wordcountPath,
        `#!/usr/bin/env bash
# solid skill: wordcount
# counts words in input text
echo '{"count":5}'
`,
      );
      chmodSync(wordcountPath, '755');

      // create a brief about prose style
      writeFileSync(
        path.join(briefsDir, 'prose-style.brief.md'),
        `# Prose Guidelines

You are a creative author who specializes in evocative, nature-inspired prose.
`,
      );

      // switch to temp directory
      // .note = deliberate global mutation: the actor finds its briefs and skills from the cwd; afterAll restores it
      process.chdir(tmpDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
      rmSync(tmpDir, { recursive: true, force: true });
    });

    // create author role with typed skills
    const authorRole = Role.typed({
      slug: 'author',
      name: 'Author',
      purpose: 'writes creative prose',
      readme: { uri: '.agent/repo=.this/role=author/readme.md' },
      traits: [],
      skills: {
        solid: {
          wordcount: {
            input: z.object({ text: z.string() }),
            output: z.object({ count: z.number() }),
          },
        },
        dirs: { uri: '.agent/repo=.this/role=author/skills' },
        refs: [],
      },
      briefs: { dirs: { uri: '.agent/repo=.this/role=author/briefs' } },
    });

    // create brains: a mocked BrainAtom and a mocked BrainRepl, each records its own calls
    // .mock = the brains, injected via genMockedBrainAtom / genMockedBrainRepl; their docblocks hold the .why and the .real
    const callsAtom: MockedBrainCall[] = [];
    const callsRepl: MockedBrainCall[] = [];
    const brainAtom = genMockedBrainAtom({
      output: { ask: { answer: 'sun on the swell, a turtle rides it in' } },
      onInvoke: (call) => callsAtom.push(call),
    });
    const brainRepl = genMockedBrainRepl({
      output: { ask: { answer: 'the sea breathes' } },
      onInvoke: (call) => callsRepl.push(call),
    });

    // create actor with mixed brains (BrainAtom first)
    const author = genCloneInmem({
      actor: genActor({
        roles: [authorRole],
        brains: [brainAtom, brainRepl],
      }),
    });

    // each case reads only the calls it made
    // .note = deliberate mutation: each mock closes over its array, so it is reset in place
    beforeEach(() => {
      callsAtom.length = 0;
      callsRepl.length = 0;
    });

    when('[t0] author.ask() is called with BrainAtom as the default', () => {
      then(
        'the atom answers, handed the role brief and the prompt',
        async () => {
          const result = await author.ask({
            prompt:
              'write a short prose paragraph about sunshine, ocean, surfer, and turtles',
            schema: ACTOR_ASK_DEFAULT_SCHEMA,
          });

          expect(result.output.answer).toEqual(
            'sun on the swell, a turtle rides it in',
          );
          expect(callsAtom).toHaveLength(1);
          expect(callsAtom[0]?.prompt).toContain('turtles');
          expect(
            callsAtom[0]?.briefs.some((uri) =>
              uri.endsWith('prose-style.brief.md'),
            ),
          ).toBe(true);
          expect(callsRepl).toHaveLength(0);

          // the whole envelope an sdk caller of actor.ask receives, from an atom
          // .note = the metrics are the mock's constants (genMockedBrainOutputMetrics); the hashes are content hashes
          expect(result).toMatchSnapshot();
        },
      );
    });

    when('[t1] author.ask() is called with BrainRepl as the default', () => {
      then('the repl answers (BrainRepl supports .ask())', async () => {
        // create actor with BrainRepl as default
        const authorWithRepl = genCloneInmem({
          actor: genActor({
            roles: [authorRole],
            brains: [brainRepl],
          }),
        });

        const result = await authorWithRepl.ask({
          prompt: 'write one sentence about the sea',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });

        expect(result.output.answer).toEqual('the sea breathes');
        expect(callsRepl).toHaveLength(1);
        expect(callsRepl[0]?.verb).toEqual('ask');
        expect(callsAtom).toHaveLength(0);

        // the whole envelope an sdk caller of actor.ask receives, from a repl
        // .note = the metrics are the mock's constants (genMockedBrainOutputMetrics); the hashes are content hashes
        expect(result).toMatchSnapshot();
      });
    });

    when('[t2] author.run() is called (solid skill, no brain needed)', () => {
      then('executes wordcount skill without brain', async () => {
        const result = await author.run({
          skill: { wordcount: { text: 'hello world of turtles' } },
        });

        expect(result).toEqual({ count: 5 });
        expect(callsAtom).toHaveLength(0);
        expect(callsRepl).toHaveLength(0);
      });
    });
  });
});
