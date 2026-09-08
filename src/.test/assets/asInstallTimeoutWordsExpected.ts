import { INSTALL_TIMEOUT_MS } from '@src/domain.operations/upgrade/execNpmInstall';

/**
 * .what = the duration word a timeout report is expected to carry — `5m` at today's bound
 *
 * .why  = 🚨 a HARDCODED `'5m'` is a copy of a fact whose owner is `INSTALL_TIMEOUT_MS`,
 *   and a widened bound breaks the two assertion sites in OPPOSITE directions: the
 *   PRESENT assertion reddens (noisy, honest); the ABSENT assertion passes VACUOUSLY —
 *   silent, never red.
 *
 * .why MIRRORED, never imported = this does NOT import production's
 *   `asInstallTimeoutWords`. a clamp that imports the expression it guards claims
 *   `f(x) === f(x)` and goes green on any reword of the format. so the CONSTANT is
 *   imported (one owner for the number) while the FORMAT is restated here (a second,
 *   independent witness that reddens if production's changes).
 */
export const asInstallTimeoutWordsExpected = (): string =>
  `${Math.round(INSTALL_TIMEOUT_MS / 60_000)}m`;
