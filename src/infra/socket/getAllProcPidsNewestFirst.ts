import { readdirSync, readFileSync } from 'node:fs';
import { isSkippableProcError } from './isSkippableProcError';

/**
 * .what = every pid on the host but our own, ordered by start time, newest first
 * .why = a socket holder scan looks for a caller, and a caller is most often a process that just
 *   started, so newest-first ends the scan within a few pids. the pid number is no age: once the
 *   pid space wraps, an old process can hold a higher pid than a new one (measured 2026-10-23:
 *   live pids up to 4.1M beside a fresh peer at 1.05M, 381 pids deep by pid order)
 */
export const getAllProcPidsNewestFirst = (): number[] =>
  readdirSync('/proc')
    .filter((name) => /^\d+$/.test(name))
    .map((name) => parseInt(name, 10))
    .filter((pid) => pid !== process.pid)
    .map((pid) => ({ pid, startTicks: getProcStartTicks({ pid }) }))
    .filter((row) => row.startTicks !== null)
    .sort((a, b) => b.startTicks! - a.startTicks!)
    .map((row) => row.pid);

/**
 * .what = when a process started, in clock ticks since boot (`/proc/<pid>/stat` field 22)
 * .why = the sort key for a newest-first scan; null when the process is gone or unreadable
 * .note = the command name (field 2) is parenthesized and may hold spaces or a `)`, so the
 *   fields are read after its LAST `)`, where field 3 sits at offset 0 and field 22 at 19
 */
const getProcStartTicks = (input: { pid: number }): number | null => {
  const stat = (() => {
    try {
      return readFileSync(`/proc/${input.pid}/stat`, 'utf8');
    } catch (error) {
      if (isSkippableProcError(error)) return null;
      throw error;
    }
  })();
  if (stat === null) return null;
  const ticks = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19];
  return ticks === undefined ? null : Number(ticks);
};
