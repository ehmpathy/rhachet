/**
 * .what = the file names of a brain dir's settings layout
 * .why = `settings.of.repo.json` is the one real settings file rhachet owns; claude's fixed
 *        names are arrows — `settings.json` to the grove, `settings.local.json` to the repo
 *        (define.brain-dir-layout-is-one-for-every-actor)
 * .note = `groveHome` is the one machine-local entry: a file arrow to `~/.claude/settings.json`
 *         under a real `.home/` dir, untracked. the tracked `grove` arrow points at it by this
 *         relative path, so its target reads the same on every box. `.home` is a real dir, never
 *         an arrow to the home dir, so no tool that follows links can walk into the home
 */
export const CLAUDE_SETTINGS_FILENAMES = {
  repo: 'settings.of.repo.json',
  grove: 'settings.of.grove.json',
  groveHome: '.home/.claude/settings.json',
  claude: 'settings.json',
  local: 'settings.local.json',
} as const;
