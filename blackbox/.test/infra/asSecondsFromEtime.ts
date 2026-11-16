/**
 * .what = seconds from a `ps` etime, `[[dd-]hh:]mm:ss`
 * .why = a process's age is how a run tells a stub of today from one an earlier run left
 */
export const asSecondsFromEtime = (input: { etime: string }): number => {
  const [daysPart, clockPart] = input.etime.includes('-')
    ? input.etime.split('-')
    : ['0', input.etime];
  const units = (clockPart ?? '').split(':').map(Number).reverse();
  const [seconds = 0, minutes = 0, hours = 0] = units;
  return Number(daysPart) * 86400 + hours * 3600 + minutes * 60 + seconds;
};
