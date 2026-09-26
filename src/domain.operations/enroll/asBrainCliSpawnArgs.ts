/**
 * .what = build the child-cli spawn argv for an enroll — the fixed
 *   `--setting-sources user,local --settings <configPath>` prefix, then the brain's
 *   own passthrough args
 * .why =
 *   - the flag ORDER is a contract with the brain cli: claude reads
 *     `--setting-sources user,local` to scope the config source, THEN
 *     `--settings <path>` to load the per-enrollment config. a reorder or a
 *     dropped flag silently breaks enrollment (the wrong config, or none), so
 *     the sequence deserves ONE named owner + a unit clamp on its exact order
 *   - `user` must stay: claude ties user-scope memory to the user source, and the
 *     actor's boot corpus loads as user memory (`CLAUDE_CONFIG_DIR/CLAUDE.md`). under
 *     `local` alone a clone boots with no corpus (D9, measured by M1). user scope is
 *     the actor's brain dir, never the human's `~/.claude`
 *   - `--system-prompt ''` empties the brain cli's default system prompt. rhachet owns
 *     the boot context: the actor's corpus arrives via CLAUDE.md, never via vendor
 *     defaults. an empty prompt holds no per-machine section, so it caches whole —
 *     which is why `--exclude-dynamic-system-prompt-sections` (ignored under
 *     `--system-prompt`) is absent. the value is constant, so a `--resume` that
 *     reuses the original prompt cannot drift from the actor
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
  'user,local',
  '--settings',
  input.configPath,
  '--system-prompt',
  '',
  ...input.passthrough,
];
