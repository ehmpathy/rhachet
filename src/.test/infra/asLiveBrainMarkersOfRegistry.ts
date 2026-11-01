import type {
  LiveBrainMarker,
  LiveBrainRegistry,
} from '@src/.test/infra/liveBrainRegistry';

/**
 * .what = every marker a scan applies, from the registry: its own markers, one per module's
 *   live names, and one per import of a module whose every use is live
 * .why = the registry is the single source; a live name or a live-only module is a marker
 *   because it is registered, so no second list can drift from it
 * .note = an import marker matches the module path at the end of an import specifier, so an
 *   alias (`@/blackbox/...`) and a relative path (`./...`) both count; a non-ts module (a
 *   `.cjs` probe) is run by its file name, so any quoted string that ends in that name counts
 */
export const asLiveBrainMarkersOfRegistry = (input: {
  registry: LiveBrainRegistry;
}): LiveBrainMarker[] => [
  ...input.registry.markers,
  ...input.registry.infraModules.flatMap((module) =>
    module.reach === 'names' && module.live.length > 0
      ? [
          {
            name: `a live entry point of ${module.path}`,
            pattern: new RegExp(`\\b(${module.live.join('|')})\\b`),
            scope: 'tests' as const,
          },
        ]
      : [],
  ),
  ...input.registry.infraModules
    .filter((module) => module.reach === 'import')
    .map((module) => ({
      name: `an import of ${module.path}`,
      pattern: asPatternOfModuleUse({ path: module.path }),
      scope: 'tests' as const,
    })),
];

/**
 * .what = the pattern by which a test uses a module: an import of a ts module, or a quoted
 *   reference to the file name of a non-ts one
 * .why = a ts module is imported by a specifier with no extension; a probe is handed to node
 *   by its file name, so its name in a string is its use
 */
const asPatternOfModuleUse = (input: { path: string }): RegExp => {
  const fileName = input.path.replace(/^.*\//, '');
  if (fileName.endsWith('.ts'))
    return new RegExp(
      `(\\bfrom\\s*|\\brequire\\(\\s*|\\bimport\\(\\s*)['"\`][^'"\`]*\\/${fileName.replace(/\.ts$/, '')}['"\`]`,
    );
  return new RegExp(`['"\`/]${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`);
};
