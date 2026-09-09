/**
 * .what = the body of a HOST keyrack.manifest.json that holds two addressable full slugs
 *         beside two rows no scope flag can address
 * .why = the premise of `keyrack.unscopable-rows.acceptance.test.ts`: a filter must drop a row
 *        it cannot address AND say so, rather than drop it in silence
 *        (define.invariant.empty-render-names-its-cause)
 *
 * .why-a-generator-rather-than-a-static-asset = `KeyrackKeyHost` requires `createdAt`/`updatedAt`,
 *        and a committed `.json` that carries them trips `.husky/check.timestamps.sh` — which
 *        exempts `.ts` and `.sh` precisely because code legitimately carries time logic. so the
 *        manifest is BUILT here rather than vendored, which also matches the extant pattern this
 *        wish already set with `genBrokenKeyrackManifestYml`
 *
 * .note = the timestamp is FIXED rather than `now()`. a fixture is an input, so determinism is
 *         the whole point — a `now()` here would make each run's asset differ from the last and
 *         reintroduce the drift the husky rule exists to stop
 * .note = the two unaddressable rows differ ON PURPOSE. `LEGACY_KEY` carries one segment and
 *         names no org at all; `testorg.mainframe.OTHER_KEY` carries three and STILL names no
 *         env, because `mainframe` is not a valid env. the pair pins the VALIDATED decoder as
 *         the rule rather than a `split('.').length` shortcut — a row can look like a slug and
 *         not be one
 */
const STAMP_FIXED = '2026-01-01T00:00:00.000Z';

const asHostRow = (input: {
  slug: string;
  env: string | null;
  org: string | null;
}) => ({
  slug: input.slug,
  mech: 'PERMANENT_VIA_REPLICA',
  vault: 'os.direct',
  exid: null,
  ...(input.env ? { env: input.env } : {}),
  ...(input.org ? { org: input.org } : {}),
  createdAt: STAMP_FIXED,
  updatedAt: STAMP_FIXED,
});

export const genUnscopableKeyrackHostManifest = (): string =>
  JSON.stringify(
    {
      uri: 'file://~/.rhachet/keyrack.manifest.json',
      hosts: {
        // the two ADDRESSABLE rows — a filter can name either
        'testorg.prep.API_KEY': asHostRow({
          slug: 'testorg.prep.API_KEY',
          env: 'prep',
          org: 'testorg',
        }),
        'testorg.test.API_KEY': asHostRow({
          slug: 'testorg.test.API_KEY',
          env: 'test',
          org: 'testorg',
        }),

        // the two UNADDRESSABLE rows — no scope flag reaches either
        LEGACY_KEY: asHostRow({ slug: 'LEGACY_KEY', env: null, org: null }),
        'testorg.mainframe.OTHER_KEY': asHostRow({
          slug: 'testorg.mainframe.OTHER_KEY',
          env: null,
          org: null,
        }),
      },
    },
    null,
    2,
  );
