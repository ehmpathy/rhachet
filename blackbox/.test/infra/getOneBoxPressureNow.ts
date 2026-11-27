import { readFileSync } from 'node:fs';
import { availableParallelism, loadavg } from 'node:os';

import { asCpuPsiSomeAvg10 } from './asCpuPsiSomeAvg10';

/**
 * .what = the cpu contention of a box at one moment
 */
export interface BoxPressure {
  cpuPsiSomeAvg10: number | null;
  load1: number;
  cores: number;
}

/**
 * .what = how contended the box's cpu is right now
 * .why = a test that times out on a starved box may not be a defect; the run's end names the
 *   pressure it saw, so a reader can tell the two apart
 *
 * .note = cpu psi (`some avg10`, the share of the last 10s that some task waited for a cpu) is
 *   linux-only; elsewhere it is null and the 1m load over the core count stands in
 * .note = psi counts this suite's own waits too, so it grades the box, never the suite alone
 */
export const getOneBoxPressureNow = (): BoxPressure => {
  const psiText = getOnePsiTextOrNull();
  return {
    cpuPsiSomeAvg10: psiText === null ? null : asCpuPsiSomeAvg10({ content: psiText }),
    load1: loadavg()[0] ?? 0,
    cores: availableParallelism(),
  };
};

/**
 * .what = read /proc/pressure/cpu, or null on a host that has none (macos, an old kernel)
 */
const getOnePsiTextOrNull = (): string | null => {
  try {
    return readFileSync('/proc/pressure/cpu', 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    if (code === 'ENOENT' || code === 'EOPNOTSUPP' || code === 'EACCES') return null;
    throw error;
  }
};
