import { genBrainRepl } from 'rhachet-brains-openai';
import { given, then, when } from 'test-fns';

import { EXAMPLE_REPO_WITH_RIGID_SKILL } from '../../../.test/assets/example.repo/directory';
import { testerRole } from '../../../.test/assets/example.repo/repo-with-role-with-rigid-skill/role';
import { ACTOR_ASK_DEFAULT_SCHEMA, actorAsk } from './actorAsk';

describe('actorAsk (integration)', () => {
  // use test asset directory
  const testAssetDir = EXAMPLE_REPO_WITH_RIGID_SKILL;
  const originalCwd = process.cwd();

  beforeAll(() => {
    // switch to test asset directory for getRoleBriefs resolution
    process.chdir(testAssetDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
  });

  // create real brain via genBrainRepl
  const brain = genBrainRepl({ slug: 'openai/codex' });

  given('[case1] a valid role and brain', () => {
    when('[t0] actorAsk is called with a prompt', () => {
      then('returns a response from the brain', async () => {
        const result = await actorAsk({
          role: testerRole,
          brain,
          prompt: 'say hello',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });

        // brain.ask returns response
        expect(result).toBeDefined();
        expect(result.answer).toBeDefined();
        expect(typeof result.answer).toEqual('string');
      });
    });
  });

  given('[case2] a simple prompt', () => {
    when('[t0] actorAsk is invoked', () => {
      then('brain processes the prompt and returns response', async () => {
        const result = await actorAsk({
          role: testerRole,
          brain,
          prompt: 'respond with just the word: ok',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });

        expect(result.answer).toBeDefined();
        expect(result.answer.length).toBeGreaterThan(0);
      });
    });
  });
});
