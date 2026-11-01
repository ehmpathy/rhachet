import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { genTempDir, given, then, when } from 'test-fns';

import { getAllInfraModuleExportsUnclassified } from './getAllInfraModuleExportsUnclassified';
import {
  CAUSE_EXCEPTION_ABSENT,
  CAUSE_EXCEPTION_OVERREACH,
  CAUSE_SUITE_RUN_AT_COLLECTION,
  getAllLiveBrainSuitesUngated,
} from './getAllLiveBrainSuitesUngated';
import {
  CAUSE_MODULE_NONE_OVERREACH,
  CAUSE_MODULE_PROD_SUPPLIER,
  CAUSE_MODULE_UNREGISTERED,
  getAllNonTestModulesReachUnregistered,
} from './getAllNonTestModulesReachUnregistered';
import { CAUSE_SUITE_GATE_ABSENT, getCauseOfSuiteUngated } from './getCauseOfSuiteUngated';
import { LIVE_BRAIN_REGISTRY } from './liveBrainRegistry';

/**
 * .what = the clamp on rule.forbid.live-brain-spend-beyond-the-smoke-tier, over this repo
 * .why = no test may reach a live brain outside the tier-3 gate, and no infra module may hide
 *   the reach; the shapes are each pinned by the unit tables of the pure operations, so these
 *   disk cases prove only the globs and the wire
 */

/**
 * .what = write a file into a fixture repo
 * .why = each case names the shape it plants, and the scan reads it from disk
 */
const setFixtureFile = (input: { cwd: string; path: string; content: string }): void => {
  mkdirSync(join(input.cwd, input.path, '..'), { recursive: true });
  writeFileSync(join(input.cwd, input.path), input.content);
};

describe('getAllLiveBrainSuitesUngated', () => {
  given('[case1] this repo', () => {
    const cwd = join(__dirname, '..', '..', '..');

    when('[t0] its suites are scanned', () => {
      then('every suite that reaches a live brain is wholly gated or a named exception', () => {
        expect(getAllLiveBrainSuitesUngated({ cwd, registry: LIVE_BRAIN_REGISTRY })).toEqual([]);
      });
    });

    when('[t1] its non-test modules are scanned', () => {
      then('each one that can reach a brain is registered, so no live call hides in test infra', () => {
        expect(
          getAllNonTestModulesReachUnregistered({ cwd, registry: LIVE_BRAIN_REGISTRY }),
        ).toEqual([]);
      });
    });

    when('[t3] the tier-2 smoke suite is read', () => {
      then('it holds no gate, so the one live proof on cicd can never go dark as a todo row', () => {
        const content = readFileSync(
          join(cwd, 'blackbox/cli/clone.realbrain.acceptance.test.ts'),
          'utf8',
        );
        expect(getCauseOfSuiteUngated({ content })).toEqual(CAUSE_SUITE_GATE_ABSENT);
        expect(content).not.toContain('describeBrainLiveOnDemand');
      });
    });

    when('[t2] the exports of its registered modules are read', () => {
      then('each one is classified live or stub, so a new entry point cannot pass as a stub', () => {
        expect(
          getAllInfraModuleExportsUnclassified({ cwd, registry: LIVE_BRAIN_REGISTRY }),
        ).toEqual([]);
      });
    });
  });

  given('[case2] a fixture repo with a suite in each place the glob must reach', () => {
    const cwd = genTempDir({ slug: 'live-brain-suites-ungated' });
    const live = "import { genBrainRepl } from 'rhachet-brains-anthropic';\ndescribe('x', () => {});\n";
    setFixtureFile({ cwd, path: 'src/a.integration.test.ts', content: live });
    setFixtureFile({ cwd, path: 'src/.test/infra/b.integration.test.ts', content: live });
    setFixtureFile({ cwd, path: '.agent/repo=.this/role=any/skills/c.integration.test.ts', content: live });
    setFixtureFile({ cwd, path: '.agent/repo=other/role=any/skills/d.integration.test.ts', content: live });
    setFixtureFile({ cwd, path: 'node_modules/pkg/e.test.ts', content: live });
    setFixtureFile({
      cwd,
      path: 'src/gated.live.integration.test.ts',
      content: "import { genBrainRepl } from 'rhachet-brains-anthropic';\ndescribeBrainLiveOnDemand('live', () => {});\n",
    });
    setFixtureFile({ cwd, path: 'src/excepted.integration.test.ts', content: live });
    setFixtureFile({ cwd, path: 'src/overreach.integration.test.ts', content: live });
    setFixtureFile({
      cwd,
      path: 'blackbox/sdk/probeLive.acceptance.test.ts',
      content: "const probe = join(__dirname, '..', '.test', 'infra', 'probe.replDoorRealSupplierLive.cjs');\n",
    });
    setFixtureFile({
      cwd,
      path: 'blackbox/sdk/zzDiscovery.acceptance.test.ts',
      content:
        "const context = await genContextBrain({ choice: 'anthropic/claude-code' });\nawait context.brain.choice.ask({ prompt: 'hi' });\n",
    });
    setFixtureFile({
      cwd,
      path: 'blackbox/sdk/zzPrintMode.acceptance.test.ts',
      content: "execSync('claude -p --model haiku hi');\n",
    });
    setFixtureFile({
      cwd,
      path: 'blackbox/sdk/zzContextPass.acceptance.test.ts',
      content:
        "const context = await genContextBrain({ choice: 'anthropic/claude-code' });\nawait actorAsk({ prompt: 'hi' }, context);\n",
    });
    setFixtureFile({
      cwd,
      path: 'blackbox/sdk/zzDoubleQuote.acceptance.test.ts',
      content:
        'import { genBrainRepl } from "rhachet-brains-anthropic";\nconst brain = genBrainRepl({ slug: "claude/code/haiku" });\nawait brain.ask({ prompt: "hi" });\n',
    });
    setFixtureFile({
      cwd,
      path: 'blackbox/sdk/zzTopLevelConst.acceptance.test.ts',
      content:
        "const answer = execSync('claude -p --model haiku hi').toString();\ndescribeBrainLiveOnDemand('x', () => {});\n",
    });
    setFixtureFile({
      cwd,
      path: 'blackbox/sdk/zzExecFile.acceptance.test.ts',
      content: "then('x', () => execFileSync('claude', ['hi']));\n",
    });
    setFixtureFile({
      cwd,
      path: 'blackbox/sdk/zzVendorHost.acceptance.test.ts',
      content: "then('x', async () => fetch('https://api.anthropic.com/v1/messages', {}));\n",
    });
    setFixtureFile({
      cwd,
      path: 'blackbox/sdk/zzCliSlug.acceptance.test.ts',
      content: "then('x', async () => invokeCli(['ask', '--brain', 'anthropic/claude/code/haiku']));\n",
    });
    setFixtureFile({
      cwd,
      path: 'blackbox/sdk/zzGatedBody.acceptance.test.ts',
      content: "describeBrainLiveOnDemand('x', () => {\n  spawnSync('claude', ['-p', 'hi']);\n});\n",
    });
    // a slug in an assertion is data: no call hands it to a brain
    setFixtureFile({
      cwd,
      path: 'blackbox/sdk/zzSlugAssert.acceptance.test.ts',
      content: "then('x', () => expect(found).toContain('anthropic/claude/code'));\n",
    });

    when('[t0] the fixture is scanned with its exceptions', () => {
      then('each ungated suite in a scanned place is named, and each stale or overreached exception, and no other', () => {
        const ungated = getAllLiveBrainSuitesUngated({
          cwd,
          registry: {
            ...LIVE_BRAIN_REGISTRY,
            suiteExceptions: {
              'src/excepted.integration.test.ts': {
                reason: 'a reason',
                allows: ['an import of a rhachet-brains-* supplier'],
              },
              'src/overreach.integration.test.ts': { reason: 'a reason', allows: [] },
              'src/gone.integration.test.ts': { reason: 'a reason', allows: [] },
            },
          },
        });
        expect(ungated.map(({ path, cause }) => ({ path, cause }))).toEqual([
          { path: '.agent/repo=.this/role=any/skills/c.integration.test.ts', cause: CAUSE_SUITE_GATE_ABSENT },
          { path: 'blackbox/sdk/probeLive.acceptance.test.ts', cause: CAUSE_SUITE_GATE_ABSENT },
          { path: 'blackbox/sdk/zzCliSlug.acceptance.test.ts', cause: CAUSE_SUITE_GATE_ABSENT },
          { path: 'blackbox/sdk/zzContextPass.acceptance.test.ts', cause: CAUSE_SUITE_GATE_ABSENT },
          { path: 'blackbox/sdk/zzDiscovery.acceptance.test.ts', cause: CAUSE_SUITE_GATE_ABSENT },
          { path: 'blackbox/sdk/zzDoubleQuote.acceptance.test.ts', cause: CAUSE_SUITE_GATE_ABSENT },
          { path: 'blackbox/sdk/zzExecFile.acceptance.test.ts', cause: CAUSE_SUITE_GATE_ABSENT },
          { path: 'blackbox/sdk/zzGatedBody.acceptance.test.ts', cause: CAUSE_SUITE_RUN_AT_COLLECTION },
          { path: 'blackbox/sdk/zzPrintMode.acceptance.test.ts', cause: CAUSE_SUITE_GATE_ABSENT },
          {
            path: 'blackbox/sdk/zzTopLevelConst.acceptance.test.ts',
            cause: CAUSE_SUITE_RUN_AT_COLLECTION,
          },
          { path: 'blackbox/sdk/zzVendorHost.acceptance.test.ts', cause: CAUSE_SUITE_GATE_ABSENT },
          { path: 'src/.test/infra/b.integration.test.ts', cause: CAUSE_SUITE_GATE_ABSENT },
          { path: 'src/a.integration.test.ts', cause: CAUSE_SUITE_GATE_ABSENT },
          { path: 'src/gone.integration.test.ts', cause: CAUSE_EXCEPTION_ABSENT },
          { path: 'src/overreach.integration.test.ts', cause: CAUSE_EXCEPTION_OVERREACH },
        ]);
      });
    });
  });

  given('[case3] a fixture repo with non-test modules that can reach a brain', () => {
    const cwd = genTempDir({ slug: 'live-brain-module-reach' });
    setFixtureFile({
      cwd,
      path: 'src/.test/infra/askClaude.ts',
      content: "export const x = () => spawnSync('claude', ['-p', 'hi']);\n",
    });
    setFixtureFile({
      cwd,
      path: 'blackbox/.test/infra/wrapJourney.ts',
      content: "import { askClaudePrintForSentinels } from './brainDirBootJourney';\nexport const x = askClaudePrintForSentinels;\n",
    });
    setFixtureFile({
      cwd,
      path: 'blackbox/.test/infra/wrapHarness.ts',
      content: "import { sayAndPollForMarker } from './enrollCloneHarness';\nexport const x = sayAndPollForMarker;\n",
    });
    setFixtureFile({
      cwd,
      path: 'src/contract/viaSupplier.ts',
      content: "import { genBrainRepl } from 'rhachet-brains-openai';\nexport const x = genBrainRepl;\n",
    });
    setFixtureFile({
      cwd,
      path: 'src/contract/spawnBrainCli.ts',
      content: "export const x = () => spawn('claude', []);\n",
    });
    setFixtureFile({
      cwd,
      path: 'blackbox/.test/infra/brainDirBootJourney.ts',
      content: "export const x = () => spawn(binPath, ['-p', '--model', 'haiku']);\n",
    });
    setFixtureFile({ cwd, path: 'src/.test/infra/genNoBrain.ts', content: 'export const x = 1;\n' });
    setFixtureFile({
      cwd,
      path: 'blackbox/.test/infra/probe.biteAsk.cjs',
      content: "const context = await genContextBrain({ choice: 'a/b' });\nawait context.brain.choice.ask({ prompt: 'hi' });\n",
    });
    setFixtureFile({
      cwd,
      path: 'blackbox/.test/infra/probe.replDoorRealSupplier.cjs',
      content: "const context = await genContextBrain({ choice: 'a/b' });\nawait context.brain.choice.ask({ prompt: 'bite' });\n",
    });
    setFixtureFile({
      cwd,
      path: 'blackbox/cli/zzHelper.ts',
      content: "export const askHaiku = () => spawnSync('claude', ['-p', '--model', 'haiku', 'hi']);\n",
    });
    setFixtureFile({
      cwd,
      path: '.agent/repo=.this/role=any/skills/zzHelper.ts',
      content: "export const askHaiku = () => spawnSync('claude', ['-p', '--model', 'haiku', 'hi']);\n",
    });
    setFixtureFile({
      cwd,
      path: '.agent/repo=.this/role=any/skills/zzHelper.sh',
      content: 'claude -p --model haiku "hi"\n',
    });
    setFixtureFile({
      cwd,
      path: 'blackbox/cli/zzHelper.cjs',
      content: "spawnSync('claude', ['-p', '--model', 'haiku', 'hi']);\n",
    });
    setFixtureFile({
      cwd,
      path: 'blackbox/.test/infra/askClaude.sh',
      content: 'claude -p "say ok"\n',
    });
    setFixtureFile({
      cwd,
      path: 'blackbox/.test/assets/with-stub/node_modules/rhachet-brains-test/index.js',
      content: 'exports.x = () => genContextBrain({});\n',
    });

    when('[t0] the non-test modules are scanned', () => {
      then('each unregistered test-infra module with a marker, in any language, a wrapper included, each none module past its allows, and each prod supplier import is named', () => {
        expect(
          getAllNonTestModulesReachUnregistered({ cwd, registry: LIVE_BRAIN_REGISTRY }),
        ).toEqual([
          // .agent/repo=.this/ holds no prod code either, so a helper there is test infra, in any
          //   language; the universe is built by exclusion, so no root or extension is left out
          {
            path: '.agent/repo=.this/role=any/skills/zzHelper.sh',
            markers: ['a claude print-mode command'],
            cause: CAUSE_MODULE_UNREGISTERED,
          },
          {
            path: '.agent/repo=.this/role=any/skills/zzHelper.ts',
            markers: ['a spawn of the claude cli', 'a claude print-mode call'],
            cause: CAUSE_MODULE_UNREGISTERED,
          },
          {
            path: 'blackbox/.test/infra/askClaude.sh',
            markers: ['a claude print-mode command'],
            cause: CAUSE_MODULE_UNREGISTERED,
          },
          {
            path: 'blackbox/.test/infra/probe.biteAsk.cjs',
            markers: ['a brain call', 'a brain context with a call', 'a brain context'],
            cause: CAUSE_MODULE_UNREGISTERED,
          },
          // a 'none' module is read too: a marker beyond its allows is named
          {
            path: 'blackbox/.test/infra/probe.replDoorRealSupplier.cjs',
            markers: ['a brain call', 'a brain context with a call'],
            cause: CAUSE_MODULE_NONE_OVERREACH,
          },
          {
            path: 'blackbox/.test/infra/wrapHarness.ts',
            markers: ['a live entry point of blackbox/.test/infra/enrollCloneHarness.ts'],
            cause: CAUSE_MODULE_UNREGISTERED,
          },
          {
            path: 'blackbox/.test/infra/wrapJourney.ts',
            markers: ['an import of blackbox/.test/infra/brainDirBootJourney.ts'],
            cause: CAUSE_MODULE_UNREGISTERED,
          },
          // blackbox/ holds no prod code, so a helper outside .test/ there is still test infra
          {
            path: 'blackbox/cli/zzHelper.cjs',
            markers: ['a spawn of the claude cli', 'a claude print-mode call'],
            cause: CAUSE_MODULE_UNREGISTERED,
          },
          {
            path: 'blackbox/cli/zzHelper.ts',
            markers: ['a spawn of the claude cli', 'a claude print-mode call'],
            cause: CAUSE_MODULE_UNREGISTERED,
          },
          {
            path: 'src/.test/infra/askClaude.ts',
            markers: ['a spawn of the claude cli'],
            cause: CAUSE_MODULE_UNREGISTERED,
          },
          {
            path: 'src/contract/viaSupplier.ts',
            markers: ['an import of a rhachet-brains-* supplier'],
            cause: CAUSE_MODULE_PROD_SUPPLIER,
          },
        ]);
      });
    });
  });

  given('[case4] a fixture repo whose registered harness gained an export', () => {
    const cwd = genTempDir({ slug: 'live-brain-exports-unclassified' });
    setFixtureFile({
      cwd,
      path: 'blackbox/.test/infra/enrollCloneHarness.ts',
      content: 'export const getRealClaudeOrThrow = () => 1;\nexport const getRealClaudeBinPath2 = () => 2;\n',
    });

    when('[t0] the registered modules are read', () => {
      then('the new export is named, and each absent registered module too', () => {
        const unclassified = getAllInfraModuleExportsUnclassified({
          cwd,
          registry: LIVE_BRAIN_REGISTRY,
        });
        expect(unclassified).toContainEqual({
          path: 'blackbox/.test/infra/enrollCloneHarness.ts',
          names: ['getRealClaudeBinPath2'],
        });
        expect(unclassified).toContainEqual({
          path: 'src/.test/getContextOpenAI.ts',
          names: ['<module absent>'],
        });
      });
    });
  });
});
