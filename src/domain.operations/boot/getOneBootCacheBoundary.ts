import { BOOT_STATS_ZERO, type BootStats } from './BootStats';

/**
 * .what = the line claude splits a passed system prompt at, into two cached blocks
 * .why = claude code documents `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__` on its own line in
 *        `--system-prompt[-file]` as the split point (v2.1.275+); each side gets its own
 *        cache breakpoint, so an edit after the line leaves the bytes before it a read
 */
export const BOOT_CACHE_BOUNDARY_LINE = '__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__';

/**
 * .what = the boundary as a boot body with a zero census, in the shape of a role's
 * .why = the corpus joins bodies; the boundary joins the same way, between the published
 *        roles and the `repo=.this` roles
 * .note = static, so a render stays byte-stable across runs and repos
 */
export const getOneBootCacheBoundary = (): {
  body: string;
  stats: BootStats;
} => ({
  body: `${BOOT_CACHE_BOUNDARY_LINE}\n\n`,
  stats: BOOT_STATS_ZERO,
});
