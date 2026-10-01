import { join } from 'node:path';

/**
 * .what = the path of the box's one claude login, under the given home
 * .why = every clone spawns with CLAUDE_SECURESTORAGE_CONFIG_DIR='', which keys the
 *        login by `~/.claude` — so one name owns where that login lives
 */
export const getBrainAuthPath = (input: { home: string }): string =>
  join(input.home, '.claude', '.credentials.json');
