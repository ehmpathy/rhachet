import { given, then, useBeforeAll, when } from 'test-fns';

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = a call-site inventory guard: every domain caller that persists the host
 *         manifest via `daoKeyrackHostManifest.set` must pass `.recipients` THROUGH
 *         unchanged — the ONLY files allowed to construct a fresh `recipients:` set
 *         beside a `.set` call are the sealed choke point and the genesis init
 * .why  = os.secure blobs seal to the SAME recipients as the manifest
 *         (rule.require.os-secure-seals-to-host-manifest). so a recipient change on
 *         an extant manifest MUST re-key every blob in the same op — the exact job
 *         of setKeyrackManifestRecipientsSealed. a future caller that re-keys the
 *         manifest then calls `daoKeyrackHostManifest.set` DIRECTLY would reopen the
 *         2026-07-30 brick (manifest on the new recipient, credentials stranded on
 *         the old). no structure stops that today; this test IS that structure
 *         (r11 finding-2; rule.require.solve-at-cause)
 *
 * .note = this is the domain-layer inventory the dream calls for — NOT a guard pushed
 *         into the dao, which would break directional-deps. it reads source text, so
 *         it is an integration test (a filesystem boundary)
 * .note = the allowlist holds the TWO legitimate direct recipients-writers:
 *           - setKeyrackManifestRecipientsSealed.ts — the choke point (re-key + re-seal)
 *           - initKeyrack.ts — genesis (mints the manifest's first recipient; no prior
 *             os.secure blobs are present to strand)
 *         a new entry here demands the same justification: it either IS the choke point,
 *         or it creates the manifest from scratch
 */

// the two files permitted to construct a fresh recipients set beside a `.set` call
const ALLOWLIST = ['setKeyrackManifestRecipientsSealed.ts', 'initKeyrack.ts'];

// enumerate every non-test .ts under the keyrack bounded context
const asKeyrackSourceFiles = (): string[] => {
  const root = __dirname;
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter((rel) => rel.endsWith('.ts'))
    .filter((rel) => !rel.includes('.test.'))
    .map((rel) => join(root, rel));
};

describe('setKeyrackManifestRecipientsSealed call-site inventory', () => {
  given('every domain file that persists the host manifest', () => {
    const scene = useBeforeAll(async () => {
      // the files that call daoKeyrackHostManifest.set, minus the allowlist
      const callers = asKeyrackSourceFiles()
        .map((path) => ({ path, source: readFileSync(path, 'utf8') }))
        .filter((file: { path: string; source: string }) =>
          file.source.includes('daoKeyrackHostManifest.set'),
        )
        .filter(
          (file: { path: string; source: string }) =>
            !ALLOWLIST.some((name) => file.path.endsWith(name)),
        );
      return { callers };
    });

    when('inspected for a fresh recipients construction beside the set', () => {
      then('at least one caller is present to inspect (sanity)', () => {
        // setKeyrackKeyHost + delKeyrackKeyHost persist the manifest as pass-through,
        // so the filtered set is non-empty — proves the guard has real subjects
        expect(scene.callers.length).toBeGreaterThan(0);
      });

      then('none constructs a fresh recipients: set', () => {
        // a `recipients:` object-literal key beside a `.set` is a recipient change
        // routed AROUND the choke point — the brick. pass-through spreads
        // (`...hostManifest`) carry recipients WITHOUT this key, so they pass
        const offenders = scene.callers.filter((file) =>
          /\brecipients:/.test(file.source),
        );
        expect(offenders.map((f) => f.path)).toEqual([]);
      });
    });
  });
});
