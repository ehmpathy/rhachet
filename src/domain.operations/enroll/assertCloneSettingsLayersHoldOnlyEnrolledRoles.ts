import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';
import type { ClaudeCodeSettings } from '@src/domain.operations/brains/claudeCodeSettings';
import { asHookDispatchRulesFromManifestText } from '@src/domain.operations/brains/dispatch/asHookDispatchRulesFromManifestText';
import { asManifestPathOfHookDispatcherCommand } from '@src/domain.operations/brains/dispatch/asManifestPathOfHookDispatcherCommand';
import { HOOK_DISPATCH } from '@src/domain.operations/brains/dispatch/constants';

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, sep } from 'node:path';
import {
  type BrainCliSettingsLayer,
  getAllBrainCliSettingsLayers,
} from './getAllBrainCliSettingsLayers';
import { getAllHooksOfUnenrolledRoles } from './getAllHooksOfUnenrolledRoles';

/**
 * .what = refuse a spawn whose clone would load a hook from a role it is not enrolled in
 * .why = 🔴 core invariant: a clone runs its OWN roles' hooks, from every layer, and no
 *   other's. claude merges hooks across every settings source it reads, so a filtered
 *   `--settings` file proves naught while a user or local layer still carries the full set.
 *   measured on v1.49.1: `rhx enroll claude --roles -driver` booted the driver's hooks,
 *   because the actor's `settings.json` held every linked role's hooks. this guard reads
 *   every layer the spawn argv names and fails before the brain starts
 *   (`inventory.of=requirements.case=9`)
 *
 * .note = a leak from a file under the human's home is theirs to fix (their grove holds a
 *   role hook), so it is a ConstraintError; a leak from any file rhachet wrote is a
 *   MalfunctionError
 */
export const assertCloneSettingsLayersHoldOnlyEnrolledRoles = (input: {
  args: string[];
  brainDir: string;
  cwd: string;
  roles: string[];
  home: string;
}): void => {
  // gather every hook a non-enrolled role authored, across every layer claude will read
  const leaks = getAllBrainCliSettingsLayers({
    args: input.args,
    brainDir: input.brainDir,
    cwd: input.cwd,
  }).flatMap((layer) =>
    getAllLeaksOfLayer({ layer, roles: input.roles, cwd: input.cwd }),
  );
  if (leaks.length === 0) return;

  // a leak that lives under the human's home is theirs to fix; any other is rhachet's
  const homeReal = existsSync(input.home)
    ? realpathSync(input.home)
    : input.home;
  const isFromHome = leaks.every((leak) =>
    leak.path.startsWith(`${homeReal}${sep}`),
  );
  // a settings leak keeps its hint; a manifest leak also names the manifest row to drop
  const isFromManifest = leaks.some((leak) => leak.isOfManifest);
  const message = 'a clone would load hooks from roles it is not enrolled in';
  const metadata = {
    rolesEnrolled: input.roles,
    leaks: leaks.map(({ isOfManifest: _, ...leak }) => leak),
  };

  // rhachet spawns with the `user` source alone, so a project or local layer is read only
  //   because the human's passthrough named it — the cause is their flag, never rhachet
  const isFromPassthroughSource = leaks.some(
    (leak) => leak.source === 'project' || leak.source === 'local',
  );
  if (isFromPassthroughSource)
    throw new ConstraintError(message, {
      ...metadata,
      hint: 'a passthrough `--setting-sources` named `project` or `local`, which reach the repo actor settings with every linked role; drop that flag, or enroll with the roles those hooks name',
    });

  if (isFromHome)
    throw new ConstraintError(message, {
      ...metadata,
      hint: isFromManifest
        ? 'your home claude settings hold role hooks, or name a hook dispatcher whose manifest holds role rules; remove every hook or manifest row whose `author` names a `role=` from each file in `leaks`, then enroll again'
        : 'your home claude settings hold role hooks; remove every hook whose `author` names a `role=` from the file(s) above, then enroll again',
    });
  throw new MalfunctionError(message, {
    ...metadata,
    hint: 'run `rhx init --hooks` to rewrite each actor brain dir; if it persists, the settings layout or the role filter is broken — report it with the leaks above',
  });
};

/**
 * .what = every hook of one layer a non-enrolled role authored: the layer's own hooks, plus each
 *   rule of each dispatch manifest its dispatcher hooks name
 * .why = a dispatcher hook runs every rule of its manifest, so each rule is a hook the clone loads
 */
const getAllLeaksOfLayer = (input: {
  layer: BrainCliSettingsLayer;
  roles: string[];
  cwd: string;
}): Array<{
  event: string;
  author: string;
  source: string;
  path: string;
  isOfManifest: boolean;
}> => {
  const settings = getOneLayerSettings({ layer: input.layer });
  if (settings === null) return [];
  const sources = [
    { settings, path: input.layer.path, isOfManifest: false },
    ...getAllManifestPathsOfDispatchers({ settings, cwd: input.cwd }).map(
      (path) => ({
        settings: asSettingsOfManifestRules({
          rules: getAllManifestRules({ path }),
        }),
        path,
        isOfManifest: true,
      }),
    ),
  ];
  return sources.flatMap((each) =>
    getAllHooksOfUnenrolledRoles({
      settings: each.settings,
      roles: input.roles,
    }).map((hook) => ({
      ...hook,
      source: input.layer.source,
      path: realpathSync(each.path),
      isOfManifest: each.isOfManifest,
    })),
  );
};

/**
 * .what = the path of each dispatch manifest a layer's dispatcher hooks name, when present
 * .why = a dispatcher hook carries no role author; the roles it runs sit in its manifest
 *
 * .note = claude runs a dispatcher from the spawn cwd, so a relative manifest path is taken
 *   from there
 * .note = an absent manifest holds no rule; the dispatcher itself fails closed on it
 */
const getAllManifestPathsOfDispatchers = (input: {
  settings: ClaudeCodeSettings;
  cwd: string;
}): string[] => {
  const paths = Object.values(input.settings.hooks ?? {})
    .flatMap((entries) => entries ?? [])
    .flatMap((entry) => entry.hooks ?? [])
    .filter((hook) => hook.author === HOOK_DISPATCH.author)
    .map((hook) => {
      const pathNamed = asManifestPathOfHookDispatcherCommand({
        command: hook.command,
      });
      return isAbsolute(pathNamed) ? pathNamed : join(input.cwd, pathNamed);
    });
  return [...new Set(paths)].filter((path) => existsSync(path));
};

/**
 * .what = the rules of one dispatch manifest, read from disk
 * .note = a sync read, as this guard runs sync before the spawn; the async
 *   `getOneHookDispatchManifest` reads the same bytes with the same parse
 */
const getAllManifestRules = (input: { path: string }): HookDispatchRule[] =>
  asHookDispatchRulesFromManifestText({
    text: readFileSync(input.path, 'utf-8'),
    path: input.path,
  });

/**
 * .what = the rules of one dispatch manifest, in the shape of a settings file's hooks
 * .why = so the one author check reads a manifest rule exactly as it reads a settings hook
 */
const asSettingsOfManifestRules = (input: {
  rules: HookDispatchRule[];
}): ClaudeCodeSettings => {
  const { rules } = input;
  return {
    hooks: Object.fromEntries(
      [...new Set(rules.map((rule) => rule.event))].map((event) => [
        event,
        rules
          .filter((rule) => rule.event === event)
          .map((rule) => ({
            matcher: rule.matcher,
            hooks: [
              { type: 'command', command: rule.command, author: rule.author },
            ],
          })),
      ]),
    ),
  };
};

/**
 * .what = the parsed settings of one layer, or null when the file is absent
 * .note = existsSync follows a link, so a grove arrow to an absent home file reads as absent,
 *   which claude also treats as an empty layer
 */
const getOneLayerSettings = (input: {
  layer: BrainCliSettingsLayer;
}): ClaudeCodeSettings | null => {
  if (!existsSync(input.layer.path)) return null;
  const content = readFileSync(input.layer.path, 'utf-8');
  try {
    return JSON.parse(content) as ClaudeCodeSettings;
  } catch (error) {
    throw new ConstraintError(
      'a settings layer the clone reads is not valid json',
      {
        source: input.layer.source,
        path: input.layer.path,
        cause: error instanceof Error ? error : undefined,
        hint: 'fix the json in that file; the brain cli would fail to read it too',
      },
    );
  }
};
