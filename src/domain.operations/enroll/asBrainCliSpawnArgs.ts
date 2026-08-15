/**
 * .what = build the child-cli spawn argv for an enroll — the fixed
 *   `--setting-sources local --settings <configPath>` prefix, then the brain's
 *   own passthrough args
 * .why =
 *   - the flag ORDER is a contract with the brain cli: claude reads
 *     `--setting-sources local` to scope the config source, THEN
 *     `--settings <path>` to load the per-enrollment config. a reorder or a
 *     dropped flag silently breaks enrollment (the wrong config, or none), so
 *     the sequence deserves ONE named owner + a unit clamp on its exact order
 *   - inlined in the invoker the array was a hardcoded flag sequence with no
 *     test seam (decode-friction); named here, the contract is locked once
 *     (rule.require.named-transformers)
 *
 * .note = pure: the passthrough is already stripped of enroll-owned flags by
 *   getBrainCliPassthroughArgs; this only prepends the fixed config prefix, so
 *   the order is deterministic and testable without a spawn
 */
export const asBrainCliSpawnArgs = (input: {
  configPath: string;
  passthrough: string[];
}): string[] => [
  '--setting-sources',
  'local',
  '--settings',
  input.configPath,
  ...input.passthrough,
];
