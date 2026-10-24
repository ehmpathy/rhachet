/**
 * .what = extract the PEER inode of our unix socket from `ss -x` output — the inode of the
 *   socket at the other end, read off the line whose LOCAL inode is ours
 * .why =
 *   - `ss -x` lists one line per socket end: `<netid> <state> <rq> <sq> <local> <localInode>
 *     <peer> <peerInode>`. a connected pair shows TWO lines, each with both inodes. a match on
 *     "any line that holds our inode" can land on either, so a pid read off it may be the
 *     server's OWN pid rather than the peer's (measured 2026-10-23: the order flips run to run)
 *   - the line whose LOCAL inode is ours is ours to hold — it cannot vanish while our fd is
 *     open — and its last column names the peer exactly. the peer's owner is then found by
 *     the inode alone, with no host-wide process map
 *
 * .note = pure: the impure caller shells out. returns the peer inode in the UNSIGNED form
 *   `/proc/<pid>/fd` links use (`ss` prints a signed 32-bit form past 2^31)
 * .note = null when no line carries our inode as its local field, or when the peer column is
 *   `0` (the peer end already closed)
 */
export const asSocketPeerInodeFromSs = (input: {
  ssOutput: string;
  inode: string;
  signedInode: string;
}): string | null => {
  // ss prints a signed 32-bit inode; /proc prints unsigned — either form is ours
  const targets = new Set([input.inode, input.signedInode]);

  for (const line of input.ssOutput.split('\n')) {
    // the last three columns are `<localInode> <peerAddr> <peerInode>`; read from the right,
    // so a local path that holds a space never shifts the columns we read
    const tokens = line.trim().split(/\s+/);
    if (tokens.length < 4) continue;
    const localInode = tokens[tokens.length - 3]!;
    const peerInode = tokens[tokens.length - 1]!;
    if (!targets.has(localInode)) continue;
    if (!/^-?\d+$/.test(peerInode) || peerInode === '0') return null;

    // cast the signed form to the unsigned one the fd links carry
    const peerNum = parseInt(peerInode, 10);
    return String(peerNum < 0 ? peerNum + 4294967296 : peerNum);
  }

  return null;
};
