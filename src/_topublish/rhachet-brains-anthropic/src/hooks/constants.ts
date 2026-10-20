/**
 * .what = the file names of a brain dir's settings layout
 * .why = `settings.of.repo.json` is the one real settings file rhachet owns; claude's fixed
 *        names are arrows — `settings.json` to the grove, `settings.local.json` to the repo
 *        (define.brain-dir-layout-is-one-for-every-actor)
 * .note = `home` is a path, relative to the brain dir: the one link that names this box. it
 *         mirrors `~/.claude/settings.json` under a real `.home/` dir, so the grove arrow's
 *         target reads as "this machine's home claude settings" and holds the same bytes on
 *         every box. `.home` is a real dir, never an arrow to the home dir, so no tool that
 *         follows links can walk into the home
 */
export const CLAUDE_SETTINGS_FILENAMES = {
  repo: 'settings.of.repo.json',
  grove: 'settings.of.grove.json',
  claude: 'settings.json',
  home: '.home/.claude/settings.json',
  local: 'settings.local.json',
} as const;
