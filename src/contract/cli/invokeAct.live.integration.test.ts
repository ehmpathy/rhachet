import { Command } from 'commander';
import { genBrainRepl as genBrainReplAnthropic } from 'rhachet-brains-anthropic';
import { genBrainRepl as genBrainReplOpenAI } from 'rhachet-brains-openai';
import { getError, then, when } from 'test-fns';

import { genMockContextConfigOfUsage } from '@src/.test/genMockContextConfigOfUsage';
import {
  asBrainReplBounded,
  BRAIN_REPL_BOUND_MS,
} from '@src/.test/infra/asBrainReplBounded';
import { describeBrainLiveOnDemand } from '@src/.test/infra/describeBrainLiveOnDemand';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';

import { EXAMPLE_REPO_WITH_RIGID_SKILL } from '../../../.test/assets/example.repo/directory';
import { testerRole } from '../../../.test/assets/example.repo/repo-with-role-with-rigid-skill/role';
import { invokeAct } from './invokeAct';

// the whole file is tier 3: each case calls a live brain (see describeBrainLiveOnDemand)
describeBrainLiveOnDemand(
  'given: a CLI program with invokeAct registered (happy path with real brain)',
  () => {
    const testAssetDir = EXAMPLE_REPO_WITH_RIGID_SKILL;
    const originalCwd = process.cwd();

    beforeAll(() => {
      // switch to test asset directory for skill discovery
      process.chdir(testAssetDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    // create real brains via genBrainRepl: haiku is the default (the test key reaches it);
    // codex is named explicitly, to prove --brain routes the call to the openai service
    // cast: an npm brain package declares its own repl shape, not rhachet's BrainRepl; drop the cast once the package types against rhachet's
    // bounded: a vendor refusal hangs the repl, so each haiku call fails loud past 60s
    const brainHaiku = asBrainReplBounded({
      brain: genBrainReplAnthropic({
        slug: 'claude/code/haiku',
      }) as unknown as BrainRepl,
      waitMs: BRAIN_REPL_BOUND_MS,
    });
    const brainCodex = genBrainReplOpenAI({
      slug: 'openai/codex',
    }) as unknown as BrainRepl;

    const testRegistry: RoleRegistry = {
      slug: '.this',
      readme: { uri: '.test/readme.md' },
      roles: [testerRole],
    };

    const program = new Command();
    program.exitOverride();
    // .mock = a passthrough `jest.spyOn(console, 'log')`; no behavior is replaced
    // .why = invokeAct prints its run header through console.log and takes no log sink, so
    //   the spy is the one seam that observes it
    // .real = the brain, the skill and the cli all run for real; the spy only records
    const logSpy = jest.spyOn(console, 'log');

    beforeEach(() => {
      logSpy.mockClear();
    });

    // register with mock context that provides the tester registry and brain
    const happyContext = genMockContextConfigOfUsage({
      isExplicit: true,
      explicitPath: '/fake/rhachet.use.ts',
      registries: [testRegistry],
      brains: [brainHaiku, brainCodex],
      hooks: null,
    });
    invokeAct({ program }, happyContext);

    when('[t0] act command is invoked with default brain', () => {
      then('it executes the rigid skill with the default brain', async () => {
        const args = [
          'act',
          '--role',
          'tester',
          '--skill',
          'echo.review',
          '--input',
          '{"content":"hello world"}',
        ];
        await program.parseAsync(args, { from: 'user' });

        // verify skill execution was logged
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'act rigid skill repo=.this/role=tester/skill=echo.review',
          ),
        );
      });
    });

    when('[t1] act command is invoked with explicit --brain', () => {
      // the ehmpath test key holds no codex model, so the openai service refuses the call.
      // that refusal is the proof: only the specified brain reaches the openai service
      then(
        'it routes the call to the specified brain from allowlist',
        async () => {
          const args = [
            'act',
            '--role',
            'tester',
            '--skill',
            'echo.review',
            '--brain',
            'openai/codex',
            '--input',
            '{"content":"hello world"}',
          ];
          const error = await getError(() =>
            program.parseAsync(args, { from: 'user' }),
          );

          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining(
              'act rigid skill repo=.this/role=tester/skill=echo.review',
            ),
          );
          expect(error?.message).toContain('model_not_found');
          expect(error?.message).toContain('codex');
        },
      );
    });

    when(
      '[t2] act command is invoked with --brain repo/slug for an anthropic brain',
      () => {
        // the anthropic slug does not open with its repo, so the flag reads as repo/rest
        then('it executes the rigid skill with the named brain', async () => {
          const args = [
            'act',
            '--role',
            'tester',
            '--skill',
            'echo.review',
            '--brain',
            'anthropic/claude/code/haiku',
            '--input',
            '{"content":"hello world"}',
          ];
          await program.parseAsync(args, { from: 'user' });

          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining(
              'act rigid skill repo=.this/role=tester/skill=echo.review',
            ),
          );
        });
      },
    );

    // the allowlist refusal makes no brain call, so it runs ungated in invokeAct.integration
  },
);
