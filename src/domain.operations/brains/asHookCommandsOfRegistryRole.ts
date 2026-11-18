import { MalfunctionError } from 'helpful-errors';

import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';

/**
 * .what = every hook command one role of a registry declares, on each brain event
 * .why = the read of a loaded registry is pure, so it is proven apart from the package load
 *
 * .note = a registry that lacks the role is an error, never an empty list: a caller could not
 *   tell "no hooks" from "unread"
 */
export const asHookCommandsOfRegistryRole = (input: {
  registry: Pick<RoleRegistry, 'slug' | 'roles'>;
  role: string;
}): { commands: string[]; error: null } | { commands: null; error: Error } => {
  const role = input.registry.roles.find((one) => one.slug === input.role);
  if (!role)
    return {
      commands: null,
      error: new MalfunctionError(
        `role ${input.role} not found in registry ${input.registry.slug}`,
      ),
    };

  // every command on every brain event
  const onBrain = role.hooks?.onBrain;
  if (!onBrain) return { commands: [], error: null };
  return {
    commands: [
      ...(onBrain.onBoot ?? []),
      ...(onBrain.onTool ?? []),
      ...(onBrain.onStop ?? []),
      ...(onBrain.onTalk ?? []),
    ].map((hook) => hook.command),
    error: null,
  };
};
