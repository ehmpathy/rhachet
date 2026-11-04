import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import type { MockedBrainCall } from '@src/.test.assets/asMockedBrainCall';
import { genMockedBrainAtom } from '@src/.test.assets/genMockedBrainAtom';
import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';

import { EXAMPLE_REPO_WITH_RIGID_SKILL } from '../../../.test/assets/example.repo/directory';
import { testerRole } from '../../../.test/assets/example.repo/repo-with-role-with-rigid-skill/role';
import { ACTOR_ASK_DEFAULT_SCHEMA, actorAsk } from './actorAsk';

// .mock = the brain, injected via genMockedBrainRepl; its docblock holds the .why and the .real
describe('actorAsk (integration)', () => {
  // use test asset directory
  const testAssetDir = EXAMPLE_REPO_WITH_RIGID_SKILL;
  const originalCwd = process.cwd();

  beforeAll(() => {
    // switch to test asset directory for getRoleBriefs resolution
    // .note = deliberate global mutation: getRoleBriefs reads the cwd; afterAll restores it
    process.chdir(testAssetDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
  });

  given(
    '[case1] the tester role, and a mocked repl brain that records each call',
    () => {
      when('[t0] actorAsk is called with a prompt', () => {
        const run = useBeforeAll(async () => {
          const calls: MockedBrainCall[] = [];
          const brain = genMockedBrainRepl({
            output: { ask: { answer: 'hello from the brain' } },
            onInvoke: (call) => calls.push(call),
          });
          const result = await actorAsk({
            role: testerRole,
            brain,
            prompt: 'say hello',
            schema: ACTOR_ASK_DEFAULT_SCHEMA,
          });
          return { calls, result };
        });

        then('the brain is asked once, with the prompt', () => {
          expect(run.calls).toHaveLength(1);
          expect(run.calls[0]?.verb).toEqual('ask');
          expect(run.calls[0]?.prompt).toEqual('say hello');
        });

        then("the brain receives the role's briefs", () => {
          expect(run.calls[0]?.briefs.length).toBeGreaterThan(0);
          expect(
            run.calls[0]?.briefs.every((uri) => uri.includes('role=tester')),
          ).toBe(true);
        });

        then(
          'the answer the brain returned flows back on result.output',
          () => {
            expect(run.result.output.answer).toEqual('hello from the brain');
          },
        );

        then('the whole envelope the caller receives is snapped', () => {
          // .note = the metrics are the mock's constants (genMockedBrainOutputMetrics); the hashes are content hashes
          expect(run.result).toMatchSnapshot();
        });
      });

      when(
        '[t1] actorAsk is called with a prompt that wants a terse answer',
        () => {
          then('the terse answer flows back', async () => {
            const brain = genMockedBrainRepl({
              output: { ask: { answer: 'ok' } },
            });
            const result = await actorAsk({
              role: testerRole,
              brain,
              prompt: 'respond with just the word: ok',
              schema: ACTOR_ASK_DEFAULT_SCHEMA,
            });
            expect(result.output.answer.length).toBeGreaterThan(0);
            expect(result.output.answer).toEqual('ok');
          });
        },
      );
    },
  );

  given(
    '[case2] a mocked repl told to fill an output the schema refuses',
    () => {
      when('[t0] actorAsk is called with the default schema', () => {
        then(
          'the call rejects at parse, and names the absent key',
          async () => {
            const brain = genMockedBrainRepl({
              output: { ask: { verdict: 'ok' } },
            });
            const error = await getError(
              actorAsk({
                role: testerRole,
                brain,
                prompt: 'say hello',
                schema: ACTOR_ASK_DEFAULT_SCHEMA,
              }),
            );
            expect(error.message).toContain('answer');
            expect(error.message).toMatchSnapshot();
          },
        );
      });
    },
  );

  given(
    '[case3] a mocked repl told an output for act, but none for ask',
    () => {
      when('[t0] actorAsk is called', () => {
        then(
          'the call rejects loud, and names the verb the mock was not told',
          async () => {
            const brain = genMockedBrainRepl({
              output: { act: { summary: 'brief' } },
            });
            const error = await getError(
              actorAsk({
                role: testerRole,
                brain,
                prompt: 'say hello',
                schema: ACTOR_ASK_DEFAULT_SCHEMA,
              }),
            );
            expect(error).toBeInstanceOf(ConstraintError);
            expect(error.message).toContain("none for 'ask'");
            expect(error.message).toMatchSnapshot();
          },
        );
      });
    },
  );

  given('[case4] a mocked atom told an empty output, so none for ask', () => {
    when('[t0] actorAsk is called', () => {
      then(
        'the call rejects loud, and names the verb the atom was not told',
        async () => {
          const brain = genMockedBrainAtom({ output: {} });
          const error = await getError(
            actorAsk({
              role: testerRole,
              brain,
              prompt: 'say hello',
              schema: ACTOR_ASK_DEFAULT_SCHEMA,
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain(
            "genMockedBrainAtom was told an empty output, so none for 'ask'",
          );
          expect(error.message).toMatchSnapshot();
        },
      );
    });
  });
});
