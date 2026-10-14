/**
 * .what = build the child-cli spawn argv for an enroll — the fixed
 *   `--setting-sources user --settings <configPath>` prefix, then the brain's
 *   own passthrough args
 * .why =
 *   - the flag ORDER is a contract with the brain cli: claude reads
 *     `--setting-sources user` to scope the config source, THEN
 *     `--settings <path>` to load the actor's `settings.of.repo.json`. a reorder or a
 *     dropped flag silently breaks enrollment (the wrong config, or none), so
 *     the sequence deserves ONE named owner + a unit clamp on its exact order
 *   - `user` must stay: claude ties user-scope memory to the user source, and the
 *     actor's boot corpus loads as user memory (`CLAUDE_CONFIG_DIR/CLAUDE.md`). user
 *     scope is the actor's brain dir, whose `settings.json` is the grove
 *     (define.brain-dir-layout-is-one-for-every-actor)
 *   - `project` and `local` stay OFF: claude looks both up relative to the cwd, and a
 *     clone's cwd is the repo — so either would reach the repo actor's brain dir via
 *     `<repo>/.claude`, a second dir beside the clone's own
 *   - `--settings` outranks the user source, so the repo outranks the grove
 *   - `--system-prompt ''` empties the brain cli's default system prompt. rhachet owns
 *     the boot context: the actor's corpus arrives via CLAUDE.md, never via vendor
 *     defaults. an empty prompt holds no per-machine section, so it caches whole —
 *     which is why `--exclude-dynamic-system-prompt-sections` (ignored under
 *     `--system-prompt`) is absent. the value is constant, so a `--resume` that
 *     reuses the original prompt cannot drift from the actor
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
  'user',
  '--settings',
  input.configPath,
  '--system-prompt',
  '',
  ...input.passthrough,
];
