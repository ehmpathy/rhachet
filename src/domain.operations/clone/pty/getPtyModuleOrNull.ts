import type * as NodePty from 'node-pty';

import { matchesAnyMarker } from '@src/utils/matchesAnyMarker';

/**
 * .what = the node-pty module type we depend on (a projection, not the whole api)
 */
export type PtyModule = Pick<typeof NodePty, 'spawn'>;

/**
 * .what = the shapes a native-addon loader EMITS when it cannot load the addon
 *
 * ⚠️ every marker is anchored to the shape its emitter PRINTS, never a loose token. a
 *   loosened marker swallows an unrelated error to `null`, where it reads as "the addon is
 *   absent" (`rule.forbid.failhide`).
 */
const PTY_ADDON_LOAD_MARKERS: RegExp[] = [
  // node-pty's OWN loader, when all six candidate dirs miss:
  //   `Failed to load native module: pty.node, checked: build/Release, build/Debug, …`
  // ⚠️ a plain Error with NO `.code`, so the code checks below cannot see it
  // ⚠️ it APPENDS the last inner failure, so a linux 1.1.0 host's full message ENDS with
  //   `Cannot find module './prebuilds/linux-x64//pty.node'`. that tail is what a field
  //   report quotes, and on its own it matches NO marker here — the head is what matches
  /Failed to load native module:/,
  // the `bindings` package, when it cannot locate a build:
  //   `Could not locate the bindings file. Tried: …`
  /Could not locate the bindings file/,
  // node's own abi-mismatch message; an upper-snake token needs no further anchor
  /NODE_MODULE_VERSION/,
  // the dynamic-loader failure, anchored to the CALL shape rather than the bare word:
  //   `dlopen(/path/to/pty.node, 0x0001): Library not loaded`
  /dlopen\(/,
];

/**
 * .what = the module names whose absence means "the optional addon is absent"
 *
 * 🚨 `MODULE_NOT_FOUND` alone cannot decide: node raises it both when node-pty is absent
 *   (degrade) and when one of ITS OWN requires is (a broken install, which must surface).
 *   node names the absent module, so the quoted specifier is what parts the two.
 *
 * ⚠️ the QUOTED shape, never a bare `/node-pty/` — that matches the `Require stack:` line,
 *   which names our own path in every MODULE_NOT_FOUND raised under this module.
 */
const PTY_ABSENT_MARKERS: RegExp[] = [
  // the package itself, and any subpath of it (`node-pty/lib/index.js`)
  /Cannot find module '(node-pty|node-pty\/[^']*)'/,
];

/**
 * .what = whether a thrown load error is the EXPECTED addon-absent case
 * .why  = node-pty is OPTIONAL, so two faults are expected on a host that could not build
 *   it: the package is absent, or its `.node` failed to dlopen. every OTHER error is a
 *   real defect that must surface (`rule.forbid.failhide`)
 */
const isPtyAddonLoadError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : '';
  const code = (error as NodeJS.ErrnoException)?.code;

  // `pty.node` is the one native piece node-pty carries, so this code alone decides.
  // ⚠️ its clamp is `[case9]`, never `[case6]` — case6's message carries `dlopen(`, so it
  //   satisfies PTY_ADDON_LOAD_MARKERS and returns before this line is read
  if (code === 'ERR_DLOPEN_FAILED') return true;

  // ⚠️ this one does NOT decide on its code alone — see PTY_ABSENT_MARKERS
  if (code === 'MODULE_NOT_FOUND')
    return matchesAnyMarker({ markers: PTY_ABSENT_MARKERS, text: message });

  return matchesAnyMarker({ markers: PTY_ADDON_LOAD_MARKERS, text: message });
};

/**
 * .what = lazy-load node-pty, or null if the optional native addon is absent
 *
 * ⚠️ LAZY, never at import time — so the bun-compiled fast paths never touch the native
 *   `.node`, and a host without the addon still runs the rest of the cli.
 *
 * .note = a null is a CAPABILITY GAP, and the caller reports it LOUD. `--no-socket` is the
 *   quiet opt-out; the two must not collapse into one branch.
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
