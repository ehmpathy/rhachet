import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getNamesOfExports } from '@src/.test/infra/getNamesOfExports';
import type { LiveBrainRegistry } from '@src/.test/infra/liveBrainRegistry';

/**
 * .what = every export of a 'names' module that the registry classifies neither live nor stub,
 *   and every registered module absent from disk
 * .why = a 'names' module serves stub suites too, so only its live names mark a suite live; a
 *   new export must be classified before a suite can use it, or a live entry point would pass
 *   the scan as a stub
 */
export const getAllInfraModuleExportsUnclassified = (input: {
  cwd: string;
  registry: LiveBrainRegistry;
}): { path: string; names: string[] }[] =>
  input.registry.infraModules
    .map((module) => {
      // a registered module that moved or was deleted leaves its entry stale, whatever its reach
      const pathAbsolute = join(input.cwd, module.path);
      if (!existsSync(pathAbsolute)) return { path: module.path, names: ['<module absent>'] };

      // only a 'names' module has exports to classify
      if (module.reach !== 'names') return { path: module.path, names: [] };

      // each export the registry has not classified
      const classified = new Set([...module.live, ...module.stub]);
      const names = getNamesOfExports({
        content: readFileSync(pathAbsolute, 'utf8'),
      }).filter((name) => !classified.has(name));
      return { path: module.path, names };
    })
    .filter((module) => module.names.length > 0);
