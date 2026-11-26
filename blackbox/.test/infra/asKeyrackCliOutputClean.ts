import { asSnapshotSafe } from './invokeRhachetCliBinary';

/**
 * .what = keyrack cli output made stable for a snapshot: temp paths masked, a canned github
 *         token masked, timestamps masked, blanks at line ends dropped
 * .why = the shared mask of every github-app blackbox suite, so each snapshot reads the same way
 */
export const asKeyrackCliOutputClean = (input: { output: string }): string =>
  asSnapshotSafe(input.output)
    .replace(/ghs_canned\w+/g, 'ghs___CANNED__')
    .replace(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g,
      '__ISO_TIMESTAMP__',
    )
    .replace(/[ \t]+$/gm, '')
    .trim();
