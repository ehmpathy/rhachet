/**
 * .what = the file names of a brain dir's settings layout
 * .why = `settings.of.repo.json` is the one real settings file rhachet owns; claude's fixed
 *        name `settings.json` is an arrow to the grove
 *        (define.brain-dir-layout-is-one-for-every-actor)
 */
export const CLAUDE_SETTINGS_FILENAMES = {
  repo: 'settings.of.repo.json',
  grove: 'settings.of.grove.json',
  claude: 'settings.json',
} as const;
