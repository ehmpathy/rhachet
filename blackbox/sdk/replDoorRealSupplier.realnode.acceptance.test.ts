import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { spawnProbeBetween } from '../.test/infra/spawnProbeBetween';

/**
 * .what = the repl spawn door against the REAL installed anthropic supplier and a LIVE haiku
 *   brain: the claude child that answers boots with the scoped depth and the leaf mark
 * .why = the supplier is an external contract: it spawns its brain with no `env` option, so the
 *   child boots with whatever the sdk copies from `process.env`. only the real supplier, the real
 *   sdk and the real service prove that copy falls inside the spawn scope end to end. the sdk is
 *   esm, which jest cannot load, so a real node child drives it
 * .rule = per the ehmpathy/rhachet#577 vision: a repl brain's child is a reviewer, a leaf
 * .note = no mock: the probe (`probe.replDoorRealSupplierLive.cjs`) wraps `child_process.spawn`
 *   to record the env the live child booted with, then calls the real spawn. the spawn counts
 *   and the leaf refusal, which need the spawn stopped, are
 *   `replDoorRealSupplier.realnode.integration.test.ts`
 * .note = the probe reaches genContextBrain through the built `rhachet/brains` contract
 *   (dist/contract/sdk.brains.js), the file a consumer resolves (rule.require.acceptance.blackbox)
 */
describe('replDoorRealSupplier.realnode.acceptance', () => {
  const brainsContractDistPath = join(
    __dirname,
    '..',
    '..',
    'dist',
    'contract',
    'sdk.brains.js',
  );
  const repoRoot = join(__dirname, '..', '..');
  const livePath = join(
    __dirname,
    '..',
    '.test',
    'infra',
    'probe.replDoorRealSupplierLive.cjs',
  );

  given('[case1] a live haiku brain behind the real anthropic repl', () => {
    when('[t0] a depth-0 caller asks the live brain', () => {
      const live = useBeforeAll(async () => {
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
          content: string | null;
          spawns: Array<{ depth: string | null; leaf: string | null }>;
          envAfter: { depth: string | null; leaf: string | null };
        }>({
          args: [livePath, brainsContractDistPath],
          label: 'repl-door real-supplier live',
          options: { cwd: repoRoot },
        });
      });

      then('the real service answers', () => {
        expect(live.content?.toLowerCase()).toContain('ok');
      });

      then('the claude child that answered booted at depth 1, a leaf', () => {
        expect(live.spawns).toHaveLength(1);
        expect(live.spawns[0]).toEqual({ depth: '1', leaf: '1' });
      });

      then('the caller env is restored after the call', () => {
        expect(live.envAfter).toEqual({ depth: '0', leaf: null });
      });
    });
  });
});
