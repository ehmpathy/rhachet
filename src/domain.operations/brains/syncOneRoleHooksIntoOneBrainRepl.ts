import { serialize } from 'domain-objects';
import { toMilliseconds } from 'iso-time';

import { BrainHook } from '@src/domain.objects/BrainHook';
import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
import type { HasRepo } from '@src/domain.objects/HasRepo';
import type { Role } from '@src/domain.objects/Role';

/**
 * .what = syncs one role's hook declarations into one brain repl config
 * .why = enables declarative management of brain hooks
 *
 * .note = computes author namespace from role.repo + role.slug
 * .note = syncs declared hooks via upsert
 * .note = removes hooks no longer declared (declarative removal)
 */
export const syncOneRoleHooksIntoOneBrainRepl = async (input: {
  role: HasRepo<Role>;
  adapter: BrainHooksAdapter;
}): Promise<{
  hooks: {
    created: BrainHook[];
    updated: BrainHook[];
    deleted: BrainHook[];
    unchanged: BrainHook[];
  };
}> => {
  const { role, adapter } = input;

  // compute author namespace
  const author = `repo=${role.repo}/role=${role.slug}`;

  // get declared hooks from role
  const declared = extractDeclaredHooks({
    role,
    author,
  });

  // get hooks found in brain config
  const hooksFound = await adapter.dao.get.all({ by: { author } });

  // compute diff
  const { toAdd, toUpdate, toRemove, unchanged } = computeHookDiff({
    declared,
    hooksFound,
  });

  // apply changes
  const created: BrainHook[] = [];
  const updated: BrainHook[] = [];
  const deleted: BrainHook[] = [];

  // add new hooks
  for (const hook of toAdd) {
    await adapter.dao.set.upsert({ hook });
    created.push(hook);
  }

  // update hooks
  for (const hook of toUpdate) {
    await adapter.dao.set.upsert({ hook });
    updated.push(hook);
  }

  // remove hooks no longer declared
  for (const hook of toRemove) {
    await adapter.dao.del({
      by: {
        unique: {
          author: hook.author,
          event: hook.event,
          command: hook.command,
        },
      },
    });
    deleted.push(hook);
  }

  return { hooks: { created, updated, deleted, unchanged } };
};

/**
 * .what = extracts BrainHook instances from role declarations
 * .why = converts RoleHookOnBrain to BrainHook with author
 */
const extractDeclaredHooks = (input: {
  role: Role;
  author: string;
}): BrainHook[] => {
  const { role, author } = input;
  const hooks: BrainHook[] = [];

  const onBrain = role.hooks?.onBrain;
  if (!onBrain) return hooks;

  // extract onBoot hooks
  for (const h of onBrain.onBoot ?? []) {
    hooks.push(
      new BrainHook({
        author,
        event: 'onBoot',
        command: h.command,
        timeout: h.timeout,
        filter: h.filter,
      }),
    );
  }

  // extract onTool hooks
  for (const h of onBrain.onTool ?? []) {
    hooks.push(
      new BrainHook({
        author,
        event: 'onTool',
        command: h.command,
        timeout: h.timeout,
        filter: h.filter,
      }),
    );
  }

  // extract onStop hooks
  for (const h of onBrain.onStop ?? []) {
    hooks.push(
      new BrainHook({
        author,
        event: 'onStop',
        command: h.command,
        timeout: h.timeout,
        filter: h.filter,
      }),
    );
  }

  // extract onTalk hooks
  for (const h of onBrain.onTalk ?? []) {
    hooks.push(
      new BrainHook({
        author,
        event: 'onTalk',
        command: h.command,
        timeout: h.timeout,
        filter: h.filter,
      }),
    );
  }

  return hooks;
};

/**
 * .what = whether two hooks hold the same body, with each timeout compared as a duration
 * .why = a brain stores a timeout in its own unit (claude: milliseconds) and reads it back
 *   so (`{ milliseconds: 30000 }`), while a role declares it as an iso duration (`PT30S`).
 *   the same duration in two shapes must compare equal, or every re-sync rewrites the hook
 */
const isHookBodyEqual = (input: {
  left: BrainHook;
  right: BrainHook;
}): boolean => asHookComparable(input.left) === asHookComparable(input.right);

/**
 * .what = a hook serialized with its timeout as milliseconds, and its default filter.when
 *   dropped
 * .why = `when: 'before'` is the default an onTool hook fires at, so a brain that stores no
 *   `when` (claude: PreToolUse) reads the hook back without it. a declared default and an
 *   absent one are the same hook
 */
const asHookComparable = (hook: BrainHook): string => {
  const { when, ...filterRest } = hook.filter ?? {};
  const filter =
    when === 'before' ? filterRest : { ...filterRest, ...(when && { when }) };
  const hasFilter = Object.keys(filter).length > 0;
  return serialize({
    ...hook,
    timeout: asTimeoutComparable({ timeout: hook.timeout }),
    filter: hasFilter ? filter : undefined,
  });
};

/**
 * .what = a timeout as milliseconds when it is an iso duration, else as declared
 * .why = the diff only decides whether a hook is rewritten; whether a timeout is valid is
 *   the brain adapter's call. a role that declares a non-iso string (`'10s'`) keeps the
 *   raw compare it had before, rather than a throw from the diff for every hook it holds
 */
const asTimeoutComparable = (input: {
  timeout: BrainHook['timeout'];
}): unknown =>
  typeof input.timeout === 'string' && !input.timeout.startsWith('P')
    ? input.timeout
    : toMilliseconds(input.timeout);

/**
 * .what = computes diff between declared and found hooks
 * .why = enables declarative sync semantics
 */
const computeHookDiff = (input: {
  declared: BrainHook[];
  hooksFound: BrainHook[];
}): {
  toAdd: BrainHook[];
  toUpdate: BrainHook[];
  toRemove: BrainHook[];
  unchanged: BrainHook[];
} => {
  const { declared, hooksFound } = input;

  const toAdd: BrainHook[] = [];
  const toUpdate: BrainHook[] = [];
  const toRemove: BrainHook[] = [];
  const unchanged: BrainHook[] = [];

  // check each declared hook
  for (const declaredHook of declared) {
    const hookFound = hooksFound.find(
      (h) =>
        h.author === declaredHook.author &&
        h.event === declaredHook.event &&
        h.command === declaredHook.command,
    );

    if (!hookFound) {
      // not found → add
      toAdd.push(declaredHook);
    } else if (!isHookBodyEqual({ left: hookFound, right: declaredHook })) {
      // found but different → update
      toUpdate.push(declaredHook);
    } else {
      // found and same → unchanged
      unchanged.push(declaredHook);
    }
  }

  // check each found hook
  for (const hookFound of hooksFound) {
    const declaredHook = declared.find(
      (h) =>
        h.author === hookFound.author &&
        h.event === hookFound.event &&
        h.command === hookFound.command,
    );

    if (!declaredHook) {
      // found but not declared → remove
      toRemove.push(hookFound);
    }
  }

  return { toAdd, toUpdate, toRemove, unchanged };
};
