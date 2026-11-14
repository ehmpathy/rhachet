import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { genTempDir } from 'test-fns';

/**
 * .what = an env whose HOME is a fresh temp dir, with the grove (`~/.claude/settings.json`)
 *   either present or absent as the case declares, and pnpm's store and cache left on the
 *   host
 *
 * .why = the brain dir layout reads the grove off HOME. with the host HOME, a report row
 *   reads `settings.json → settings.of.grove.json` on a box that holds a grove and `this box
 *   has no ~/.claude/settings.json` on one that does not — so a snapshot taken on a dev box
 *   goes red on a ci runner. a pinned HOME makes the grove a fact of the case, never of the box
 *
 * .why the XDG dirs stay on the host = pnpm keeps its store and cache under HOME; a fresh HOME
 *   would force a cold install of every package an upgrade case adds
 *
 * .note = pin one per scene, never one per call: the grove leaf in a brain dir points at
 *   `<HOME>/.claude/settings.json`, so a rerun under a new HOME would re-point it, and a case
 *   that asserts a silent rerun would read a change it never made
 */
export const genHomeWithGroveState = (input: {
  slug: string;
  grove: 'present' | 'absent';
}): Record<string, string> => {
  // the temp home, with the grove written when the case declares one
  const home = genTempDir({ slug: input.slug });
  if (input.grove === 'present') {
    mkdirSync(join(home, '.claude'), { recursive: true });
    writeFileSync(join(home, '.claude', 'settings.json'), '{}\n');
  }

  // the host's XDG dirs, so pnpm reuses its warm store and cache
  const hostHome = process.env.HOME ?? homedir();
  return {
    HOME: home,
    XDG_DATA_HOME: process.env.XDG_DATA_HOME ?? join(hostHome, '.local', 'share'),
    XDG_CACHE_HOME: process.env.XDG_CACHE_HOME ?? join(hostHome, '.cache'),
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME ?? join(hostHome, '.config'),
  };
};
