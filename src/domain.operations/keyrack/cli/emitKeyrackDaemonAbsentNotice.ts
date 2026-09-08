/**
 * .what = announce, on the ROBOT surface, that the answer is `null` because no daemon was
 *         found — and name the command that starts one
 *
 * .why = the human branch already names this cause and its fix:
 *
 *          🔐 keyrack status
 *             └─ daemon: not found
 *                └─ run `rhx keyrack unlock` to start session
 *
 *        the `--json` branch rendered a bare `null` at exit 0. to a caller that value is
 *        indistinguishable from "no keys matched the filter", from "the flag was ignored",
 *        and from a parse failure upstream — four causes, one byte, and a `set -e` caller
 *        walks straight past it. that is `rule.forbid.failhide` on the machine surface: the
 *        json twin of a false zero, and the same defect this round repaired on the human
 *        renders of `list` and `status`
 *
 * .note = the two causes ARE told apart on stdout once a daemon exists: an empty narrow
 *         renders `{ keys: [], … }`, never `null`. so `null` means exactly one thing —
 *         no daemon — which is why it can carry one specific fix
 *
 * ⚠️ .why.stderr = stdout is left EXACTLY as it was (`null`), so no extant parser moves and
 *         `--json` keeps its contract. the cause and the fix ride stderr, where a human and
 *         a log see them and `jq` does not. this is the same split
 *         `emitKeyrackEmptyMachineWideSweepNotice` uses, for the same reason
 *
 * .note = `💡` rather than `✋`, and exit stays 0. an absent daemon is a true, ordinary
 *         answer — `status` on a box with no session is a legitimate ask — so a refusal
 *         glyph would misreport it as caller-must-fix (`rule.require.exit-code-semantics`)
 */
export const emitKeyrackDaemonAbsentNotice = (input: {
  /**
   * .what = the verb whose json answer came back `null`, so the fix line names the command
   *         the human actually ran rather than a generic one
   */
  verb: 'status';

  /**
   * .what = the owner the ask named, so the `fix:` command starts a session on the SAME rack
   *         the read looked at
   * .why = a daemon is per-owner, and the `why:` line above says so outright — "none is active
   *         for this owner". a fix that then drops `--owner` contradicts its own cause line: it
   *         starts a session for the DEFAULT owner, the re-run still reads `null`, and the human
   *         concludes the fix does not work. the same axis the org flag rides at
   *         `getKeyrackKeyGrant.ts` (`rule.require.errors-name-the-fix`)
   * .note = `null` renders no flag — an ask with no `--owner` read the default daemon, and the
   *         fix should start that one
   */
  owner: string | null;
}): void => {
  const ownerFlag = input.owner ? ` --owner ${input.owner}` : '';
  console.error('');
  console.error(
    '💡 heads up — the json answer is `null` because no daemon was found',
  );
  console.error(
    `   ├─ why: \`keyrack ${input.verb} --json\` reports the session daemon, and none is`,
  );
  console.error(
    '   │       active for this owner. an empty FILTER would read `{ "keys": [] }` instead',
  );
  console.error('   └─ fix: start a session, then re-run —');
  console.error(`           rhx keyrack unlock${ownerFlag}`);
  console.error('');
};
