import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type { ClaudeCodeSettings } from '@src/domain.operations/brains/claudeCodeSettings';

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { sep } from 'node:path';
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
  }).flatMap((layer) => {
    const settings = getOneLayerSettings({ layer });
    if (settings === null) return [];
    return getAllHooksOfUnenrolledRoles({ settings, roles: input.roles }).map(
      (hook) => ({
        ...hook,
        source: layer.source,
        path: realpathSync(layer.path),
      }),
    );
  });
  if (leaks.length === 0) return;

  // a leak that lives under the human's home is theirs to fix; any other is rhachet's
  const homeReal = existsSync(input.home)
    ? realpathSync(input.home)
    : input.home;
  const isFromHome = leaks.every((leak) =>
    leak.path.startsWith(`${homeReal}${sep}`),
  );
  const message = 'a clone would load hooks from roles it is not enrolled in';
  const metadata = { rolesEnrolled: input.roles, leaks };

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
      hint: 'your home claude settings hold role hooks; remove every hook whose `author` names a `role=` from the file(s) above, then enroll again',
    });
  throw new MalfunctionError(message, {
    ...metadata,
    hint: 'run `rhx init --hooks` to rewrite each actor brain dir; if it persists, the settings layout or the role filter is broken — report it with the leaks above',
  });
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
