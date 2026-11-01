import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { asLiveBrainMarkersOfRegistry } from '@src/.test/infra/asLiveBrainMarkersOfRegistry';
import { getAllLivePaths } from '@src/.test/infra/getAllLivePaths';
import { getMarkersOfContent } from '@src/.test/infra/getMarkersOfContent';
import type { LiveBrainRegistry } from '@src/.test/infra/liveBrainRegistry';

/**
 * .what = every non-test module under `cwd` that can reach a brain and is not registered
 * .why = a live call moved into test infra would hide from the suite scan, since the suite
 *   then holds no marker of its own. so:
 *   - a test-infra module (under a `.test/` dir) that holds ANY marker must be registered,
 *     a wrapper of a live name or of a live-only module included, so reach is transitive
 *   - a prod module may hold no 'everywhere' marker (a supplier import) at all
 * .note = test infra is read in every language it is written in: a `.cjs` probe or a `.sh`
 *   helper that calls a brain is a reach as much as a `.ts` module. fixture packages under a
 *   `node_modules/` are stub brains, never read
 */
export const getAllNonTestModulesReachUnregistered = (input: {
  cwd: string;
  registry: LiveBrainRegistry;
}): { path: string; markers: string[]; cause: string }[] => {
  // every code file of the one universe that is not a test, in any language
  const paths = getAllLivePaths({ cwd: input.cwd }).filter((path) => !path.endsWith('.test.ts'));
  const registered = new Map(input.registry.infraModules.map((module) => [module.path, module]));
  // a module is read for every marker but a 'remote' one, which is a suite's alone
  const markersAll = asLiveBrainMarkersOfRegistry({ registry: input.registry }).filter(
    (marker) => marker.scope !== 'remote',
  );
  const markersEverywhere = markersAll.filter((marker) => marker.scope === 'everywhere');

  // name each unregistered module by the markers it holds, and each 'none' module by the
  //   markers it holds beyond its `allows` and the allowances it no longer holds; an 'import'
  //   or 'names' module is live by its entry
  return paths.sort().flatMap((path) => {
    const entry = registered.get(path) ?? null;
    if (entry && entry.reach !== 'none') return [];
    const content = readFileSync(join(input.cwd, path), 'utf8');
    // only src/ holds prod code, so each module outside it is test infra (blackbox/, a skill
    //   under .agent/repo=.this/); under src/, a test helper lives in a .test/ or .test.assets/
    //   dir, since prod there may spawn claude
    const isTestInfra = !path.startsWith('src/') || /(^|\/)\.test(\.[^/]*)?\//.test(path);
    const markersHeld = getMarkersOfContent({
      content,
      markers: isTestInfra ? markersAll : markersEverywhere,
    });
    const allows = entry?.allows ?? [];
    return [
      {
        path,
        markers: markersHeld.filter((name) => !allows.includes(name)),
        cause: asCauseOfModuleReach({ isTestInfra, isRegistered: entry !== null }),
      },
      {
        path,
        markers: allows.filter((name) => !markersHeld.includes(name)),
        cause: CAUSE_MODULE_NONE_STALE,
      },
    ].filter((row) => row.markers.length > 0);
  });
};

/** the cause named for a module registered to reach no brain that allows a marker it lacks */
export const CAUSE_MODULE_NONE_STALE =
  'a module registered to reach no brain allows a marker it no longer holds; remove the stale allowance from liveBrainRegistry.ts';

/** the cause named for a test-infra module that can reach a brain and is not registered */
export const CAUSE_MODULE_UNREGISTERED =
  'a test-infra module that can reach a brain (any module outside src/, or under a .test/ dir in src/); register it in liveBrainRegistry.ts with its reach and reason (rule.forbid.live-brain-spend-beyond-the-smoke-tier)';

/** the cause named for a module registered to reach no brain that holds a marker it does not allow */
export const CAUSE_MODULE_NONE_OVERREACH =
  'a module registered to reach no brain holds a marker its entry does not allow; register its true reach, or allow the marker with a reason (rule.forbid.live-brain-spend-beyond-the-smoke-tier)';

/** the cause named for a prod module that imports a brain supplier */
export const CAUSE_MODULE_PROD_SUPPLIER =
  'a prod module that imports a brain supplier; reach a brain through genContextBrain discovery, never a direct import (rule.forbid.live-brain-spend-beyond-the-smoke-tier)';

/**
 * .what = the cause for a module the scan names, with its fix
 * .why = a red names what to do, not only where
 */
const asCauseOfModuleReach = (input: { isTestInfra: boolean; isRegistered: boolean }): string => {
  if (!input.isTestInfra) return CAUSE_MODULE_PROD_SUPPLIER;
  if (input.isRegistered) return CAUSE_MODULE_NONE_OVERREACH;
  return CAUSE_MODULE_UNREGISTERED;
};
