import { asPsTableRows } from './asPsTableRows';

/**
 * .what = the marked processes from two `ps` tables: one with each process's env appended
 *   (`ps -E`), one with its command alone
 * .why = `ps -E` puts the env after the args with no seam between them, so the mark is read from
 *   the first table and the whole command from the second, joined by pid
 * .note = a pid in the first table and absent from the second exited between the two reads; it
 *   is skipped
 */
export const asProcessesWithEnvMarkFromPsTables = (input: {
  psTableWithEnv: string;
  psTable: string;
  marker: string;
}): Array<{ pid: number; command: string; cwd: null }> => {
  const pidsMarked = asPsTableRows({ psTable: input.psTableWithEnv })
    .filter((row) => row.rest.split(/\s+/).includes(input.marker))
    .map((row) => row.pid);
  const commandByPid = new Map(
    asPsTableRows({ psTable: input.psTable }).map((row) => [row.pid, row.rest]),
  );
  return pidsMarked.flatMap((pid) => {
    const command = commandByPid.get(pid);
    return command === undefined ? [] : [{ pid, command, cwd: null }];
  });
};
