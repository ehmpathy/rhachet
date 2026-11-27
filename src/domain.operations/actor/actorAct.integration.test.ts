import { getError, given, then, useBeforeAll, when } from 'test-fns';

import type { MockedBrainCall } from '@src/.test.assets/asMockedBrainCall';
import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';

import { EXAMPLE_REPO_WITH_RIGID_SKILL } from '../../../.test/assets/example.repo/directory';
import { testerRole } from '../../../.test/assets/example.repo/repo-with-role-with-rigid-skill/role';
import { actorAct } from './actorAct';
import { findActorRoleSkillBySlug } from './findActorRoleSkillBySlug';

// .mock = the brain, injected via genMockedBrainRepl; its docblock holds the .why and the .real
describe('actorAct (integration)', () => {
  // use test asset directory
  const testAssetDir = EXAMPLE_REPO_WITH_RIGID_SKILL;
  const originalCwd = process.cwd();

  beforeAll(() => {
    // switch to test asset directory for getRoleBriefs lookup
    // .note = deliberate global mutation: getRoleBriefs reads the cwd; afterAll restores it
    process.chdir(testAssetDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
  });

  given(
    '[case1] a rigid skill in role.skills.rigid, and a mocked repl brain',
    () => {
      when('[t0] actorAct is called with a skill found in advance', () => {
        const run = useBeforeAll(async () => {
          const calls: MockedBrainCall[] = [];
          const brain = genMockedBrainRepl({
            output: { act: { echoed: 'hello world', reviewed: true } },
            onInvoke: (call) => calls.push(call),
          });

          // find the skill first (as genActor would)
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
          return { calls, result };
        });

        then('the brain is asked to act once', () => {
          expect(run.calls).toHaveLength(1);
          expect(run.calls[0]?.verb).toEqual('act');
        });

        then('the prompt names the skill and its args', () => {
          expect(run.calls[0]?.prompt).toContain('echo.review');
          expect(run.calls[0]?.prompt).toContain('"content":"hello world"');
        });

        then("the brain receives the role's briefs", () => {
          expect(run.calls[0]?.briefs.length).toBeGreaterThan(0);
        });

        then("the output, parsed by the skill's schema, flows back", () => {
          expect(run.result.output).toEqual({
            echoed: 'hello world',
            reviewed: true,
          });
        });

        then('the whole envelope the caller receives is snapped', () => {
          // .note = the metrics are the mock's constants (genMockedBrainOutputMetrics); the hashes are content hashes
          expect(run.result).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case2] a mocked repl told to fill { summary }, and a skill whose schema wants { echoed, reviewed }',
    () => {
      when('[t0] actorAct is called with that skill', () => {
        then(
          'the call rejects at parse, and names the absent key',
          async () => {
            const brain = genMockedBrainRepl({
              output: { act: { summary: 'brief' } },
            });
            const skill = findActorRoleSkillBySlug({
              slug: 'echo.review',
              role: testerRole,
              route: 'rigid',
            });
            const error = await getError(
              actorAct({
                role: testerRole,
                brain,
                skill,
                args: { content: 'hello world' },
              }),
            );
            expect(error.message).toContain('echoed');
            expect(error.message).toMatchSnapshot();
          },
        );
      });
    },
  );
});
