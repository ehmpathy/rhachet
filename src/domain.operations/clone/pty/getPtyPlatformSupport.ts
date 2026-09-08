import type { Libc } from './asLibcFromReport';
import { asPtyHostTuple } from './asPtyHostTuple';

/**
 * .what = declares whether upstream node-pty ships a prebuilt addon for a host
 *
 * .why  = it decides WHOSE defect an absent pty addon is, and so the error class:
 *         - `supported`   → the addon ships in the tarball, so an absent one means our
 *                           artifact or the install is broken → MalfunctionError, exit 1
 *         - `unsupported` → no binary exists upstream → ConstraintError, exit 2
 *         - `unknown`     → the libc read failed, so neither party can be named
 *
 * .note = the tuple list mirrors the `prebuilds/` dir of the node-pty version
 *         `package.json` pins. `package.json` owns the pin;
 *         `getPtyPlatformSupport.integration.test.ts` owns the agreement — it reads the
 *         real dir and asserts BIDIRECTIONALLY, so a bump that widens or narrows the
 *         upstream set goes red there.
 *
 * 🚨 that pin is a PRERELEASE. ➡️ DROP IT the moment `1.2.0` publishes stable — a one-line
 *         reversal, tracked at `ehmpathy/rhachet#487`.
 *
 * ⚠️ the list is HARDCODED, never read off the installed `prebuilds/` dir. this decision
 *         is consulted exactly when the addon FAILED to load, so that dir may be precisely
 *         what is absent — a probe of it would report a damaged install as `unsupported`.
 */
export type PtyPlatformSupport = 'supported' | 'unsupported' | 'unknown';

/**
 * the platform-arch tuples upstream ships a prebuilt addon for
 *
 * ⚠️ the addon's filename is NOT one name across the six. upstream calls
 *   `loadNativeModule('pty')` on non-win32 and `'conpty'` + `'conpty_console_list'` on
 *   win32, so the two win32 dirs carry no `pty.node` at all — a grep for `pty.node` finds
 *   four dirs, never six.
 */
const PTY_PREBUILD_TUPLES = [
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
  'win32-arm64',
  'win32-x64',
] as const;

/**
 * .what = decides prebuild support from the three host facts that determine it
 *
 * .note = `libc` is REQUIRED, never inferred here. upstream's linux prebuilds link against
 *         a glibc-2.28 sysroot, so a musl host matches the tuple and still fails at
 *         `dlopen` — the tuple alone cannot decide linux.
 *
 * 🚨 the musl verdict is a PERMANENT boundary, never a gap that a later round closes.
 *         upstream ships no musl prebuild and declares no plan to, and the wisher scoped this
 *         drive to ubuntu (glibc, x64 + arm64). so a musl host is `unsupported` BY DESIGN — a
 *         ConstraintError with `--no-socket`, forever, rather than a MalfunctionError we owe a
 *         repair on. stated here because a reader who infers it from a coverage table would
 *         read it as temporary.
 *
 * ⚠️ an UNREADABLE libc yields `unknown` on linux and is IGNORED elsewhere: libc governs
 *         linux alone, so it may cloud only the row it actually decides.
 */
export const getPtyPlatformSupport = (input: {
  platform: string;
  arch: string;
  libc: Libc;
}): PtyPlatformSupport => {
  // no prebuild for this shape at all (freebsd, riscv, …) — libc cannot rescue it,
  // so this stays a definite `unsupported` even where the libc read failed
  const tuple = asPtyHostTuple({
    platform: input.platform,
    arch: input.arch,
  });
  if (!PTY_PREBUILD_TUPLES.some((each) => each === tuple)) return 'unsupported';

  // linux prebuilds are glibc-linked; a musl host matches the tuple and still cannot
  // dlopen — and an unreadable libc leaves us unable to say which of the two this is
  if (input.platform === 'linux') {
    // 🚨 the two words on this line are DIFFERENT terms, never a typo. `unreadable` is
    //   the probe's outcome (the libc read returned naught); `unknown` is the verdict
    //   that outcome propagates into (no probe of platform-support itself ever ran).
    //   see `term=unreadable._.choice._.md`, "the second boundary"
    if (input.libc === 'unreadable') return 'unknown';
    return input.libc === 'glibc' ? 'supported' : 'unsupported';
  }

  return 'supported';
};
