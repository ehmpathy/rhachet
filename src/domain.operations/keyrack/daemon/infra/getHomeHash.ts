import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';

/**
 * .what = compute truncated hash of HOME path
 * .why = deterministic daemon identity per HOME
 *
 * .note = uses realpathSync to expand symlinks, fail fast if broken
 */
export const getHomeHash = (): string => {
  // get HOME from environment or fallback to cwd
  const homePath = process.env['HOME'] ?? process.cwd();

  // expand symlinks to real path (fail fast if broken)
  const realPath = realpathSync(homePath);

  // compute truncated sha256 hash
  return createHash('sha256').update(realPath).digest('hex').slice(0, 8);
};
