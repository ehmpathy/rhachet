import { spawnSync } from 'node:child_process';

import { MalfunctionError } from 'helpful-errors';

/**
 * .what = spawn a real-node probe child, decode its REPORT_START..REPORT_END envelope, and
 *         return the parsed report typed as the caller's declared TReport
 * .why  = the *.realnode.acceptance.test.ts suites each spawn a probe against the built dist
 *         and decode the same envelope, then JSON.parse it to the same shape; this shares the
 *         spawn + decode + parse so each case differs only by its probe args, cwd, and the
 *         TReport it declares — the single centralized boundary cast lives here, not repeated
 *         at every call site. jest refuses native import() without --experimental-vm-modules
 *         (which breaks the harness), so a real node child against the BUILT dist is the only
 *         honest witness for the #429 fix (ehmpathy/rhachet#429).
 * .note = fails loud (MalfunctionError) on a non-zero exit, an absent report envelope, or an
 *         unparseable report — never a silent pass (rule.forbid.failhide).
 * .note = the JSON.parse result is cast to TReport — the one boundary cast for the probe's
 *         report shape (rule.forbid.as-cast). the probe's stdout is untyped json; the caller
 *         declares the shape it wrote in the probe. removal path: a report type shared between
 *         each probe and its test.
 */
export const spawnProbeBetween = <TReport>(input: {
  args: string[];
  label: string;
  options?: { cwd?: string };
}): TReport => {
  const result = spawnSync(process.execPath, input.args, input.options ?? {});

  const stdout = (result.stdout ?? Buffer.from('')).toString('utf-8');
  const stderr = (result.stderr ?? Buffer.from('')).toString('utf-8');

  // failfast loud if the probe did not exit clean (never a silent pass)
  if (result.status !== 0)
    throw new MalfunctionError(`the ${input.label} probe failed`, {
      status: result.status,
      stdout,
      stderr,
    });

  const between = stdout.split('REPORT_START')[1]?.split('REPORT_END')[0];
  if (!between)
    throw new MalfunctionError('the probe emitted no report', {
      stdout,
      stderr,
    });

  // parse + cast to the caller's declared report shape (the one centralized boundary cast)
  try {
    return JSON.parse(between) as TReport;
  } catch (error) {
    throw new MalfunctionError('the probe report was not valid json', {
      between,
      stdout,
      stderr,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
