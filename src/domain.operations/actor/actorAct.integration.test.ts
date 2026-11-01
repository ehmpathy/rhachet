import { genBrainRepl } from 'rhachet-brains-anthropic';
import { given, then, when } from 'test-fns';

import {
  asBrainReplBounded,
  BRAIN_REPL_BOUND_MS,
} from '@src/.test/infra/asBrainReplBounded';
import { describeBrainLiveOnDemand } from '@src/.test/infra/describeBrainLiveOnDemand';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';

import { EXAMPLE_REPO_WITH_RIGID_SKILL } from '../../../.test/assets/example.repo/directory';
import { testerRole } from '../../../.test/assets/example.repo/repo-with-role-with-rigid-skill/role';
import { actorAct } from './actorAct';
import { findActorRoleSkillBySlug } from './findActorRoleSkillBySlug';

describeBrainLiveOnDemand('actorAct (integration)', () => {
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
  // cast: an npm brain package declares its own repl shape, not rhachet's BrainRepl; drop the cast once the package types against rhachet's
  // haiku: a real repl brain the test key reaches (rule.require.test-claude-cli-against-haiku)
  // bounded: a vendor refusal hangs the repl, so each call fails loud past 60s
  const brain = asBrainReplBounded({
    brain: genBrainRepl({
      slug: 'claude/code/haiku',
    }) as unknown as BrainRepl,
    waitMs: BRAIN_REPL_BOUND_MS,
  });

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
