/**
 * .what = the file names of a brain dir's settings layout
 * .why = `settings.of.repo.json` is the one real settings file rhachet owns; claude's fixed
 *        name `settings.json` is an arrow to the grove
 *        (define.brain-dir-layout-is-one-for-every-actor)
 * .note = `home` is a path, relative to the brain dir: the one link that names this box. it
 *         mirrors `~/.claude/settings.json` under `.home/`, so the grove arrow's target reads
 *         as "this machine's home claude settings" and holds the same bytes on every box
 */
export const CLAUDE_SETTINGS_FILENAMES = {
  repo: 'settings.of.repo.json',
  grove: 'settings.of.grove.json',
  claude: 'settings.json',
  home: '.home/.claude/settings.json',
} as const;

/**
 * .what = the file names of a brain dir's keybindings arrows
 * .why = claude reads `keybindings.json` from its config dir, and a clone spawns with its actor's
 *        brain dir as that dir; the arrows hand it the human's `~/.claude/keybindings.json`
 * .note = `home` mirrors the settings `home`: the one name that names this box, under `.home/`
 * .note = claude's file names, so the adapter owns them; only core's layout reads them, through
 *   `claudeCodeSettings.ts`, so the package index does not export them
 */
export const CLAUDE_KEYBINDINGS_FILENAMES = {
  claude: 'keybindings.json',
  home: '.home/.claude/keybindings.json',
} as const;
