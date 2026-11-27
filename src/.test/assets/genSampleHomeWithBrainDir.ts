import { genTempDir } from 'test-fns';

import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = a temp repo root, a temp home and an empty actor brain dir beside it; the home holds a grove
 *   (`~/.claude/settings.json`) and a keybindings file (`~/.claude/keybindings.json`), each written
 *   with its given content only when its own input is non-null
 * .why = the settings layout suites all start here: the grove and keybindings arrows point into this
 *   home, and the brain dir is where the layout lands. one generator keeps the two in one shape
 *   (rule.require.shared-test-fixtures)
 *
 * .note = the paths are realpaths, so an arrow target a suite reads back compares equal to the
 *   one it computed
 */
export const genSampleHomeWithBrainDir = (input: {
  slug: string;
  grove: string | null;
  keybindings: string | null;
}): { repoPath: string; home: string; brainDir: string } => {
  const root = realpathSync(genTempDir({ slug: input.slug }));
  const home = join(root, 'home');
  const brainDir = join(root, 'actor', 'brain', '.claude');
  mkdirSync(join(home, '.claude'), { recursive: true });
  mkdirSync(brainDir, { recursive: true });
  if (input.grove !== null)
    writeFileSync(join(home, '.claude', 'settings.json'), input.grove);
  if (input.keybindings !== null)
    writeFileSync(join(home, '.claude', 'keybindings.json'), input.keybindings);
  return { repoPath: root, home, brainDir };
};
