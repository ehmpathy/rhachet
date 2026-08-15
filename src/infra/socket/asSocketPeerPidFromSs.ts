/**
 * .what = extract the peer pid from `ss -xp` output, where the socket inode is a
 *   STRUCTURAL (whitespace-delimited) field — never a raw sub-slice of a token
 * .why =
 *   - `ss -xp` reports one connection per line; the pid we want is the `pid=<n>` on
 *     the line whose address column carries OUR socket inode. the prior lookup did
 *     `grep -E "<inode>"` then a single `.match(/pid=\d+/)` on the whole blob, so an
 *     inode like `451` could partially match an unrelated `4512` / `14513` (or a
 *     `pid=45100`) on a DIFFERENT line and return the WRONG peer's pid
 *   - this is the sole auth gate behind isCallerSameUser (the clone) + the daemon's
 *     session gate — the "scoped to one brain, never the terminal" safety premise —
 *     so a mis-attributed pid is a security-boundary defect. an EXACT token compare
 *     per line, with the pid read ONLY from that line, closes it
 *
 * .note = pure: takes the raw `ss` text (the impure caller shells out), so the
 *   partial-match hazard is unit-testable with real ss-shaped fixtures
 */
export const asSocketPeerPidFromSs = (input: {
  ssOutput: string;
  inode: string;
  signedInode: string;
}): number | null => {
  // ss reports inodes as signed 32-bit; /proc as unsigned — either form is ours
  const targets = new Set([input.inode, input.signedInode]);

  for (const line of input.ssOutput.split('\n')) {
    // ss columns are whitespace-delimited; require an EXACT token equal to the
    // inode, so `451` never partial-matches `4512` (the old bug) nor a `pid=45100`
    const tokens = line.split(/\s+/);
    if (!tokens.some((token) => targets.has(token))) continue;

    // pull the pid from THIS line only — the process tuple beside our inode
    const pid = line.match(/\bpid=(?<pid>\d+)/)?.groups?.pid;
    if (pid) return parseInt(pid, 10);
  }

  return null;
};
