import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

/**
 * .what = whether the process that asks to spawn is a LEAF — a clone or repl brain that
 *   may spawn no one
 * .why = a leaf may spawn no one (ehmpathy/rhachet#577). the spawn that minted it set the
 *   leaf mark in its env, and every process it runs — its tool shell, a `rhx` it calls —
 *   inherits that env, so this one read answers for both spawn doors
 *
 * ⚠️ .note = any non-empty value reads as a leaf. the writer sets `1`; a smudged value
 *   errs toward the bound, never toward a second tier of clones
 * .note = a guardrail against a leaf fan-out, not a security boundary: a process that
 *   unsets the key by hand reads as a work clone
 */
export const isCloneSpawnCallerLeaf = (input: {
  env: Record<string, string | undefined>;
}): boolean => {
  const raw = input.env[CLONE_ENV_KEYS.leaf];
  return raw !== undefined && raw !== '';
};
