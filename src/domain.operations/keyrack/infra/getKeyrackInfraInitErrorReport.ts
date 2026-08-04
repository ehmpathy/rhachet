import { getKeyrackBlockedReport } from '../getKeyrackBlockedReport';

/**
 * .what = build the human-readable blocked tree report for a `keyrack infra init` failure
 * .why = keyrack roots its output on its own lock glyph 🔐 (never a role mascot); the error
 *        path roots on 🔐 too, so the caller gets one consistent domain voice instead of a
 *        raw exception dump
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
