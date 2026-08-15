import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';

/**
 * .what = compute a truncated hash of the HOME path — a per-host+user identity
 * .why =
 *   - two consumers now share this ONE host-identity digest: the keyrack daemon
 *     (its per-HOME socket + daemon identity) and the clone frame (CloneOndisk.hostHash
 *     for cross-host reach detection + the per-clone socket path). one derivation,
 *     so a clone and the daemon never disagree on what "this host" hashes to
 *   - realpathSync expands symlinks, so a symlinked HOME hashes to the same value
 *     as its real path (a moved/aliased HOME never forks the identity)
 *
 * .note = fails fast (realpathSync throws) if HOME is a broken/absent path
 */
export const getHomeHash = (): string => {
  // get HOME from environment or fallback to cwd
  const homePath = process.env['HOME'] ?? process.cwd();

  // expand symlinks to real path (fail fast if broken)
  const realPath = realpathSync(homePath);

  // compute truncated sha256 hash
  return createHash('sha256').update(realPath).digest('hex').slice(0, 8);
};
