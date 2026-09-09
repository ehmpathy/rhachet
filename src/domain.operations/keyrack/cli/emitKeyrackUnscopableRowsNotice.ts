import { KEYRACK_VALID_ENVS } from '../constants';

/**
 * .what = announce that a filtered sweep dropped rows which carry no scope a filter can read, so
 *         a human never reads a filter miss as an absent credential
 *
 * ⚠️ .why.look-alike = the header says "carry no scope a filter can read", NOT "name no org and
 *         no env" — because the hardest row is one that DOES appear to name both. a row like
 *         `testorg.mainframe.OTHER_KEY` has three dot-segments and reads as `<org>.<env>.<key>`
 *         at a glance; it fails only because `mainframe` is no recognized env. phrased the older
 *         way, a human read a true statement as flatly wrong for the very row that most needed
 *         the explanation. so the `why:` now names the RULE that row breaks — <env> must be one of
 *         the recognized envs — and spells the list, rather than explain the mechanism generically
 *         and leave the reader to doubt a correct answer
 * .why = a `--org`/`--env` filter narrows on a slug's segments, so a host-manifest row that is
 *        not a full slug survives no filter at all. the drop is correct and the exit is 0, which
 *        together make it invisible: the rack looks smaller than it is, and the row that vanished
 *        is the one most likely to be malformed in the first place (`rule.forbid.failhide` — the
 *        drop stays, the silence goes)
 *
 * .note = emitted ONLY when a filter is active AND at least one row was unfilterable. an
 *         unfiltered sweep renders every row, so it has none to announce
 *
 * ⚠️ .why.stderr = a filtered `list`/`status` stdout is what a human greps and a caller parses;
 *         guidance rides stderr so neither is disturbed (the same split
 *         `emitKeyrackEmptyMachineWideSweepNotice` holds)
 * ⚠️ .why.glyph = `💡`, never a role mascot — keyrack roots on its own palette
 *         (`rule.require.keyrack-emoji-palette`). `💡` rather than `✋`: the sweep SUCCEEDED and
 *         exits 0, so a caller-must-fix glyph would misreport a true answer as a refusal
 * ⚠️ .why.rows-label = the dropped rows hang under a `rows:` branch, never as bare leaves beside
 *         `why:`/`fix:`. unlabeled, a row name sat at the SAME depth as the two explanation
 *         branches, so `LEGACY_KEY` and `why:` read as peers and a human had to infer which
 *         leaves were data and which were prose. the label is the extant convention for
 *         multi-item content in this family (`firewall --org`'s `hint:` nests its two lines the
 *         same way) — `rule.forbid.snapshot-visual-blemishes`, `rule.forbid.ambiguous-labels`
 */
export const emitKeyrackUnscopableRowsNotice = (input: {
  /** .what = the rows that name neither an org nor an env, so no filter could claim them */
  slugs: string[];
}): void => {
  if (input.slugs.length === 0) return;

  console.error('');
  console.error(
    `💡 heads up — ${input.slugs.length} row(s) on this rack carry no scope a filter can read`,
  );
  console.error('   ├─ rows:');
  input.slugs.forEach((slug, index) =>
    console.error(
      `   │  ${index === input.slugs.length - 1 ? '└─' : '├─'} ${slug}`,
    ),
  );
  console.error(
    "   ├─ why: a filter narrows on a slug's `<org>.<env>.<key>` segments, and <env>",
  );
  console.error(
    `   │       must be one of ${KEYRACK_VALID_ENVS.join(', ')} — so a row that`,
  );
  console.error(
    '   │       names none, or that merely LOOKS like a slug (a middle segment that',
  );
  console.error(
    '   │       is no env), survives NO filter. it is hidden here, not absent',
  );
  console.error(
    '   └─ fix: re-run without --org/--env to see it, or re-key the row in the host',
  );
  console.error(
    '           manifest as `<org>.<env>.<key>` so a scope flag can address it',
  );
  console.error('');
};
