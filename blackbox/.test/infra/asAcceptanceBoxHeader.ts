/**
 * .what = the header a run prints first: which box, what width, what priority, and the next
 *   move — the way to go wide, or the way back from an asked width
 * .why = a reader sees at once why the run is as wide as it is; a width the runner asked for
 *   reads apart from the box's default
 * .note = the go-wide hint is `100%`, which widens past the shared default on any box of two or
 *   more cores; `50%` would not on a 2-core box, where both floor to one worker
 */
export const asAcceptanceBoxHeader = (input: {
  box: 'ci' | 'shared';
  maxWorkersDefault: string | number;
  maxWorkers: number;
  cores: number;
  niceNow: number;
}): string => {
  const isWidthDefault =
    input.maxWorkers === asWorkerCount({ ask: input.maxWorkersDefault, cores: input.cores });
  const widthSource = isWidthDefault
    ? `${input.box === 'ci' ? 'ci' : 'shared-box'} default`
    : 'asked';
  const boxWhy =
    input.box === 'shared'
      ? ' (no GITHUB_ACTIONS host signal; CI=true alone does not widen)'
      : '';
  // the tail names the next move: go wide from the default, or come back from an asked width
  const tailShared = isWidthDefault
    ? '   └─ to go wide, pass --maxWorkers 100%'
    : '   └─ the width you asked; drop --maxWorkers for the shared-box default';
  const tailCi = isWidthDefault
    ? '   └─ ci keeps its full width, at normal priority'
    : '   └─ the width this ci step asked, at normal priority';
  const tail = input.box === 'shared' ? tailShared : tailCi;
  return [
    'ℹ acceptance width',
    `   ├─ box = ${input.box}${boxWhy}`,
    `   ├─ workers = ${input.maxWorkers} of ${input.cores} cores (${widthSource})`,
    `   ├─ priority = nice ${input.niceNow}`,
    tail,
    '',
  ].join('\n');
};

/**
 * .what = the worker count jest resolves from a maxWorkers ask
 * .note = jest floors a percent of the cores, and never goes below one
 */
const asWorkerCount = (input: { ask: string | number; cores: number }): number => {
  if (typeof input.ask === 'number') return input.ask;
  const percent = Number.parseInt(input.ask, 10);
  return Math.max(1, Math.floor((percent / 100) * input.cores));
};
