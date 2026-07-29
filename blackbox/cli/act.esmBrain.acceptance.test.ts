import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = CLI acceptance for the esm-only brain-load scenario (ehmpathy/rhachet#429)
 * .why  = parity twin of the SDK realnode witnesses (configLoad.realnode,
 *         getAvailableBrains.realnode). the SDK tests prove the built dist loads an
 *         esm-only brain/config; this proves the SAME scenario through the actual
 *         `rhachet act` binary — required by rule.require.separate-cli-sdk-acceptance-tests
 *         (the --config + brain-load contract exists on BOTH the CLI and the SDK, so parity
 *         applies).
 *
 * .how  = `act` resolves brains via getBrainsByConfigExplicit → importEsmSafe on the config
 *         path, and the binary (bin/run.jit) runs the TSC-BUILT dist — so the #429 fix is
 *         genuinely under test. the fixture config (with-esm-config/esm-config.mjs) is
 *         genuinely esm-only (top-level await), so a require() shim (the #429-broken path)
 *         could not load it: it would throw fail-loud out of the load site and never arrive
 *         at brain resolution. so a run that CLEARS the "no brains available" gate and halts
 *         at role resolution proves the built dist ran a real runtime import().
 *
 * .note = this drives NO real inference (the vision rules the live `--brain` inference
 *         journey out of scope — it needs creds/network). the esm config returns an empty
 *         role registry, so `act` halts fail-loud at role resolution — strictly after the
 *         esm brain-load proof.
 */
describe('rhachet act — esm-only brain load (#429)', () => {
  given('[case1] repo with a genuinely esm-only user-config wired via --config', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-esm-config' }),
    );

    when('[t0] act --config esm-config.mjs --role any --skill say-hello', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'act',
            '--config',
            'esm-config.mjs',
            '--role',
            'any',
            '--skill',
            'say-hello',
          ],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with non-zero status (halts at role resolution)', () => {
        expect(result.status).not.toEqual(0);
      });

      then('the esm brain LOADED — no "no brains available" error', () => {
        // this gate clears only if getBrainRepls was read from the esm-only config through
        // the built dist. a require() shim (the #429-broken path) could not have loaded the
        // top-level-await config — it would have thrown fail-loud out of the load site, so
        // the run would never arrive at the brains gate at all.
        expect(result.stderr).not.toContain('no brains available');
      });

      then('the esm config fully loaded — halts fail-loud at role resolution', () => {
        // a halt at role resolution proves BOTH esm-only load sites ran through the binary:
        // getRoleRegistriesByConfigExplicit (returned []) AND getBrainsByConfigExplicit
        // (returned a non-empty brain list). the empty registry makes --role "any" absent.
        expect(result.stderr).toContain('no role named "any" found in any registry');
      });

      then('no require/esm module-load error leaked (the #429 fail mode is absent)', () => {
        // on the broken require-shim path, a top-level-await esm file throws one of these;
        // their absence confirms the built dist ran a genuine import(), not require().
        expect(result.stderr).not.toContain('require() of ES Module');
        expect(result.stderr).not.toContain('Cannot use import statement outside a module');
      });

      then('the caller-faced stderr is locked to a snapshot', () => {
        // snapshot so a reviewer sees the exact esm-brain-load CLI outcome in the pr diff
        // and any future drift surfaces
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });
});
