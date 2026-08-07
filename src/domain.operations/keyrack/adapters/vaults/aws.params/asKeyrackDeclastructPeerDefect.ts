import { ConstraintError } from 'helpful-errors';

/**
 * .what = classify an error caught on a declastruct-aws peer load: a ConstraintError that names the
 *         install fix when the peer is genuinely absent, else null (signal "rethrow the original
 *         unchanged")
 * .why = the peer-absent message is the ONE message a user without the optional peer sees (uc14),
 *        so it must be exact + tested. a pure transformer lets it be unit-tested against fabricated
 *        error shapes — no need to uninstall the peer or mock an import. the null return keeps the
 *        catch an ALLOWLIST: a real malfunction (a syntax error in the peer, a transitive-dep
 *        failure) is NEVER masked as "install the peer" (rule.forbid.failhide)
 */
export const asKeyrackDeclastructPeerDefect = (
  cause: unknown,
): ConstraintError<{ hint: string; cause: Error | undefined }> | null => {
  // allowlist: only a module-not-found for the peer is caller-fixable (install it). the message
  // prefix 'declastruct' matches BOTH the direct peer ('declastruct-aws') AND its transitive
  // peer-of-peer ('declastruct', a bare CJS require) — the 200-line crash the incident hit. the
  // code check spans both loaders: ESM (ERR_MODULE_NOT_FOUND) + CJS (MODULE_NOT_FOUND). the code
  // check is safe un-scoped because the ONLY imports in this try are declastruct-family, so any
  // module-not-found here IS a declastruct absence. narrow via `'code' in cause` (no as-cast)
  const peerAbsent =
    cause instanceof Error &&
    (cause.message.includes("Cannot find module 'declastruct") ||
      ('code' in cause &&
        (cause.code === 'ERR_MODULE_NOT_FOUND' ||
          cause.code === 'MODULE_NOT_FOUND')));
  if (!peerAbsent) return null;

  return new ConstraintError('aws.params needs the declastruct-aws peer', {
    hint: 'run `pnpm add declastruct-aws`',
    cause: cause instanceof Error ? cause : undefined,
  });
};
