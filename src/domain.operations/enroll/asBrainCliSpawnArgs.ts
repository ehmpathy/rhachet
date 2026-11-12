/**
 * .what = the brain-cli flag that carries the actor's boot as the whole system prompt
 */
export const BRAIN_CLI_BOOT_FLAG = '--system-prompt-file';

/**
 * .what = build the child-cli spawn argv for an enroll — the fixed
 *   `--setting-sources user --settings <configPath> --system-prompt-file <bootMdPath>`
 *   prefix, then the brain's own passthrough args
 * .why =
 *   - the flag ORDER is a contract with the brain cli: claude reads
 *     `--setting-sources user` to scope the config source, THEN
 *     `--settings <path>` to load the actor's `settings.of.repo.json`. a reorder or a
 *     dropped flag silently breaks enrollment (the wrong config, or none), so
 *     the sequence deserves ONE named owner + a unit clamp on its exact order
 *   - `user` must stay: user scope is the actor's brain dir, whose `settings.json` is
 *     the grove (define.brain-dir-layout-is-one-for-every-actor)
 *   - `project` and `local` stay OFF: claude looks both up relative to the cwd, and a
 *     clone's cwd is the repo — so either would reach the repo actor's brain dir via
 *     `<repo>/.claude`, a second dir beside the clone's own
 *   - `--settings` outranks the user source, so the repo outranks the grove
 *   - `--system-prompt-file <boot.md>` makes the actor's boot the whole system prompt.
 *     claude caches the system block ahead of every per-session value (cwd, hook
 *     output, git status, the prompt), so a new session of the same role set reads the
 *     boot from cache. as `CLAUDE.md` memory it sat after those values, and a new
 *     session could read it only if its whole first message matched an earlier one.
 *     the vendor default prompt is replaced, so rhachet owns the boot context whole
 *
 * .note = `asBrainCliSpawnEnv` switches the `CLAUDE.md` door off whenever this argv
 *   carries `BRAIN_CLI_BOOT_FLAG`, so the boot loads once. the argv carries the path; only the file's bytes reach the api
 * .note = pure: the passthrough is already stripped of enroll-owned flags by
 *   getBrainCliPassthroughArgs; this only prepends the fixed prefix, so the order is
 *   deterministic and testable without a spawn
 */
export const asBrainCliSpawnArgs = (input: {
  configPath: string;
  bootMdPath: string;
  passthrough: string[];
}): string[] => [
  '--setting-sources',
  'user',
  '--settings',
  input.configPath,
  BRAIN_CLI_BOOT_FLAG,
  input.bootMdPath,
  ...input.passthrough,
];
