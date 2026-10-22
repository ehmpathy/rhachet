import {
  CLONE_ENV_KEYS,
  CLONE_ENV_KEYS_IDENTITY,
} from '@src/utils/cloneEnvKeys';

import { asCloneSpawnDepth } from './asCloneSpawnDepth';
import { assertCloneSpawnAllowed } from './assertCloneSpawnAllowed';
import { isCloneSpawnCallerLeaf } from './isCloneSpawnCallerLeaf';

/**
 * .what = the shape of the one open depth scope of this process
 */
interface CloneSpawnDepthScope {
  count: number;
  depthChild: number | null;
  envBefore: Record<string, string | undefined>;
}

/**
 * .what = the one open depth scope of this process, shared by every concurrent repl call
 * .why =
 *   - a repl supplier spawns its brain cli with no `env` option, so the child reads
 *     `process.env` at spawn time. one process holds one env, so parallel calls share one
 *     scope: opened by the first call, restored after the last
 *   - it is anchored on `globalThis` under a registry symbol, not held in module state: the
 *     env is process-wide, so two copies of rhachet loaded in one process (a global `rhx`
 *     beside a local `rhachet/brains`) must share one refcount, else interleaved closes
 *     leave the child's depth set after the call
 *
 * .note = deliberate mutation — a process-wide refcount, the only shape a shared env takes
 * .note = the symbol name carries the scope's shape version. a shape change bumps it, so
 *   an older copy never hands a newer one a shape that lacks a field
 */
const SCOPE_ANCHOR = Symbol.for('rhachet.cloneSpawnDepthScope.v1');
const scope: CloneSpawnDepthScope = ((): CloneSpawnDepthScope => {
  const anchor = globalThis as typeof globalThis & {
    [SCOPE_ANCHOR]?: CloneSpawnDepthScope;
  };
  anchor[SCOPE_ANCHOR] ??= { count: 0, depthChild: null, envBefore: {} };
  return anchor[SCOPE_ANCHOR];
})();

/**
 * .what = the env keys a repl child must carry, or must not carry
 * .why = the child carries its own depth and the leaf mark; it is no clone, so it carries
 *   no serial or socket
 */
const SCOPED_KEYS = CLONE_ENV_KEYS_IDENTITY;

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
 *   leaf mark, and drop the caller's clone identity
 * .why = a repl child is no clone, so it carries its own depth and no serial or socket.
 *   a repl child is a leaf, so it carries the leaf mark: it may spawn no one (#577)
 *
 * .note = deliberate mutation: the supplier's child reads `process.env` at spawn
 */
const setEnvScopeOpened = (input: { depthChild: number }): void => {
  scope.envBefore = asEnvSnapshot({ env: process.env, keys: SCOPED_KEYS });
  scope.depthChild = input.depthChild;
  for (const key of SCOPED_KEYS) delete process.env[key];
  process.env[CLONE_ENV_KEYS.depth] = String(input.depthChild);
  process.env[CLONE_ENV_KEYS.leaf] = '1';
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
 * .what = run a repl call with the child's spawn depth and leaf mark set in
 *   `process.env`, after a refusal check on the caller's own leaf mark
 * .why =
 *   - the repl door is the second spawn door: a repl brain is a spawn, so it carries
 *     its depth, and it is a leaf, so it may spawn no one (#577). a caller that is
 *     itself a leaf is refused, the same as at `rhx enroll`
 *   - 🔴 the caller is read ONCE, when the scope opens, and held. a call that starts
 *     while a peer's scope is open reuses the held child depth and skips the refusal,
 *     never reads the env the peer set — else a work clone's second parallel rubric
 *     would read the peer's leaf mark and be refused
 */
export const withCloneSpawnDepthScope = async <TOutput>(
  logic: () => Promise<TOutput>,
): Promise<TOutput> => {
  // a fresh scope reads its caller: a leaf is refused before any env is touched
  if (scope.depthChild === null)
    assertCloneSpawnAllowed({
      isCallerLeaf: isCloneSpawnCallerLeaf({ env: process.env }),
      door: 'repl',
    });

  // the child depth: held by an open scope, else read from this process's caller
  const depthChild =
    scope.depthChild ??
    asCloneSpawnDepth({
      env: process.env,
      isTty: !!process.stdin.isTTY,
      door: 'repl',
    });

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
