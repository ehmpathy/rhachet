/**
 * .what = announce that a repo sweep narrowed to `--org @all` is empty BY CONSTRUCTION, and
 *         name the keyed form that reads the machine-wide rack instead
 * .why = every slug a repo sweep yields comes from `manifest.org`
 *        (`getAllKeyrackSlugsForEnv`), so a repo manifest can never emit an `@all.*` key. the
 *        empty set is the TRUE answer — but silence is not: a human who read the help
 *        (`--org @all (machine-wide keys)`) and reached for it here gets an empty export,
 *        exit 0, and no word of why (`rule.require.errors-name-the-fix`)
 *
 * .note = this is the one narrow that is STRUCTURALLY empty. any other empty filter is a real,
 *         contingent answer about this rack, so it earns no notice
 *
 * ⚠️ .why.stderr = the notice rides on stderr, never stdout, and BOTH callers need that, for
 *         reasons that differ. `source`'s stdout is EVAL'd (`eval "$(rhx keyrack source ...)"`),
 *         so a line on stdout would be executed as shell. `get --json`'s stdout is PARSED, so a
 *         line on stdout would break the parse. either way the human sees the guidance and the
 *         machine sees only what it expects
 *
 * ⚠️ .why.glyph = `💡`, never a role mascot. keyrack output roots on `🔐` and its own palette
 *         (`rule.require.keyrack-emoji-palette`); a `🐢` here would wear the MECHANIC's face on
 *         rhachet's own cli, which `rule.prefer.emoji-language` names a blocker
 * .note = `💡` rather than `✋`: the sweep SUCCEEDED and exits 0. `✋` means caller-must-fix, so
 *         it would misreport a true answer as a refusal (`rule.require.exit-code-semantics`)
 */
export const emitKeyrackEmptyMachineWideSweepNotice = (input: {
  env: string | null;

  /**
   * .what = the verb whose sweep came back empty, so the `fix:` line names the command the
   *         human actually typed
   * .why = a `get --for repo --org @all` that answered `rhx keyrack source --key …` would
   *        hand a human a DIFFERENT verb than the one they ran — a fix line that does not
   *        follow from the ask reads as a non-sequitur (`rule.require.errors-name-the-fix`)
   */
  verb: 'source' | 'get';

  /**
   * .what = the owner the ask named, so the `fix:` command reads the SAME rack the sweep read
   * .why = a keyrack is per-owner. a fix line that drops `--owner` sends a human who ran
   *        `--owner ehmpath` to the DEFAULT owner's rack, where the key they were told to name
   *        is genuinely absent — so the fix answers a different question than the one asked.
   *        this is the same defect the org flag carries in `getKeyrackKeyGrant.ts`, on a
   *        second axis: a scope the ask carried must ride through to the fix, or the fix walks
   *        the human somewhere they did not ask about (`rule.require.errors-name-the-fix`)
   * .note = `null` renders no flag, which is exactly right — an ask with no `--owner` read the
   *         default rack, and the fix should too
   */
  owner: string | null;
}): void => {
  const ownerFlag = input.owner ? `--owner ${input.owner} ` : '';
  console.error('');
  console.error('💡 heads up — a repo sweep holds no machine-wide keys');
  console.error(
    '   ├─ why: a repo keyrack.yml declares keys under its OWN org, so a sweep of it',
  );
  console.error(
    '   │       can never yield an `@all.*` key — the filter is empty by construction',
  );
  console.error(
    '   └─ fix: name the key outright, which needs no repo keyrack at all —',
  );
  console.error(
    `           rhx keyrack ${input.verb} ${ownerFlag}--key @all.${input.env ?? '<env>'}.<name>`,
  );
  console.error('');
};
