import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = write `.agent/actors.yml` into a fixture repo, one yaml line per entry
 * .why = every blackbox suite under a manifest writes this one file; one home for it, so a
 *        format change lands once (rule.require.shared-test-fixtures)
 */
export const setActorsYml = (input: { dir: string; lines: string[] }): void => {
  mkdirSync(join(input.dir, '.agent'), { recursive: true });
  writeFileSync(join(input.dir, '.agent', 'actors.yml'), input.lines.join('\n'));
};
