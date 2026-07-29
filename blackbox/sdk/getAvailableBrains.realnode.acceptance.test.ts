import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { spawnProbeBetween } from '../.test/infra/spawnProbeBetween';

/**
 * .what = real-node subprocess acceptance proof for getAvailableBrains discovery (#429)
 * .why  = getAvailableBrains is the primary #429 load-site: it loads brain packages via a
 *         runtime import() that tsc would down-level to a require() shim under
 *         module:commonjs. jest cannot witness a real import() (see importEsmSafe file), so
 *         a real node child against the BUILT dist drives the discovery loop for real —
 *         case1 against this repo's installed esm-only brain (anthropic), case2 against a
 *         bad + a healthy package to prove fault isolation (acc#3).
 * .note = the probe reaches getAvailableBrains + genContextBrain through the published
 *         `rhachet/brains` contract artifact (dist/contract/sdk.brains.js), not the internal
 *         operation files — the action under test crosses the same boundary a consumer does
 *         (rule.require.acceptance.blackbox).
 * .note = these cases assert inline, NOT via toMatchSnapshot() (unlike importEsmSafe's
 *         case1 and the two esm-fixture peer files). the report here reflects the real
 *         INSTALLED brain registry (repo lists, counts) — it changes whenever a brain
 *         package is added, removed, or bumped, so a snapshot would be environment-brittle
 *         and break on unrelated dependency changes. the deterministic esm-fixture files
 *         (which scaffold their own fixed package) do carry snapshots.
 */
describe('getAvailableBrains.realnode.acceptance', () => {
  // probe THROUGH the published contract boundary, not the internal operation file:
  // `getAvailableBrains` + `genContextBrain` are both re-exported from the `rhachet/brains`
  // subpath export (package.json exports `./brains` -> dist/contract/sdk.brains.js). a
  // consumer reaches them there, so the probe requires that exact built contract artifact —
  // the same file `require('rhachet/brains')` resolves to — per rule.require.acceptance.blackbox
  // (the action under test crosses the contract boundary, not an internal dist path).
  const brainsContractDistPath = join(
    __dirname,
    '..',
    '..',
    'dist',
    'contract',
    'sdk.brains.js',
  );
  const repoRoot = join(__dirname, '..', '..');

  given(
    '[case1] the built getAvailableBrains, run in a real node child against this repo',
    () => {
      // this repo installs rhachet-brains-anthropic (which pins the esm-only
      // @anthropic-ai/claude-agent-sdk) — the exact #429 scenario. a real node child
      // runs the discovery path, where import() of the esm brain loads for real.
      const gabProbePath = join(
        __dirname,
        '..',
        '.test',
        'infra',
        'probe.getAvailableBrains.cjs',
      );

      // precondition self-assertion: case1 only proves the #429 esm-load path WHILE the
      // anthropic sdk it pins is esm-only. if a future sdk ships a commonjs entry, discovery
      // would still find the brain, so every case1 assertion below would still pass WITHOUT
      // exercising the esm path — a silent false-positive. so read the installed sdk manifest
      // (two-hop: the sdk is a transitive dep of the brain, not a direct repo dep) and pin its
      // esm-only premise as an explicit, visible assertion (fail-loud if the premise drifts).
      const sdkPremise = useBeforeAll(async () => {
        // the installed brain package roots the two-hop lookup. if the brain packages are absent
        // (e.g. a fresh worktree with no node_modules), fail with a clear install hint rather than
        // a raw MODULE_NOT_FOUND — this mirrors the dist-absent ConstraintError guard above so
        // both "run the build" and "run the install" preconditions read the same way.
        try {
          const requireFromRepo = createRequire(join(repoRoot, 'package.json'));
          const brainPkgJsonPath = requireFromRepo.resolve(
            'rhachet-brains-anthropic/package.json',
          );
          const requireFromBrain = createRequire(brainPkgJsonPath);
          const sdkPkgJsonPath = requireFromBrain.resolve(
            '@anthropic-ai/claude-agent-sdk/package.json',
          );
          const sdkManifest = JSON.parse(
            readFileSync(sdkPkgJsonPath, 'utf-8'),
          ) as { type?: string; main?: string };
          return { type: sdkManifest.type ?? null };
        } catch (error) {
          // re-throw loud (never swallow): a legible constraint with the original cause, so a
          // missing-install reads as an actionable hint, not a bare stack trace (rule.forbid.failhide)
          throw new ConstraintError(
            'rhachet-brains-anthropic (or its @anthropic-ai/claude-agent-sdk dep) could not be looked up — run `pnpm install` first',
            {
              repoRoot,
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      });

      when('[precondition] the pinned anthropic sdk is still esm-only', () => {
        then(
          'its manifest declares type:module (else case1 no longer proves the esm path)',
          () => {
            expect(sdkPremise.type).toEqual('module');
          },
        );
      });

      const report = useBeforeAll(async () => {
        if (!existsSync(brainsContractDistPath))
          throw new ConstraintError(
            'built contract dist sdk.brains.js absent — run `npm run build` first',
            { brainsContractDistPath },
          );

        return spawnProbeBetween<{
          atomRepos: string[];
          replRepos: string[];
          atomCount: number;
          replCount: number;
          atomHasDupSlugs: boolean;
          replHasDupSlugs: boolean;
          allAtomsAskIsFunction: boolean;
          allReplsAskIsFunction: boolean;
          allReplsActIsFunction: boolean;
          allAtomsWellFormed: boolean;
          allReplsWellFormed: boolean;
        }>({
          args: [gabProbePath, brainsContractDistPath],
          label: 'getAvailableBrains',
          options: { cwd: repoRoot },
        });
      });

      when('[t0] discovery loads the installed esm-only brain packages', () => {
        then('the anthropic brain (esm-only sdk) is discovered', () => {
          expect(report.atomRepos).toContain('anthropic');
        });

        then('at least one atom and one repl brain are discovered', () => {
          expect(report.atomCount).toBeGreaterThan(0);
          expect(report.replCount).toBeGreaterThan(0);
        });

        then('discovered brains are deduped by slug (no repeats)', () => {
          expect(report.atomHasDupSlugs).toBe(false);
          expect(report.replHasDupSlugs).toBe(false);
        });

        then('EVERY discovered brain exposes its invocation methods', () => {
          // exhaustive, not first-item-only: every atom exposes ask(); every repl exposes
          // BOTH ask() and act() — so one malformed brain deep in the registry can't slip by
          expect(report.allAtomsAskIsFunction).toBe(true);
          expect(report.allReplsAskIsFunction).toBe(true);
          expect(report.allReplsActIsFunction).toBe(true);
        });

        then('EVERY discovered brain is a well-formed domain object', () => {
          // real installed npm packages must yield well-formed BrainAtom/BrainRepl objects —
          // repo/slug/description populated + spec present — not just callable stubs
          expect(report.allAtomsWellFormed).toBe(true);
          expect(report.allReplsWellFormed).toBe(true);
        });
      });
    },
  );

  given(
    '[case2] the getAvailableBrains loop, run against a bad package beside a healthy one',
    () => {
      // acc#3 end-to-end loop proof: the discovery loop must CONTINUE past a package that
      // fails to load and still aggregate a healthy package's brains, so "a single bad
      // brain never sinks the registry". the unit clamp (getBrainsFromPackageExports case2)
      // proves ONE package degrades in isolation; only this exercises the loop itself.
      const faultProbePath = join(
        __dirname,
        '..',
        '.test',
        'infra',
        'probe.getAvailableBrains.faultIsolation.cjs',
      );

      const report = useBeforeAll(async () => {
        if (!existsSync(brainsContractDistPath))
          throw new ConstraintError(
            'built contract dist sdk.brains.js absent — run `npm run build` first',
            { brainsContractDistPath },
          );

        const workDir = genTempDir({
          slug: 'getAvailableBrains-fault-isolation',
        });
        return spawnProbeBetween<{
          healthySurvived: boolean;
          atomCount: number;
          replCount: number;
        }>({
          args: [faultProbePath, brainsContractDistPath, workDir],
          label: 'fault-isolation',
          options: { cwd: repoRoot },
        });
      });

      when('[t0] one declared package fails to load beside a healthy one', () => {
        then(
          'the loop continues and the healthy package brains still populate',
          () => {
            expect(report.healthySurvived).toBe(true);
            expect(report.atomCount).toBeGreaterThan(0);
          },
        );
      });
    },
  );

  given(
    '[case3] discovery mode, run with a brain choice absent from the real registry',
    () => {
      // F1 — the end-user path the wish exists to fix: after this fix, discovery loads MORE
      // brains (esm-only ones now join the registry), so when a user types a brain slug that
      // is not among them, the not-found error must list the REAL discovered brains. jest
      // cannot witness discovery's native import(), and the explicit-mode tests inject a fake
      // brain list — so only a real node child proves getAvailableBrains() (discovery) feeds a
      // real list into the shared BrainChoiceNotFoundError path.
      const notFoundProbePath = join(
        __dirname,
        '..',
        '.test',
        'infra',
        'probe.genContextBrain.discoveryNotFound.cjs',
      );

      const report = useBeforeAll(async () => {
        if (!existsSync(brainsContractDistPath))
          throw new ConstraintError(
            'built contract dist sdk.brains.js absent — run `npm run build` first',
            { brainsContractDistPath },
          );

        // both genContextBrain and getAvailableBrains are re-exported from the same
        // contract artifact, so the probe reads both from that one published boundary
        return spawnProbeBetween<{
          errorName: string | null;
          realBrainCount: number;
          metadataAvailableCount: number | null;
          messageHasHeader: boolean;
          messageListsRealBrain: boolean;
          sampleSlug: string | null;
        }>({
          args: [
            notFoundProbePath,
            brainsContractDistPath,
            brainsContractDistPath,
          ],
          label: 'discovery-not-found',
          options: { cwd: repoRoot },
        });
      });

      when('[t0] the choice matches no discovered brain', () => {
        then('a BrainChoiceNotFoundError is thrown', () => {
          expect(report.errorName).toEqual('BrainChoiceNotFoundError');
        });

        then('the real registry is non-empty (discovery ran for real)', () => {
          expect(report.realBrainCount).toBeGreaterThan(0);
        });

        then('the error lists the real discovered brains', () => {
          expect(report.messageHasHeader).toBe(true);
          expect(report.messageListsRealBrain).toBe(true);
          expect(report.metadataAvailableCount).toEqual(report.realBrainCount);
        });
      });
    },
  );
});
