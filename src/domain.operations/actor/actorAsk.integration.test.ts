import { given, then, when } from 'test-fns';

import { genBrainRepl } from '@src/_topublish/rhachet-brain-openai/src/repls/genBrainRepl';

import { EXAMPLE_REPO_WITH_RIGID_SKILL } from '../../../.test/assets/example.repo/directory';
import { testerRole } from '../../../.test/assets/example.repo/repo-with-role-with-rigid-skill/role';
import { actorAsk } from './actorAsk';

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
        });

        // brain.ask returns response
        expect(result).toBeDefined();
        expect(result.response).toBeDefined();
        expect(typeof result.response).toEqual('string');
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
        });

        expect(result.response).toBeDefined();
        expect(result.response.length).toBeGreaterThan(0);
      });
    });
  });
});
