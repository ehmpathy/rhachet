import { BadRequestError } from 'helpful-errors';
import * as path from 'path';
import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { genBrainRepl as genBrainReplOpenAI } from '@src/_topublish/rhachet-brain-openai/src/repls/genBrainRepl';
import { genBrainAtom as genBrainAtomXAI } from '@src/_topublish/rhachet-brain-xai/src/atoms/genBrainAtom';
import { Role } from '@src/domain.objects/Role';
import { ACTOR_ASK_DEFAULT_SCHEMA } from '@src/domain.operations/actor/actorAsk';
import { genActor } from '@src/domain.operations/actor/genActor';

import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

// fail fast if api keys not available
if (!process.env.XAI_API_KEY)
  throw new BadRequestError('XAI_API_KEY is required for integration tests');
if (!process.env.OPENAI_API_KEY)
  throw new BadRequestError('OPENAI_API_KEY is required for integration tests');

/**
 * .what = integration test for actor.ask() with BrainAtom support
 * .why = demonstrates that both BrainAtom and BrainRepl work with actor.ask()
 */
describe('genActor.brain.caseAskable (integration)', () => {
  jest.setTimeout(60000);

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

      // create writing brief about prose style
      writeFileSync(
        path.join(briefsDir, 'prose-style.brief.md'),
        `# Prose Writing Guidelines

You are a creative writer who specializes in evocative, nature-inspired prose.

When writing about ocean themes:
- Use vivid sensory details
- Incorporate movement and rhythm
- Evoke feelings of peace and wonder
`,
      );

      // switch to temp directory
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

    // create brains: BrainAtom (xAI) and BrainRepl (OpenAI)
    const brainAtom = genBrainAtomXAI({ slug: 'xai/grok-3-mini' });
    const brainRepl = genBrainReplOpenAI({ slug: 'openai/codex' });

    // create actor with mixed brains (BrainAtom first)
    const author = genActor({
      role: authorRole,
      brains: [brainAtom, brainRepl],
    });

    when('[t0] author.ask() is called with BrainAtom', () => {
      then(
        'returns creative prose about sunshine ocean surfer turtles',
        async () => {
          const result = await author.ask({
            prompt:
              'write a short prose paragraph (2-3 sentences) about sunshine, ocean, surfer, and turtles',
            schema: ACTOR_ASK_DEFAULT_SCHEMA,
          });

          expect(result).toBeDefined();
          expect(result.answer).toBeDefined();
          expect(result.answer.length).toBeGreaterThan(50);

          // verify content contains expected themes (case-insensitive)
          const response = result.answer.toLowerCase();
          expect(
            response.includes('sun') ||
              response.includes('ocean') ||
              response.includes('surf') ||
              response.includes('turtle'),
          ).toBe(true);
        },
      );
    });

    when('[t1] author.ask() is called with BrainRepl', () => {
      then(
        'also returns prose response (BrainRepl supports .ask())',
        async () => {
          // create actor with BrainRepl as default
          const authorWithRepl = genActor({
            role: authorRole,
            brains: [brainRepl],
          });

          const result = await authorWithRepl.ask({
            prompt: 'write one sentence about the sea',
            schema: ACTOR_ASK_DEFAULT_SCHEMA,
          });

          expect(result).toBeDefined();
          expect(result.answer).toBeDefined();
          expect(result.answer.length).toBeGreaterThan(10);
        },
      );
    });

    when('[t2] author.run() is called (solid skill, no brain needed)', () => {
      then('executes wordcount skill without brain', async () => {
        const result = await author.run({
          skill: { wordcount: { text: 'hello world of turtles' } },
        });

        expect(result).toEqual({ count: 5 });
      });
    });
  });
});
