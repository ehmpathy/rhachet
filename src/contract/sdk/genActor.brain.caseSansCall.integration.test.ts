import * as path from 'path';
import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

import type { ActorBrain } from '@src/domain.objects/ActorInmem';
import { Role } from '@src/domain.objects/Role';
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
import {
  EXAMPLE_REPO_COLLOCATED,
  EXAMPLE_REPO_PUBLISHED,
} from '../../../.test/assets/example.repo/directory';
import { scribeRole } from '../../../.test/assets/example.repo/rhachet-roles-example.collocated/role';
import { authorRole } from '../../../.test/assets/example.repo/rhachet-roles-example.published/role';

/**
 * .what = the genActor cases that make no brain call: a solid skill run, and the allowlist refusal
 * .why = they run on every push. their live peers (casePublished, caseCollocated, caseAskable)
 *   sit behind the tier-3 gate, since each of those calls a live brain
 * .note = the brain here is a plain shape that no case calls: `run` executes a shell skill, and
 *   the allowlist refusal throws before any brain is reached. it carries the identity the live
 *   peer's allowlist held (anthropic, claude/code/haiku), so the refusal is tested against the
 *   same allowlist as before the split
 */
const brainStub = {
  repo: 'anthropic',
  slug: 'claude/code/haiku',
  description: 'a brain shape no case here calls',
  ask: async () => ({ content: '' }),
  act: async () => ({ result: '' }),
} as unknown as ActorBrain; // cast: a plain shape stands in for a supplier brain no case calls

describe('genActor.brain.caseSansCall (integration)', () => {
  given('[case1] published pattern (rhachet-roles-example.published)', () => {
    const tmpDir = path.resolve(__dirname, './.temp/caseSansCallPublished');
    const originalCwd = process.cwd();

    beforeAll(() => {
      // copy the fixture, and lay its skills where `rhachet roles link` would
      rmSync(tmpDir, { recursive: true, force: true });
      mkdirSync(tmpDir, { recursive: true });
      cpSync(EXAMPLE_REPO_PUBLISHED, tmpDir, { recursive: true });
      const agentDir = path.join(tmpDir, '.agent/repo=.this/role=author');
      mkdirSync(agentDir, { recursive: true });
      const skillsDest = path.join(agentDir, 'skills');
      cpSync(path.join(tmpDir, 'src/domain.roles/author/skills'), skillsDest, {
        recursive: true,
      });
      const wordcountPath = path.join(skillsDest, 'solid/wordcount.sh');
      if (existsSync(wordcountPath)) chmodSync(wordcountPath, '755');
      cpSync(
        path.join(tmpDir, 'src/domain.roles/author/briefs'),
        path.join(agentDir, 'briefs'),
        { recursive: true },
      );
      process.chdir(tmpDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
      rmSync(tmpDir, { recursive: true, force: true });
    });

    const author = genCloneInmem({
      actor: genActor({ roles: [authorRole], brains: [brainStub] }),
    });

    when('[t0] author.run({ skill: { wordcount: { text } } })', () => {
      then('executes solid skill and returns rational word count', async () => {
        const result = await author.run({
          skill: { wordcount: { text: 'hello world' } },
        });
        expect(result).toEqual({ count: 2 });
      });
    });

    when('[t1] author.act({ brain: notInAllowlist, skill })', () => {
      then('throws an error that names the allowlist', async () => {
        const error = await getError(() =>
          author.act({
            brain: { repo: 'openai', slug: 'openai/codex' },
            skill: { draft: { topic: 'sunshine' } },
          }),
        );
        expect(error?.message).toMatch(/not.*allowlist/i);
      });
    });
  });

  given('[case2] collocated pattern (rhachet-roles-example.collocated)', () => {
    const tmpDir = path.resolve(__dirname, './.temp/caseSansCallCollocated');
    const originalCwd = process.cwd();

    beforeAll(() => {
      // copy the fixture, and write its solid skill under .agent/
      rmSync(tmpDir, { recursive: true, force: true });
      mkdirSync(tmpDir, { recursive: true });
      cpSync(EXAMPLE_REPO_COLLOCATED, tmpDir, { recursive: true });
      const skillsDir = path.join(
        tmpDir,
        '.agent/repo=.this/role=scribe/skills',
      );
      mkdirSync(skillsDir, { recursive: true });
      mkdirSync(path.join(tmpDir, '.agent/repo=.this/role=scribe/briefs'), {
        recursive: true,
      });
      const linecountPath = path.join(skillsDir, 'linecount.sh');
      writeFileSync(
        linecountPath,
        `#!/usr/bin/env bash
# solid skill: linecount
echo '{"lines":1}'
`,
      );
      chmodSync(linecountPath, '755');
      process.chdir(tmpDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
      rmSync(tmpDir, { recursive: true, force: true });
    });

    const scribe = genCloneInmem({
      actor: genActor({ roles: [scribeRole], brains: [brainStub] }),
    });

    when('[t0] scribe.run({ skill: { linecount: { text } } })', () => {
      then('executes solid skill and returns rational line count', async () => {
        const result = await scribe.run({
          skill: { linecount: { text: 'hello world' } },
        });
        expect(result).toEqual({ lines: 1 });
      });
    });
  });

  given('[case3] a typed role with a solid skill (the askable fixture)', () => {
    const tmpDir = path.resolve(__dirname, './.temp/caseSansCallAskable');
    const originalCwd = process.cwd();

    beforeAll(() => {
      // write the solid skill under .agent/
      rmSync(tmpDir, { recursive: true, force: true });
      const skillsDir = path.join(
        tmpDir,
        '.agent/repo=.this/role=author/skills',
      );
      mkdirSync(skillsDir, { recursive: true });
      mkdirSync(path.join(tmpDir, '.agent/repo=.this/role=author/briefs'), {
        recursive: true,
      });
      const wordcountPath = path.join(skillsDir, 'wordcount.sh');
      writeFileSync(
        wordcountPath,
        `#!/usr/bin/env bash
# solid skill: wordcount
echo '{"count":5}'
`,
      );
      chmodSync(wordcountPath, '755');
      process.chdir(tmpDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
      rmSync(tmpDir, { recursive: true, force: true });
    });

    const authorTyped = Role.typed({
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
    const author = genCloneInmem({
      actor: genActor({ roles: [authorTyped], brains: [brainStub] }),
    });

    when('[t0] author.run() is called (solid skill, no brain needed)', () => {
      then('executes wordcount skill without brain', async () => {
        const result = await author.run({
          skill: { wordcount: { text: 'hello world of turtles' } },
        });
        expect(result).toEqual({ count: 5 });
      });
    });
  });
});
