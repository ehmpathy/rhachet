import { readdirSync, readFileSync, readlinkSync } from 'node:fs';

import { asProcessesWithEnvMarkFromPsTables } from './asProcessesWithEnvMarkFromPsTables';
import { getOnePsTable } from './getOnePsTable';

/**
 * .what = every live process whose env carries a mark (`KEY=value`)
 * .why = every process a test spawns inherits its env: the cli child, the detached enroll host,
 *   the brain stub (each hop passes `process.env` whole). so a mark set once finds exactly
 *   those processes — the run's id finds the run's, a test's own mark finds the test's — and
 *   never a peer suite's or a human's
 *
 * .note = linux reads `/proc/<pid>/environ`; macos reads `ps -E`, which shows the env of the
 *   caller's own processes. a process of another user is unreadable, and is not ours anyway
 * .note = a process that exits mid-scan is skipped, never an error
 * .note = async, so the macos `ps` read never freezes the loop that drains a live pty
 */
export const getAllProcessesWithEnvMark = async (input: {
  envMark: string;
  pidsExcluded: number[];
}): Promise<Array<ProcessWithEnvMark>> => {
  const found =
    process.platform === 'linux'
      ? getAllViaProcfs({ marker: input.envMark })
      : await getAllViaPs({ marker: input.envMark });
  return found.filter((proc) => !input.pidsExcluded.includes(proc.pid));
};

/**
 * .what = a marked process: its pid, its argv on one line, and its cwd where the host shows it
 * .why = the cwd of a test's process sits in that test's temp dir, whose slug names the test
 */
export interface ProcessWithEnvMark {
  pid: number;
  command: string;
  cwd: string | null;
}

/**
 * .what = scan /proc for processes whose environ holds the marker
 */
const getAllViaProcfs = (input: { marker: string }): Array<ProcessWithEnvMark> =>
  getAllPidsUnderProcfs()
    .map((pid) => getOneProcessWithEnvMarkAtPid({ pid, marker: input.marker }))
    .filter(isProcessFound);

/**
 * .what = the pid of every process /proc lists
 * .note = /proc holds a dir per pid beside its own entries (`self`, `meminfo`); only an all-digit
 *   name is a pid
 */
const getAllPidsUnderProcfs = (): number[] =>
  readdirSync('/proc')
    .filter((name) => /^\d+$/.test(name))
    .map(Number);

/**
 * .what = whether a per-pid read found a marked process
 */
const isProcessFound = (found: ProcessWithEnvMark | null): found is ProcessWithEnvMark =>
  found !== null;

/**
 * .what = the process at one pid, if its environ holds the marker; else null
 */
const getOneProcessWithEnvMarkAtPid = (input: {
  pid: number;
  marker: string;
}): ProcessWithEnvMark | null => {
  // only a process whose env carries the marker is ours
  const environ = getOneProcTextOrNull({
    read: () => readFileSync(`/proc/${input.pid}/environ`, 'utf8'),
  });
  if (environ === null) return null;
  if (!environ.split('\0').includes(input.marker)) return null;

  // one line per process: an inline `-e` source carries its own line breaks
  const cmdline =
    getOneProcTextOrNull({ read: () => readFileSync(`/proc/${input.pid}/cmdline`, 'utf8') }) ??
    '';
  const command = cmdline.split('\0').join(' ').replace(/\s+/g, ' ').trim();
  const cwd = getOneProcTextOrNull({ read: () => readlinkSync(`/proc/${input.pid}/cwd`) });
  return { pid: input.pid, command, cwd };
};

/**
 * .what = scan `ps -E` for processes whose env holds the marker
 * .note = `ps` shows no cwd, so it is null here
 */
const getAllViaPs = async (input: { marker: string }): Promise<Array<ProcessWithEnvMark>> =>
  asProcessesWithEnvMarkFromPsTables({
    psTableWithEnv: await getOnePsTable({ args: ['-axEww', '-o', 'pid=,command='] }),
    psTable: await getOnePsTable({ args: ['-axww', '-o', 'pid=,command='] }),
    marker: input.marker,
  });

/**
 * .what = the text of a proc entry, or null when the process left or the entry is not ours
 * .why = a process may exit between the dir list and the read; another user's is unreadable
 * .note = the same allowlist as the prod socket scan (`src/infra/socket/isSkippableProcError.ts`),
 *   kept local since blackbox infra reaches no internals
 */
const getOneProcTextOrNull = (input: { read: () => string }): string | null => {
  try {
    return input.read();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    if (code === 'ENOENT' || code === 'EACCES' || code === 'ESRCH') return null;
    throw error;
  }
};
