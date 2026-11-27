import { asMeasureRecordName } from './asMeasureRecordName';

/**
 * .what = the file name of one width's suite log, beside the measure's record
 * .why = the suite's output is the only place its red names a cause; the log shares the record's
 *   stamp, so the two sort together, and its width reads in the name (`%` spelled `pct`, so the
 *   name is safe to paste in any shell)
 */
export const asMeasureSuiteLogName = (input: { at: Date; width: string }): string =>
  asMeasureRecordName({ at: input.at }).replace(
    /\.json$/,
    `.width=${input.width.replace(/%/g, 'pct')}.suite.log`,
  );
