import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { asLiveBrainMarkersOfRegistry } from '@src/.test/infra/asLiveBrainMarkersOfRegistry';
import { getAllTestFilePaths } from '@src/.test/infra/getAllTestFilePaths';
import { getCauseOfSuiteUngated } from '@src/.test/infra/getCauseOfSuiteUngated';
import { getContentOfSuiteRunAtCollection } from '@src/.test/infra/getContentOfSuiteRunAtCollection';
import { getMarkersOfContent } from '@src/.test/infra/getMarkersOfContent';
import type { LiveBrainRegistry } from '@src/.test/infra/liveBrainRegistry';

/**
 * .what = every test file under `cwd` that reaches a live brain and is not wholly gated, bar
 *   the registry's named exceptions
 * .why = the clamp on rule.forbid.live-brain-spend-beyond-the-smoke-tier: a new live suite that
 *   forgets the gate bills every push, so the scan names it before it merges
 * .note = an exception passes only the markers it allows; one of another shape is named, and
 *   so is an exception whose file is gone, so a new file at its path cannot inherit the pass
 */
export const getAllLiveBrainSuitesUngated = (input: {
  cwd: string;
  registry: LiveBrainRegistry;
}): { path: string; markers: string[]; cause: string }[] => {
  // find every test file jest runs
  const paths = getAllTestFilePaths({ cwd: input.cwd });
  // a suite is read for every marker; a 'remote' one only where a remote call may sit
  const markersAll = asLiveBrainMarkersOfRegistry({ registry: input.registry });
  const markersLocal = markersAll.filter((marker) => marker.scope !== 'remote');
  const getMarkersOfSuite = (path: string): typeof markersAll =>
    /\.(integration|acceptance)\.test\.ts$/.test(path) ? markersAll : markersLocal;

  // at collection, a live name that only builds a lazy value reaches no brain, so it is left out
  const markersAtCollectionAll = asLiveBrainMarkersOfRegistry({
    registry: {
      ...input.registry,
      infraModules: input.registry.infraModules.map((module) =>
        module.reach === 'names'
          ? { ...module, live: module.live.filter((name) => !module.lazy.includes(name)) }
          : module,
      ),
    },
  });
  const getMarkersAtCollectionOfSuite = (path: string): typeof markersAll =>
    /\.(integration|acceptance)\.test\.ts$/.test(path)
      ? markersAtCollectionAll
      : markersAtCollectionAll.filter((marker) => marker.scope !== 'remote');

  // keep each file that holds a marker and is not wholly gated, or that runs one at collection
  //   beside its gate, bar a named exception
  const suitesUngated = paths
    .filter((path) => !(path in input.registry.suiteExceptions))
    .map((path) => {
      const content = readFileSync(join(input.cwd, path), 'utf8');
      const markers = getMarkersOfSuite(path);
      const causeOfShape = getCauseOfSuiteUngated({ content });
      if (causeOfShape !== null)
        return { path, markers: getMarkersOfContent({ content, markers }), cause: causeOfShape };
      const markersAtCollection = getMarkersOfContent({
        content: getContentOfSuiteRunAtCollection({ content }),
        markers: getMarkersAtCollectionOfSuite(path),
      });
      return { path, markers: markersAtCollection, cause: CAUSE_SUITE_RUN_AT_COLLECTION };
    })
    .filter((suite) => suite.markers.length > 0);

  // keep each exception that is gone, that holds a marker it does not allow, or that allows a
  //   marker it no longer holds (a stale allowance would pass a later real call of that shape)
  const exceptionsOff = Object.entries(input.registry.suiteExceptions)
    .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
    .flatMap(([path, exception]) => {
      const pathAbsolute = join(input.cwd, path);
      if (!existsSync(pathAbsolute)) return [{ path, markers: [], cause: CAUSE_EXCEPTION_ABSENT }];
      const markersHeld = getMarkersOfContent({
        content: readFileSync(pathAbsolute, 'utf8'),
        markers: getMarkersOfSuite(path),
      });
      return [
        {
          path,
          markers: markersHeld.filter((name) => !exception.allows.includes(name)),
          cause: CAUSE_EXCEPTION_OVERREACH,
        },
        {
          path,
          markers: exception.allows.filter((name) => !markersHeld.includes(name)),
          cause: CAUSE_EXCEPTION_STALE,
        },
      ].filter((row) => row.markers.length > 0);
    });

  return [...suitesUngated, ...exceptionsOff];
};

/** the cause named for an exception that allows a marker its file no longer holds */
export const CAUSE_EXCEPTION_STALE =
  'a named exception that allows a marker its file no longer holds; remove the stale allowance from liveBrainRegistry.ts';

/** the cause named for a gated suite that reaches a brain in a top-level statement */
export const CAUSE_SUITE_RUN_AT_COLLECTION =
  'a statement that jest runs at collection (at the top level, or in a describe, given, when or gate body) reaches a live brain; move it into a then, a hook or a useBeforeAll (rule.forbid.live-brain-spend-beyond-the-smoke-tier)';

/** the cause named for an exception whose file is gone */
export const CAUSE_EXCEPTION_ABSENT =
  'a named exception whose file is absent; remove its entry from liveBrainRegistry.ts';

/** the cause named for an exception that holds a marker it does not allow */
export const CAUSE_EXCEPTION_OVERREACH =
  'a named exception that holds a marker its entry does not allow; gate the suite, or allow the marker in liveBrainRegistry.ts with a reason';
