import type { BrainHook } from '@src/domain.objects/BrainHook';
import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
import type { HookDispatchRule } from '@src/domain.objects/HookDispatchRule';

import { asBrainHookOfHookDispatchRule } from './asBrainHookOfHookDispatchRule';
import { getOneHookDispatchManifest } from './getOneHookDispatchManifest';
import { getOneHookDispatchRuleOfBrainHook } from './getOneHookDispatchRuleOfBrainHook';
import { type HookUnique, isHookOfUnique } from './isHookOfUnique';
import { setHookDispatchManifest } from './setHookDispatchManifest';

/**
 * .what = a hooks adapter whose store is the dispatch manifest, not the brain's settings
 * .why = the role hooks live as manifest rules; the sync and the orphan prune diff against
 *   the manifest through the same adapter contract they always used, so their reports and their
 *   declarative semantics hold. the brain's own adapter then receives one dispatcher hook per
 *   event (`setHookDispatchersViaAdapter`)
 *
 * .note = `slug` is the wrapped adapter's, so a caller that keys on it reads the same brain
 * .note = `repoPath` is where `rhx` looks up each rule's file — the repo root, never the
 *   actor dir the manifest sits in
 */
export const genBrainHooksAdapterViaDispatchManifest = (input: {
  adapter: BrainHooksAdapter;
  manifestPath: string;
  repoPath: string;
}): BrainHooksAdapter => {
  const { manifestPath, repoPath } = input;

  /**
   * .what = the manifest's rules; an absent manifest holds none
   * .note = a read never writes: the one-time seed from the settings is its own step
   *   (`setHookDispatchManifestMigratedFromSettings`), run before this adapter is handed out
   */
  const getRules = async (): Promise<HookDispatchRule[]> =>
    (await getOneHookDispatchManifest({ path: manifestPath }))?.rules ?? [];

  /**
   * .what = every rule, as a declared hook
   */
  const getAllHooks = async (): Promise<BrainHook[]> =>
    (await getRules()).map((rule) => asBrainHookOfHookDispatchRule({ rule }));

  /**
   * .what = upsert one rule: replace the rule of the same key in place, or append it
   * .why = in place keeps manifest order, which is the order the dispatcher merges stdout in
   */
  const upsert = async ({ hook }: { hook: BrainHook }): Promise<BrainHook> => {
    const rulesNext = asRulesWithRuleUpserted({
      rules: await getRules(),
      rule: getOneHookDispatchRuleOfBrainHook({ hook, repoPath }),
      key: hook,
    });
    await setHookDispatchManifest({ path: manifestPath, rules: rulesNext });
    return hook;
  };

  return {
    slug: input.adapter.slug,
    dao: {
      get: {
        async one(query) {
          const hooks = await getAllHooks();
          return (
            hooks.find((hook) => isHookOfKey({ hook, key: query.by.unique })) ??
            null
          );
        },
        async all(query) {
          const hooks = await getAllHooks();
          return hooks.filter((hook) =>
            isHookOfQuery({ hook, by: query?.by ?? null }),
          );
        },
      },
      set: {
        async findsert({ hook }) {
          const found = (await getRules()).some((rule) =>
            isRuleOfKey({ rule, key: hook }),
          );
          if (found) return hook;
          return upsert({ hook });
        },
        upsert,
      },
      async del(query) {
        const rules = await getRules();
        const rulesNext = rules.filter(
          (rule) => !isRuleOfKey({ rule, key: query.by.unique }),
        );
        if (rulesNext.length === rules.length) return;
        await setHookDispatchManifest({ path: manifestPath, rules: rulesNext });
      },
    },
  };
};

/**
 * .what = the unique key of a hook
 */
type HookKey = HookUnique;

/**
 * .what = whether a hook carries a unique key
 */
const isHookOfKey = (input: { hook: BrainHook; key: HookKey }): boolean =>
  isHookOfUnique({ hook: input.hook, unique: input.key });

/**
 * .what = whether a rule is the hook of a unique key
 */
const isRuleOfKey = (input: {
  rule: HookDispatchRule;
  key: HookKey;
}): boolean =>
  isHookOfKey({
    hook: asBrainHookOfHookDispatchRule({ rule: input.rule }),
    key: input.key,
  });

/**
 * .what = whether a hook fits a dao `all` query: each field the query names must match
 */
const isHookOfQuery = (input: {
  hook: BrainHook;
  by: Partial<HookKey> | null;
}): boolean => {
  const by = input.by ?? {};
  if (by.author && input.hook.author !== by.author) return false;
  if (by.event && input.hook.event !== by.event) return false;
  if (by.command && input.hook.command !== by.command) return false;
  return true;
};

/**
 * .what = the rules with one rule upserted: the rule of the same key replaced in place, else
 *   appended
 */
const asRulesWithRuleUpserted = (input: {
  rules: HookDispatchRule[];
  rule: HookDispatchRule;
  key: HookKey;
}): HookDispatchRule[] => {
  const isPresent = input.rules.some((rule) =>
    isRuleOfKey({ rule, key: input.key }),
  );
  if (!isPresent) return [...input.rules, input.rule];
  return input.rules.map((rule) =>
    isRuleOfKey({ rule, key: input.key }) ? input.rule : rule,
  );
};
