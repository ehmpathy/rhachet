/**
 * .what = derive the pid file path a daemon owns, from its socket path
 * .why = the .sock and .pid files are a pair minted together and unlinked together,
 *        so the one rule that relates them belongs in one named place rather than
 *        re-stated as a regex at each site that needs the companion path
 *
 * .note = the pair is asymmetric by design: getKeyrackDaemonSocketPath is the sole
 *         source of daemon identity, and the pid path is derived from it — never the
 *         reverse. so there is no asKeyrackDaemonSocketPath twin to write
 */
export const asKeyrackDaemonPidPath = (input: {
  socketPath: string;
}): string => {
  return input.socketPath.replace(/\.sock$/, '.pid');
};
