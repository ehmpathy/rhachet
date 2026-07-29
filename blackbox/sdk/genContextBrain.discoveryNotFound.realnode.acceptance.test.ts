import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { spawnProbeBetween } from '../.test/infra/spawnProbeBetween';

/**
 * .what = deterministic snapshot of the discovery-mode BrainChoiceNotFoundError message,
 *         driven against a FIXED esm-only brain fixture, for all three choice variants
 *         (generic / repl / atom) (ehmpathy/rhachet#429).
 * .why  = recovers the snapshot observability the removed genContextBrain.integration.test
 *         case4 held. that test snapshotted the discovery-fed not-found message, but drove it
 *         against the REAL installed registry (environment-brittle — any brain dep bump broke
 *         the snapshot) AND under jest (which cannot witness importEsmSafe's native import(),
 *         so discovery returned an empty registry). a real node child + a FIXED esm fixture
 *         yields a DETERMINISTIC registry, so the discovery path's rendered not-found message
 *         can be snapshotted honestly, without the brittleness that forced the removal.
 * .note = this is the fixed-fixture COMPANION to getAvailableBrains.realnode.acceptance case3,
 *         which proves the SAME discovery-not-found path against the REAL registry (and so must
 *         assert inline, never snapshot). there: real registry, inline. here: fixed fixture,
 *         snapshot. together they cover both the live path and the rendered format.
 * .note = the probe reaches genContextBrain through the published `rhachet/brains` contract
 *         artifact (dist/contract/sdk.brains.js), the same file a consumer resolves — the
 *         action under test crosses the contract boundary (rule.require.acceptance.blackbox).
 */
describe('genContextBrain.discoveryNotFound.realnode.acceptance', () => {
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
    '[case1] discovery mode, driven against a FIXED esm brain fixture (1 atom + 1 repl)',
    () => {
      const notFoundFixtureProbePath = join(
        __dirname,
        '..',
        '.test',
        'infra',
        'probe.genContextBrain.discoveryNotFound.esmFixture.cjs',
      );

      const report = useBeforeAll(async () => {
        if (!existsSync(brainsContractDistPath))
          throw new ConstraintError(
            'built contract dist sdk.brains.js absent — run `npm run build` first',
            { brainsContractDistPath },
          );

        const workDir = genTempDir({
          slug: 'genContextBrain-discovery-notFound-esmFixture',
        });
        return spawnProbeBetween<{
          generic: { name: string | null; message: string } | null;
          repl: { name: string | null; message: string } | null;
          atom: { name: string | null; message: string } | null;
        }>({
          args: [notFoundFixtureProbePath, brainsContractDistPath, workDir],
          label: 'discovery-not-found-esmFixture',
          options: { cwd: repoRoot },
        });
      });

      when('[t0] a generic choice matches no fixture brain', () => {
        then('a BrainChoiceNotFoundError is thrown', () => {
          expect(report.generic?.name).toEqual('BrainChoiceNotFoundError');
        });

        then('the message includes the fixture atom AND repl', () => {
          expect(report.generic?.message).toContain('esmfix/atom-alpha');
          expect(report.generic?.message).toContain('esmfix/repl-beta');
        });

        then('the rendered discovery not-found message matches snapshot', () => {
          expect(report.generic?.message).toMatchSnapshot();
        });
      });

      when('[t1] a typed repl choice matches no fixture repl', () => {
        then('a BrainChoiceNotFoundError names the fixture repl', () => {
          expect(report.repl?.name).toEqual('BrainChoiceNotFoundError');
          expect(report.repl?.message).toContain('esmfix/repl-beta');
        });

        then('the rendered repl not-found message matches snapshot', () => {
          expect(report.repl?.message).toMatchSnapshot();
        });
      });

      when('[t2] a typed atom choice matches no fixture atom', () => {
        then('a BrainChoiceNotFoundError names the fixture atom', () => {
          expect(report.atom?.name).toEqual('BrainChoiceNotFoundError');
          expect(report.atom?.message).toContain('esmfix/atom-alpha');
        });

        then('the rendered atom not-found message matches snapshot', () => {
          expect(report.atom?.message).toMatchSnapshot();
        });
      });
    },
  );
});
