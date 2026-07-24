import { getKeyrackBlockedReport } from '../getKeyrackBlockedReport';

/**
 * .what = build the human-readable blocked tree report for a `keyrack infra init` failure
 * .why = the success path renders a turtle treestruct; the error path must match so the
 *        caller gets one consistent visual language instead of a raw exception dump
 *
 * .note = thin wrapper over the shared getKeyrackBlockedReport that holds the command
 *         label, so the `keyrack infra init` call site stays a one-liner
 */
export const getKeyrackInfraInitErrorReport = (input: {
  error: Error;
}): string =>
  getKeyrackBlockedReport({
    error: input.error,
    command: 'keyrack infra init',
  });
