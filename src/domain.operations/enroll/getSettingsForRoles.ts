import type { ClaudeCodeSettings } from '@src/_topublish/rhachet-brains-anthropic/src/hooks/config.dao';

/**
 * .what = returns a settings object whose hooks are narrowed to only those
 *         authored by the given enrolled roles
 * .why = a brain's dynamic enrollment config should carry hooks from the
 *        specified roles alone; this transformer holds the author-match +
 *        empty-entry-drop pipeline so genBrainCliConfigArtifact reads as narrative
 *
 * .note = real hook structure: { matcher: "*", hooks: [{ author: "repo=X/role=Y", ... }] }
 * .note = inner hooks are matched by author field; entries with no match are dropped
 * .note = permissions and every non-hook key are retained via spread
 */
export const getSettingsForRoles = (input: {
  settings: ClaudeCodeSettings;
  roles: string[];
}): ClaudeCodeSettings => {
  const { settings, roles } = input;

  if (!settings.hooks) return settings;

  // author format is `repo=X/role=Y`, so match on the `role=Y` fragment
  const rolePatterns = roles.map((role) => `role=${role}`);

  // narrow each hook event category to entries with at least one role-authored hook
  const hooksFiltered: ClaudeCodeSettings['hooks'] = {};

  for (const [eventName, entries] of Object.entries(settings.hooks)) {
    if (!entries) continue;

    const filteredEntries = entries
      .map((entry) => {
        // keep only inner hooks authored by an enrolled role
        const filteredInnerHooks = entry.hooks.filter((hook) => {
          // ClaudeCodeHookEntry.hooks[] already types `author?: string`, so
          // read it directly — no cast; the guard narrows it to string below
          const author = hook.author;
          if (!author) return false;
          return rolePatterns.some((pattern) => author.includes(pattern));
        });

        // drop the entry entirely when no inner hook survived
        if (filteredInnerHooks.length === 0) return null;

        return { ...entry, hooks: filteredInnerHooks };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    if (filteredEntries.length > 0) {
      hooksFiltered[eventName as keyof typeof hooksFiltered] = filteredEntries;
    }
  }

  return {
    ...settings,
    hooks: hooksFiltered,
  };
};
