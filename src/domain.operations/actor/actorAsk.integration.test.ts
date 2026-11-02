import { genBrainRepl } from 'rhachet-brains-anthropic';
import { given, then, when } from 'test-fns';

import { RUN_LIVE_API_TEST } from '@src/.test/RUN_LIVE_API_TEST';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';

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
  // note: external brains from npm packages don't have spec yet; cast for compatibility
  // haiku: a real repl brain the test key reaches (rule.require.test-claude-cli-against-haiku)
  const brain = genBrainRepl({
    slug: 'claude/code/haiku',
  }) as unknown as BrainRepl;

  given.runIf(RUN_LIVE_API_TEST)('[case1] a valid role and brain', () => {
    when('[t0] actorAsk is called with a prompt', () => {
      then('returns a response from the brain', async () => {
        const result = await actorAsk({
          role: testerRole,
          brain,
          prompt: 'say hello',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });

        // brain.ask returns response wrapped in BrainOutput
        expect(result).toBeDefined();
        expect(result.output.answer).toBeDefined();
        expect(typeof result.output.answer).toEqual('string');
      });
    });
  });

  given.runIf(RUN_LIVE_API_TEST)('[case2] a simple prompt', () => {
    when('[t0] actorAsk is invoked', () => {
      then('brain processes the prompt and returns response', async () => {
        const result = await actorAsk({
          role: testerRole,
          brain,
          prompt: 'respond with just the word: ok',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });

        expect(result.output.answer).toBeDefined();
        expect(result.output.answer.length).toBeGreaterThan(0);
      });
    });
  });
});
