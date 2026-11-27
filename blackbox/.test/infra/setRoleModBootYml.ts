import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { asModsPath } from './asModsPath';

/**
 * .what = write the boot.yml of one role's mod, its dir made where absent
 * .why = a mods suite rewrites a mod spec to break or cure it; one writer keeps each suite's
 *        spec shape the same
 */
export const setRoleModBootYml = async (input: {
  repo: string;
  role: string;
  lines: string[];
}): Promise<void> => {
  const pathSpec = asModsPath({
    repo: input.repo,
    rel: path.join(`role=${input.role}`, 'boot.yml'),
  });
  await fs.mkdir(path.dirname(pathSpec), { recursive: true });
  await fs.writeFile(pathSpec, `${input.lines.join('\n')}\n`);
};
