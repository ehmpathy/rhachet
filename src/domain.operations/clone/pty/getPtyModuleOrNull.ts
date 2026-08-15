import type * as NodePty from 'node-pty';

/**
 * .what = the node-pty module type we depend on (a projection, not the whole api)
 */
export type PtyModule = Pick<typeof NodePty, 'spawn'>;

/**
 * .what = decide whether a thrown load error is the EXPECTED addon-absent case
 * .why = node-pty is an OPTIONAL native addon. two load faults are expected on a
 *   host that could not build it: the package is absent (MODULE_NOT_FOUND) or the
 *   native `.node` binary failed to dlopen / mismatched the node abi. every OTHER
 *   error (a syntax fault in our own code, say) is a real bug that must surface —
 *   to allowlist it would be the exact failhide rule.forbid.failhide forbids
 */
const isPtyAddonLoadError = (error: unknown): boolean => {
  const code = (error as NodeJS.ErrnoException)?.code;
  if (code === 'MODULE_NOT_FOUND' || code === 'ERR_DLOPEN_FAILED') return true;

  // node-gyp-build throws a plain Error (no .code) when no prebuild + no local
  // build exists, or when the abi mismatches — match its native-addon signature
  const message = error instanceof Error ? error.message : '';
  return /bindings|NODE_MODULE_VERSION|dlopen|\.node\b/i.test(message);
};

/**
 * .what = lazy-load node-pty, or null if the optional native addon is absent
 * .why =
 *   - the pty is loaded LAZILY, only on the enroll path that stands up a socket —
 *     never at import time. so the bun-compiled fast paths (which never enroll)
 *     never touch the native `.node`, and a host without the addon still runs the
 *     rest of the cli fine
 *   - this is the SECOND, RUNTIME socket gate, distinct from `--no-socket`: a null
 *     here means "the human asked for a socket but the addon will not load on this
 *     host" → the LOUD one-line fallback notice, vs the QUIET `--no-socket`/headless
 *     fallback. so the caller distinguishes an opt-out from a capability gap
 *
 * .note = the loader is injectable so a test forces the absent-addon branch (→ null)
 *   and the non-load branch (→ re-throw) without a real broken install; the default
 *   requires node-pty from this package's own dependency tree
 */
export const getPtyModuleOrNull = (input?: {
  load?: () => unknown;
}): PtyModule | null => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const load = input?.load ?? ((): unknown => require('node-pty'));
  try {
    return load() as PtyModule;
  } catch (error) {
    // ONLY the expected addon-absent/load-failure falls back to null
    if (isPtyAddonLoadError(error)) return null;
    throw error;
  }
};
