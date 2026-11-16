/**
 * .what = the `some avg10` percent from the text of /proc/pressure/cpu, or null if absent
 * .note = the file reads `some avg10=12.34 avg60=… total=…`, then a `full` line on newer kernels
 */
export const asCpuPsiSomeAvg10 = (input: { content: string }): number | null => {
  const match = /^some avg10=([\d.]+)/m.exec(input.content);
  return match ? Number(match[1]) : null;
};
