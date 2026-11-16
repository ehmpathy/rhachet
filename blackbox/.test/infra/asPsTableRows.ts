/**
 * .what = the rows of a `ps -o pid=,command=` table, each as its pid and the rest of its line
 * .why = a ps line is a pid, then a command whose words may hold any space; this splits at the
 *   first run of spaces alone
 * .note = with `-E`, ps appends the env after the args, so `rest` then holds args and env both
 */
export const asPsTableRows = (input: {
  psTable: string;
}): Array<{ pid: number; rest: string }> =>
  input.psTable
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\d+\s/.test(line))
    .map((line) => {
      const [pid = '', ...words] = line.split(/\s+/);
      return { pid: Number(pid), rest: words.join(' ') };
    });
