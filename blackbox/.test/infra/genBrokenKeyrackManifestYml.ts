/**
 * .what = the body of a repo keyrack.yml that CANNOT hydrate — it extends a file the repo
 *         does not vendor, so hydrateKeyrackRepoManifest throws 'extended keyrack not found'
 * .why = this is the premise of ehmpathy/rhachet#467, and it is the one part the cli clamp and
 *        the sdk clamp genuinely share. hand-written in each, the two could drift apart — and a
 *        clamp whose premise has drifted still passes while it proves something else entirely
 *        (rule.require.shared-test-fixtures: extract at 2+ files)
 *
 * .note = only the MANIFEST BODY is shared, never the repo around it. the two clamps need
 *         different bases and that difference is real: the cli clamp copies the
 *         `with-keyrack-manifest` fixture, because `keyrack set/unlock/list/status` need a host
 *         manifest and ssh keys; the sdk clamp needs `node_modules` symlinked so a spawned
 *         module can `import` the built dist. a single generator that served both would need a
 *         switch per difference — the signal that an abstraction came too early
 *         (rule.prefer.wet-over-dry)
 * .note = `org: testorg` matches the org the blackbox fixtures declare, so a repo-scoped ask
 *         against this manifest is a REAL ask that the broken extends then kills — which is
 *         what makes the guard rows of each clamp meaningful rather than incidental
 */
export const genBrokenKeyrackManifestYml = (input: {
  /**
   * .what = the key to declare under `env.test`, so a repo-scoped ask has a real target
   * .why = each clamp names its own, so two suites can run concurrently against one host
   *        without either one's os.direct entry serving the other's read
   */
  repoKey: string;
}): string => `org: testorg
extends:
  - .agent/does-not-exist/keyrack.yml

env.test:
  - ${input.repoKey}
`;
