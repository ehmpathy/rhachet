import type { BrainHook } from '@src/domain.objects/BrainHook';
import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';

import {
  type ClaudeCodeSettings,
  readClaudeCodeSettings,
  writeClaudeCodeSettings,
} from './config.dao';
import {
  translateHookFromClaudeCode,
  translateHookToClaudeCode,
} from './translateHook';

/**
 * .what = creates a claude code brain hooks adapter for a repo
 * .why = enables rhachet to sync role hooks to .claude/settings.json
 */
export const genBrainHooksAdapterForClaudeCode = (input: {
  repoPath: string;
}): BrainHooksAdapter => {
  const { repoPath } = input;

  return {
    slug: 'claude-code',
    dao: {
      get: {
        /**
         * .what = finds a single hook by unique key
         * .why = enables lookup before upsert
         */
        async one(query) {
          const { author, event, command } = query.by.unique;
          const all = await this.all();
          return (
            all.find(
              (h) =>
                h.author === author &&
                h.event === event &&
                h.command === command,
            ) ?? null
          );
        },

        /**
         * .what = lists all hooks, optionally filtered
         * .why = enables enumeration for sync and display
         */
        async all(query) {
          const settings = await readClaudeCodeSettings({ from: repoPath });
          const hooks: BrainHook[] = [];

          // iterate over all hook events in settings
          const hooksSection = settings.hooks ?? {};
          for (const [eventName, entries] of Object.entries(hooksSection)) {
            if (!entries) continue;

            for (const entry of entries) {
              // extract author from matcher comment pattern
              const authorMatch = entry.matcher.match(/^#\s*author=([^\s]+)/);
              const entryAuthor = authorMatch?.[1] ?? 'unknown';

              // translate each entry to BrainHook(s)
              const translated = translateHookFromClaudeCode({
                event: eventName,
                entry,
                author: entryAuthor,
              });

              hooks.push(...translated);
            }
          }

          // apply filters if provided
          let result = hooks;
          if (query?.by?.author) {
            result = result.filter((h) => h.author === query.by?.author);
          }
          if (query?.by?.event) {
            result = result.filter((h) => h.event === query.by?.event);
          }
          if (query?.by?.command) {
            result = result.filter((h) => h.command === query.by?.command);
          }

          return result;
        },
      },

      set: {
        /**
         * .what = inserts hook if not found, returns found if present
         * .why = idempotent insert for initial sync
         */
        async findsert(query) {
          const hookFound = await this.upsert(query);
          return hookFound;
        },

        /**
         * .what = inserts or updates a hook
         * .why = enables sync to update hooks declaratively
         */
        async upsert(query) {
          const { hook } = query;
          const settings = await readClaudeCodeSettings({ from: repoPath });

          // translate to claude code format
          const { event, entry } = translateHookToClaudeCode({ hook });

          // ensure hooks section exists
          let hooksSection = { ...settings.hooks } ?? {};

          // tag entry with author for later identification
          const taggedEntry = {
            ...entry,
            matcher: `# author=${hook.author} ${entry.matcher}`,
          };

          const eventHooks = [
            ...(hooksSection[event as keyof typeof hooksSection] ?? []),
          ];

          // find and replace or append
          const hookIndex = eventHooks.findIndex(
            (e) =>
              e.matcher.includes(`author=${hook.author}`) &&
              e.hooks.some((h) => h.command === hook.command),
          );

          if (hookIndex >= 0) {
            eventHooks[hookIndex] = taggedEntry;
          } else {
            eventHooks.push(taggedEntry);
          }

          hooksSection = {
            ...hooksSection,
            [event]: eventHooks,
          };

          // write back
          const settingsUpdated: ClaudeCodeSettings = {
            ...settings,
            hooks: hooksSection,
          };

          await writeClaudeCodeSettings({
            settings: settingsUpdated,
            to: repoPath,
          });

          return hook;
        },
      },

      /**
       * .what = removes a hook by unique key
       * .why = enables cleanup when role hooks change
       */
      async del(query) {
        const { author, event, command } = query.by.unique;
        const settings = await readClaudeCodeSettings({ from: repoPath });

        // determine which claude code event buckets to search
        // for onBoot, search all boot event buckets (hook may be in any)
        const claudeEvents: string[] =
          event === 'onBoot'
            ? ['SessionStart', 'PreCompact', 'PostCompact']
            : event === 'onTool'
              ? ['PreToolUse']
              : ['Stop'];

        // find and remove from all relevant buckets
        let hooksSection = { ...settings.hooks } ?? {};
        let changed = false;

        for (const claudeEvent of claudeEvents) {
          const eventHooks =
            hooksSection[claudeEvent as keyof typeof hooksSection] ?? [];

          const filtered = eventHooks.filter(
            (e) =>
              !(
                e.matcher.includes(`author=${author}`) &&
                e.hooks.some((h) => h.command === command)
              ),
          );

          if (filtered.length !== eventHooks.length) {
            changed = true;
            hooksSection = {
              ...hooksSection,
              [claudeEvent]: filtered,
            };
          }
        }

        // write back if changed
        if (changed) {
          const settingsUpdated: ClaudeCodeSettings = {
            ...settings,
            hooks: hooksSection,
          };

          await writeClaudeCodeSettings({
            settings: settingsUpdated,
            to: repoPath,
          });
        }
      },
    },
  };
};
