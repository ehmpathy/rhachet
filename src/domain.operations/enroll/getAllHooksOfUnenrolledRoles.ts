import type { ClaudeCodeSettings } from '@src/domain.operations/brains/claudeCodeSettings';
import { asRoleFocusParts } from '@src/domain.operations/roles/focus/asRoleFocusParts';

import { asRoleSlugOfHookAuthor } from './asRoleSlugOfHookAuthor';

/**
 * .what = every hook in a settings file that a role OUTSIDE the enrolled set authored
 * .why = a clone must load the hooks of its own roles and of no other. a hook whose author
 *   names a role the clone was not enrolled in is the config blend — e.g. a driver hook on a
 *   `--roles -driver` peer, which then drives the human's route
 *
 * .note = a hook with no author, or an author with no `role=` segment, is the human's own
 *   (their grove's) and names no role, so it is never reported
 */
export const getAllHooksOfUnenrolledRoles = (input: {
  settings: ClaudeCodeSettings;
  roles: string[];
}): { event: string; author: string }[] => {
  // a focus is stripped: hooks follow the role, so `mechanic::flow` enrolls mechanic's hooks
  const rolesEnrolled = new Set(
    input.roles.map((token) => asRoleFocusParts({ token }).role),
  );
  return Object.entries(input.settings.hooks ?? {}).flatMap(
    ([event, entries]) =>
      (entries ?? []).flatMap((entry) =>
        (entry.hooks ?? []).flatMap((hook) => {
          const author = hook.author;
          if (!author) return [];
          const role = asRoleSlugOfHookAuthor({ author });
          if (role === null || rolesEnrolled.has(role)) return [];
          return [{ event, author }];
        }),
      ),
  );
};
