import { toMilliseconds } from 'iso-time';

import type { BrainHook } from '../../../../domain.objects/BrainHook';
import type { BrainHookEvent } from '../../../../domain.objects/BrainHookEvent';
import type { BrainHooksAdapter } from '../../../../domain.objects/BrainHooksAdapter';
import {
  deleteOpencodePlugin,
  type OpencodePluginMeta,
  readOpencodePlugins,
  writeOpencodePlugin,
} from './config.dao';

/**
 * .what = creates an opencode brain hooks adapter for a repo
 * .why = enables rhachet to sync role hooks to .opencode/plugin/
 */
export const genBrainHooksAdapterForOpencode = (input: {
  repoPath: string;
}): BrainHooksAdapter => {
  const { repoPath } = input;

  return {
    slug: 'opencode',
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
          const plugins = await readOpencodePlugins({ from: repoPath });
          const hooks: BrainHook[] = plugins.map(({ meta }) =>
            pluginMetaToBrainHook(meta),
          );

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

          // convert to plugin meta
          const meta = brainHookToPluginMeta(hook);

          // write the plugin file (overwrites if exists)
          await writeOpencodePlugin({ meta, to: repoPath });

          return hook;
        },
      },

      /**
       * .what = removes a hook by unique key
       * .why = enables cleanup when role hooks change
       */
      async del(query) {
        const { author, event, command } = query.by.unique;

        // find the plugin file for this hook
        const plugins = await readOpencodePlugins({ from: repoPath });
        const pluginFound = plugins.find(
          ({ meta }) =>
            meta.author === author &&
            meta.event === event &&
            meta.command === command,
        );

        if (pluginFound) {
          await deleteOpencodePlugin({
            filename: pluginFound.filename,
            from: repoPath,
          });
        }
      },
    },
  };
};

/**
 * .what = converts BrainHook to OpencodePluginMeta
 * .why = bridges rhachet hook model to opencode plugin structure
 */
const brainHookToPluginMeta = (hook: BrainHook): OpencodePluginMeta => {
  // convert IsoDuration to milliseconds for opencode
  const timeoutMs = toMilliseconds(hook.timeout);

  return {
    author: hook.author,
    event: hook.event,
    command: hook.command,
    timeout: timeoutMs,
    filter: hook.filter,
  };
};

/**
 * .what = converts OpencodePluginMeta back to BrainHook
 * .why = enables read of hooks from opencode plugins
 */
const pluginMetaToBrainHook = (meta: OpencodePluginMeta): BrainHook => ({
  author: meta.author,
  event: meta.event as BrainHookEvent,
  command: meta.command,
  timeout: meta.timeout ? { milliseconds: meta.timeout } : { seconds: 30 },
  ...(meta.filter && { filter: meta.filter }),
});
