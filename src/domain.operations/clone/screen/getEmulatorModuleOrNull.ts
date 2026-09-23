import type * as XtermHeadless from '@xterm/headless';

import { matchesAnyMarker } from '@src/utils/matchesAnyMarker';

/**
 * .what = the @xterm/headless module surface the screen feed depends on (a projection,
 *   not the whole api) — the `Terminal` class it constructs per clone
 */
export type EmulatorModule = Pick<typeof XtermHeadless, 'Terminal'>;

/**
 * .what = the QUOTED shapes node raises when @xterm/headless itself is absent
 *
 * ⚠️ the quoted specifier, never a bare `/xterm/` — a bare token matches the
 *   `Require stack:` line, which names OUR own path in every MODULE_NOT_FOUND raised
 *   under this module, and would swallow a broken-install error as "the dep is absent"
 *   (`rule.forbid.failhide`).
 */
const EMULATOR_ABSENT_MARKERS: RegExp[] = [
  /Cannot find module '(@xterm\/headless|@xterm\/headless\/[^']*)'/,
];

/**
 * .what = whether a load error is the EXPECTED emulator-absent case
 * .why = @xterm/headless is a required PURE-js dep, so a load normally succeeds. an
 *   absence means a broken install rather than an optional-addon gap — but a null still
 *   degrades HONESTLY (the clone runs with no screen feed, and `read` reports
 *   `feed-not-live` → the `unreadable` verdict), so the absent-package case is
 *   distinguished from every OTHER throw, which is a real defect that must surface.
 */
const isEmulatorAbsentError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : '';
  const code = (error as NodeJS.ErrnoException)?.code;
  if (code !== 'MODULE_NOT_FOUND') return false;
  return matchesAnyMarker({ markers: EMULATOR_ABSENT_MARKERS, text: message });
};

/**
 * .what = lazy-load @xterm/headless, or null if the package is somehow absent
 *
 * ⚠️ LAZY, never at import time — so the bun-compiled fast paths never touch the
 *   emulator, and a host without the dep still runs the rest of the cli
 *   (`rule.forbid.eager-esm-imports-in-prod`, mirrors `getPtyModuleOrNull`).
 *
 * .note = a null is a CAPABILITY GAP — the caller runs the clone with no screen feed,
 *   and every `read` then reports `feed-not-live` LOUD, never an empty screen.
 */
export const getEmulatorModuleOrNull = (input?: {
  load?: () => unknown;
}): EmulatorModule | null => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const load = input?.load ?? ((): unknown => require('@xterm/headless'));
  try {
    return load() as EmulatorModule;
  } catch (error) {
    if (isEmulatorAbsentError(error)) return null;
    throw error;
  }
};
