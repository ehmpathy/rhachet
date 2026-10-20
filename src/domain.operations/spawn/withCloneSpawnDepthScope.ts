import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { asCloneSpawnDepth } from './asCloneSpawnDepth';
import { assertCloneSpawnDepthWithinLimit } from './assertCloneSpawnDepthWithinLimit';

/**
 * .what = the one open depth scope of this process, shared by every concurrent repl call
 * .why = a repl supplier spawns its brain cli with no `env` option, so the child reads
 *   `process.env` at spawn time. one process holds one env, so parallel calls share one
 *   scope: opened by the first call, restored after the last
 *
 * .note = deliberate mutation — a process-wide refcount, the only shape a shared env takes
 */
const scope: {
  count: number;
  depthChild: number | null;
  envBefore: Record<string, string | undefined>;
} = { count: 0, depthChild: null, envBefore: {} };

/**
 * .what = the env keys a repl child must carry, or must not carry
 * .why = the child carries its own depth; it is no clone, so it carries no serial or socket
 */
const SCOPED_KEYS = [
  CLONE_ENV_KEYS.depth,
  CLONE_ENV_KEYS.serial,
  CLONE_ENV_KEYS.socket,
] as const;

/**
 * .what = the values a set of env keys hold right now, absent keys included
 * .why = the scope restores exactly what it found, so it records each key it will touch
 */
const asEnvSnapshot = (input: {
  env: NodeJS.ProcessEnv;
  keys: readonly string[];
}): Record<string, string | undefined> =>
  Object.fromEntries(input.keys.map((key) => [key, input.env[key]]));

/**
 * .what = put one env key back to the value it held before the scope opened
 * .why = an absent key must be deleted, never set to the string 'undefined'
 *
 * .note = deliberate mutation: the supplier's child reads `process.env` at spawn
 */
const setEnvKeyRestored = (input: {
  key: string;
  before: string | undefined;
}): void => {
  // an absent key stays absent
  if (input.before === undefined) {
    delete process.env[input.key];
    return;
  }

  // a present key gets its prior value back
  process.env[input.key] = input.before;
};

/**
 * .what = open the process-wide scope: record the env, then set the child's depth and
 *   drop the caller's clone identity
 * .why = a repl child is no clone, so it carries its own depth and no serial or socket
 *
 * .note = deliberate mutation: the supplier's child reads `process.env` at spawn
 */
const setEnvScopeOpened = (input: { depthChild: number }): void => {
  scope.envBefore = asEnvSnapshot({ env: process.env, keys: SCOPED_KEYS });
  scope.depthChild = input.depthChild;
  process.env[CLONE_ENV_KEYS.depth] = String(input.depthChild);
  delete process.env[CLONE_ENV_KEYS.serial];
  delete process.env[CLONE_ENV_KEYS.socket];
};

/**
 * .what = close the process-wide scope: put every scoped key back as it was found
 * .why = the caller's own env must read the same after the call as before it
 *
 * .note = deliberate mutation: the inverse of `setEnvScopeOpened`
 */
const setEnvScopeClosed = (): void => {
  for (const key of SCOPED_KEYS)
    setEnvKeyRestored({ key, before: scope.envBefore[key] });
  scope.depthChild = null;
  scope.envBefore = {};
};

/**
 * .what = run a repl call with the child's spawn depth set in `process.env`, after a
 *   refusal check against the depth limit
 * .why =
 *   - the repl door is the second spawn door: a review skill's brain is a spawn, so it
 *     must carry depth 1 and be refused past the limit, the same as `rhx enroll`
 *   - 🔴 the caller's depth is read ONCE, when the scope opens, and held. a call that
 *     starts while a peer's scope is open checks against the held child depth, never
 *     the env the peer set — else a depth-0 caller's second parallel rubric would read
 *     depth 1, mint depth 2, and be refused
 */
export const withCloneSpawnDepthScope = async <TOutput>(
  logic: () => Promise<TOutput>,
): Promise<TOutput> => {
  // the child depth: held by an open scope, else read from this process's caller
  const depthChild =
    scope.depthChild ??
    asCloneSpawnDepth({
      env: process.env,
      isTty: !!process.stdin.isTTY,
      door: 'repl',
    });
  assertCloneSpawnDepthWithinLimit({ depthChild });

  // the first call opens the scope
  if (scope.count === 0) setEnvScopeOpened({ depthChild });
  scope.count += 1;

  // run the call; the last call out restores the env
  try {
    return await logic();
  } finally {
    scope.count -= 1;
    if (scope.count === 0) setEnvScopeClosed();
  }
};
