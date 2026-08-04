import { given, then, when } from 'test-fns';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = clamp: the build emits a scoped dist/package.json declaring CommonJS,
 *   so Node does not have to detect the module kind of each dist/*.js and emit
 *   MODULE_TYPELESS_PACKAGE_JSON on every rhx invocation (the F8 stdout-noise
 *   defect).
 * .why = dist/*.js is compiled CommonJS (tsconfig module=commonjs) loaded via
 *   `require` from bin/run.jit. with no "type" on the nearest package.json Node
 *   must detect the module kind per file and warns. a scoped dist/package.json
 *   {"type":"commonjs"} silences it WITHOUT a root-level "type" — the root form
 *   regresses jest's ESM .ts config load (jest walks up from jest.*.config.ts to
 *   the ROOT package.json, never into dist/). the build:complete step writes
 *   this artifact after tsc compile; this clamp goes red if build:complete is
 *   ever dropped (the next build produces no dist/package.json, readFileSync
 *   throws ENOENT) or if the declared type drifts off commonjs.
 * .note = the acceptance config runs `npm run build` before the suite, so the
 *   repo-root dist/ is freshly built here. this asserts the repo's OWN build
 *   artifact (process.cwd() is the repo root under the acceptance runner), not a
 *   temp-repo binary.
 */
describe('build artifacts', () => {
  given('[case1] a completed build (npm run build ran before the acceptance suite)', () => {
    const distPackageJsonPath = join(process.cwd(), 'dist', 'package.json');

    when('[t0] dist/package.json is read', () => {
      then('it declares type commonjs (silences MODULE_TYPELESS_PACKAGE_JSON)', () => {
        const parsed = JSON.parse(readFileSync(distPackageJsonPath, 'utf8'));
        expect(parsed.type).toEqual('commonjs');
      });
    });
  });
});
