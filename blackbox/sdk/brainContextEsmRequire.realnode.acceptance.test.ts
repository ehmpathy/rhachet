import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { spawnProbeBetween } from '../.test/infra/spawnProbeBetween';

/**
 * .what = real-node subprocess acceptance clamp for the brain-context contract's esm-require safety
 *         (ehmpathy/rhachet#468 + #429)
 * .why  = the #468/#429 defect surfaces WORST here: a downstream jest (or a brain package's compiled
 *         cjs) does `require('rhachet/brains')`, which evaluates the whole static-import graph behind
 *         genContextBrain + getAvailableBrains. an eager (top-level) import of a pure-esm package in
 *         ANY file of that graph down-levels to a require() in dist, so the cjs require of the
 *         contract throws `Must use import to load ES Module` — which silently empties the brain
 *         registry (the #429 `atoms: []` symptom). the keyrack clamp
 *         (keyrackEsmRequire.realnode.acceptance) guards the KEYRACK eval graph; this peer clamp
 *         guards the BRAIN-CONTEXT eval graph — the actual #429 failure surface — so a future eager
 *         esm import there is caught proactively, in THIS repo, not only downstream.
 *
 *         RED/GREEN is ENVIRONMENT-INDEPENDENT + subpath-precise: the probe hooks Module._load to
 *         record which specifiers the contract module-eval require()s, then flags each whose real cjs
 *         require() would hit a pure-esm module (the shared detectEsmLandmine detector — it maps the
 *         exact request under require conditions + reads the mapped file's static type, never a
 *         require throw, so it does not rot when node's require-esm support shifts). there is no
 *         hardcoded package list, so a NEW eager pure-esm dep in the brain-context graph is caught
 *         with no test edit.
 * .note = this clamp DELIBERATELY drives the built contract artifact (dist/contract/sdk.brains.js) —
 *         the exact file `require('rhachet/brains')` resolves to — as its subject, per
 *         rule.require.acceptance.blackbox (the action under test crosses the published contract
 *         boundary a consumer hits). the #468/#429 defect IS "the built contract can be require()d
 *         under cjs" — a node-interop property of the compiled artifact that no public method
 *         signature can express — so the artifact IS the contract under test.
 * .note = the probe audits EAGER eval-time requires only; it does NOT call getAvailableBrains(),
 *         whose brain-package loads are LEGITIMATELY lazy (via importEsmSafe) and are not landmines.
 *         the discovery behavior itself is proven by getAvailableBrains.realnode.acceptance; this
 *         clamp proves the narrower, complementary property that no eager pure-esm require sits in
 *         the contract's static-import graph.
 */
describe('brainContextEsmRequire.realnode.acceptance', () => {
  // probe THROUGH the published contract boundary: genContextBrain + getAvailableBrains are both
  // re-exported from the `rhachet/brains` subpath export (package.json exports `./brains` ->
  // dist/contract/sdk.brains.js). a consumer's `require('rhachet/brains')` resolves to exactly this
  // built file, so the probe requires it — per rule.require.acceptance.blackbox.
  const brainsContractDistPath = join(
    __dirname,
    '..',
    '..',
    'dist',
    'contract',
    'sdk.brains.js',
  );
  const repoRoot = join(__dirname, '..', '..');
  const probePath = join(
    __dirname,
    '..',
    '.test',
    'infra',
    'probe.brainContextEsmRequire.cjs',
  );

  given(
    '[case1] the built brains contract, require()d in a real node child',
    () => {
      const report = useBeforeAll(async () => {
        // the built artifact must exist; acceptance runs after `npm run build`
        if (!existsSync(brainsContractDistPath))
          throw new ConstraintError(
            'built contract dist sdk.brains.js absent — run `npm run build` first',
            {
              brainsContractDistPath,
              hint: 'run `npm run build` first, then re-run acceptance',
            },
          );

        return spawnProbeBetween<{
          requireContractThrew: boolean;
          requireContractError: string | null;
          esmLandminesLoadedAtEval: string[];
        }>({
          args: [probePath, brainsContractDistPath],
          label: 'brain-context esm-require real-node',
          options: { cwd: repoRoot },
        });
      });

      when('[t0] the built brains contract is require()d under cjs', () => {
        // a smoke check that the require() completes, NOT the landmine guarantee itself (a modern
        // node can require() an esm package without a throw, so a false here is necessary but not
        // sufficient). the environment-independent teeth live in [t1]'s Module._load graph.
        then('the require() completes without a throw', () => {
          expect(report.requireContractThrew).toBe(false);
          expect(report.requireContractError).toBe(null);
        });
      });

      when('[t1] Module._load records the contract module-eval require graph', () => {
        // the RED/GREEN teeth: EVERY specifier require()d at eval whose real cjs require() would hit
        // a pure-esm module, flagged by the shared subpath-precise detector (no hardcoded package
        // list). an empty list proves no eager pure-esm require survives in the brain-context eval
        // graph — so a NEW (as-yet-unnamed) landmine eagerly imported there cannot slip past. the
        // report emits the deduped package names, so a failure names WHICH package leaked.
        then('no pure-esm landmine is require()d at eval (the GREEN)', () => {
          expect(report.esmLandminesLoadedAtEval).toEqual([]);
        });
      });
    },
  );
});
