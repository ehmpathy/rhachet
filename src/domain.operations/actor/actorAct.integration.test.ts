import { genBrainRepl } from 'rhachet-brains-openai';
import { given, then, when } from 'test-fns';

import type { BrainRepl } from '@src/domain.objects/BrainRepl';

import { EXAMPLE_REPO_WITH_RIGID_SKILL } from '../../../.test/assets/example.repo/directory';
import { testerRole } from '../../../.test/assets/example.repo/repo-with-role-with-rigid-skill/role';
import { actorAct } from './actorAct';
import { findActorRoleSkillBySlug } from './findActorRoleSkillBySlug';

describe('actorAct (integration)', () => {
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
  const brain = genBrainRepl({ slug: 'openai/codex' }) as unknown as BrainRepl;

  given('[case1] a rigid skill in role.skills.rigid', () => {
    when('[t0] actorAct is called with pre-resolved skill', () => {
      then('executes the skill with the brain', async () => {
        // resolve skill first (as genActor would)
        const skill = findActorRoleSkillBySlug({
          slug: 'echo.review',
          role: testerRole,
          route: 'rigid',
        });

        const result = await actorAct({
          role: testerRole,
          brain,
          skill,
          args: { content: 'hello world' },
        });

        // brain.act returns structured result
        expect(result).toBeDefined();
        expect(typeof result).toEqual('object');
      });
    });
  });
});
