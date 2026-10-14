import { join } from 'node:path';

/**
 * .what = one settings file the brain cli will read at spawn, and the source that reads it
 */
export interface BrainCliSettingsLayer {
  source: 'user' | 'project' | 'local' | 'flag';
  path: string;
}

/**
 * .what = every settings file claude will merge for a spawn, read off the spawn argv itself
 * .why = claude MERGES hooks across every source it reads, so a clone's effective hooks are
 *   the union of these files. read off the argv the spawn will pass, never off a constant, so
 *   the guard that scans them cannot drift from the sources the clone actually loads
 *
 * .note = claude's map, for a cwd and a CLAUDE_CONFIG_DIR:
 *   - `user`    → `$CLAUDE_CONFIG_DIR/settings.json`
 *   - `project` → `<cwd>/.claude/settings.json`
 *   - `local`   → `<cwd>/.claude/settings.local.json`
 *   - each `--settings <path>` → that path
 * .note = no `--setting-sources` flag means claude reads all three sources
 */
export const getAllBrainCliSettingsLayers = (input: {
  args: string[];
  brainDir: string;
  cwd: string;
}): BrainCliSettingsLayer[] => {
  // the sources named by every `--setting-sources` value, spaced or `=` inline
  const sourcesNamed = getAllFlagValues({
    args: input.args,
    flag: '--setting-sources',
  }).flatMap((value) => value.split(',').map((part) => part.trim()));
  const sources = new Set(
    sourcesNamed.length > 0 ? sourcesNamed : ['user', 'project', 'local'],
  );

  // map each named source to the file claude reads for it
  const layersOfSources: BrainCliSettingsLayer[] = [
    ...(sources.has('user')
      ? [
          {
            source: 'user' as const,
            path: join(input.brainDir, 'settings.json'),
          },
        ]
      : []),
    ...(sources.has('project')
      ? [
          {
            source: 'project' as const,
            path: join(input.cwd, '.claude', 'settings.json'),
          },
        ]
      : []),
    ...(sources.has('local')
      ? [
          {
            source: 'local' as const,
            path: join(input.cwd, '.claude', 'settings.local.json'),
          },
        ]
      : []),
  ];

  // every `--settings` file is a layer of its own
  const layersOfFlags = getAllFlagValues({
    args: input.args,
    flag: '--settings',
  }).map((path) => ({ source: 'flag' as const, path }));

  return [...layersOfSources, ...layersOfFlags];
};

/**
 * .what = every value a flag carries in an argv, spaced (`--f v`) or inline (`--f=v`)
 */
const getAllFlagValues = (input: { args: string[]; flag: string }): string[] =>
  input.args.flatMap((token, index) => {
    if (token === input.flag) {
      const value = input.args[index + 1];
      return value === undefined ? [] : [value];
    }
    if (token.startsWith(`${input.flag}=`))
      return [token.slice(input.flag.length + 1)];
    return [];
  });
