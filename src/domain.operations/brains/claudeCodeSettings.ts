/**
 * .what = the claude settings-file contract, as core reads it: the file names, the shape of a
 *         settings file, and the dao that reads and writes one
 * .why = the ONE seam where core meets the anthropic adapter. core's actor, enroll and init
 *        operations import the contract from here, never from the adapter's tree, so a change
 *        inside the adapter lands in one file of core — or, once core consumes the published
 *        package, this file alone swaps its source
 *
 * .note = the adapter is staged in this repo (`src/_topublish/`) and imports core's own domain
 *   types, so core cannot yet take it as a package dependency without a cycle; this port is the
 *   boundary until it can
 * .note = it re-exports from the two leaf modules, never the adapter's index — the index also
 *   loads the hooks adapter, a graph these four names never need (rule.require.thinnest-import-path)
 */
export {
  type ClaudeCodeSettings,
  readClaudeCodeSettings,
  writeClaudeCodeSettings,
} from '@src/_topublish/rhachet-brains-anthropic/src/hooks/config.dao';
export { CLAUDE_SETTINGS_FILENAMES } from '@src/_topublish/rhachet-brains-anthropic/src/hooks/constants';
