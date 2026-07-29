import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { spawnProbeBetween } from '../.test/infra/spawnProbeBetween';

/**
 * .what = the faithful resurrection of the deleted genContextBrain.integration.test case4
 *         snapshot: the discovery-mode BrainChoiceNotFoundError message, driven against the
 *         REAL installed brain registry, snapshotted for all three choice variants (generic /
 *         repl / atom) (ehmpathy/rhachet#429).
 * .why  = the original snapshot lived in a jest integration test. under the #429 fix, discovery
 *         goes through a genuine runtime `import()` (importEsmSafe), and jest's vm sandbox REFUSES
 *         a dynamic import without --experimental-vm-modules — proven empirically:
 *         `TypeError [ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG]: A dynamic import callback was
 *         invoked without --experimental-vm-modules`. so under the fix, EVERY brain package fails
 *         to load under jest, discovery returns an empty registry, and the real-registry snapshot
 *         cannot survive in a jest test. a real node child has no vm restriction, so it drives the
 *         SAME real discovery the deleted test did and captures the SAME real-registry message —
 *         this is the deleted coverage, restored in the only form that can run under the fix.
 * .note = this is the REAL-REGISTRY twin of genContextBrain.discoveryNotFound.realnode (which
 *         uses a fixed esm fixture for a drift-proof snapshot). this one restores the ORIGINAL
 *         real-registry coverage the deleted snapshot held; like any real-registry snapshot it
 *         shifts when a brain package is added / removed / bumped — refresh with RESNAP on an
 *         intentional registry change (rule.require.snapshots: a registry change is an intended
 *         snapshot update, reviewed in the diff).
 * .note = the probe reaches genContextBrain through the published `rhachet/brains` contract
 *         artifact (dist/contract/sdk.brains.js), the same file a consumer resolves — the action
 *         under test crosses the contract boundary (rule.require.acceptance.blackbox).
 */
describe('genContextBrain.discoveryNotFound.realRegistry.realnode.acceptance', () => {
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
    '[case1] discovery mode, driven against the REAL installed brain registry',
    () => {
      const realRegistryProbePath = join(
        __dirname,
        '..',
        '.test',
        'infra',
        'probe.genContextBrain.discoveryNotFound.realRegistry.cjs',
      );

      const report = useBeforeAll(async () => {
        if (!existsSync(brainsContractDistPath))
          throw new ConstraintError(
            'built contract dist sdk.brains.js absent — run `npm run build` first',
            { brainsContractDistPath },
          );

        return spawnProbeBetween<{
          generic: { name: string | null; message: string } | null;
          repl: { name: string | null; message: string } | null;
          atom: { name: string | null; message: string } | null;
        }>({
          args: [realRegistryProbePath, brainsContractDistPath],
          label: 'discovery-not-found-realRegistry',
          options: { cwd: repoRoot },
        });
      });

      when('[t0] a generic choice matches no installed brain', () => {
        then('a BrainChoiceNotFoundError is thrown', () => {
          expect(report.generic?.name).toEqual('BrainChoiceNotFoundError');
        });

        then('the message enumerates the real registry (header + a real brain)', () => {
          expect(report.generic?.message).toContain('🔭 available brains');
          expect(report.generic?.message).toContain('anthropic/claude');
        });

        then('the real-registry generic not-found message matches snapshot', () => {
          expect(report.generic?.message).toMatchSnapshot();
        });
      });

      when('[t1] a typed repl choice matches no installed repl', () => {
        then('a BrainChoiceNotFoundError names the repl registry', () => {
          expect(report.repl?.name).toEqual('BrainChoiceNotFoundError');
          expect(report.repl?.message).toContain('repl brain not found');
        });

        then('the real-registry repl not-found message matches snapshot', () => {
          expect(report.repl?.message).toMatchSnapshot();
        });
      });

      when('[t2] a typed atom choice matches no installed atom', () => {
        then('a BrainChoiceNotFoundError names the atom registry', () => {
          expect(report.atom?.name).toEqual('BrainChoiceNotFoundError');
          expect(report.atom?.message).toContain('atom brain not found');
        });

        then('the real-registry atom not-found message matches snapshot', () => {
          expect(report.atom?.message).toMatchSnapshot();
        });
      });
    },
  );
});
