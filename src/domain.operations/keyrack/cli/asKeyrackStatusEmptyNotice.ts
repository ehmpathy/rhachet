/**
 * .what = the one line `status` renders when the narrowed rack came back EMPTY
 *
 * .why = an empty rack has two wholly different causes — a filter ate the keys, or the daemon
 *        holds none — and a human must be told WHICH. told the wrong one, they go chase a rack
 *        that was there all along, or check a flag that was never at fault. so the two are
 *        decided here, once, from the facts (`rule.forbid.failhide`)
 *
 * ⚠️ .why.named = the call site is an orchestrator, and this decision spelled inline is two
 *        filtered joins plus a compound conditional a reader must simulate
 *        (`rule.forbid.inline-decode-friction`). worse, it was UNTESTABLE there: the
 *        daemon-active-but-empty case had no acceptance row, so a change to it moved no
 *        snapshot and no test went red. a named operation is what lets a unit test pin it
 *
 * ⚠️ .why.two-axes = `--env` and `--org` are INDEPENDENT, and a human composes them in one
 *        command. the extant render knew only `--env`, so `--org @al` — a flag this wish added
 *        — fell to the unfiltered branch and said "(no keys unlocked)" while a key WAS unlocked.
 *        a flag we add owns its own empty answer, so both axes are named here or neither is
 *
 * .note = each axis carries its OWN `try …` clause rather than one merged list. that is not
 *         verbosity: the axes are independent, so `try --env prep or --org ehmpathy` would read
 *         as "either alone fixes it" — which for a compound narrow is a claim we cannot make
 */
export const asKeyrackStatusEmptyNotice = (input: {
  /**
   * .what = the env the human spelled, or null when the flag was absent
   * .why = REQUIRED-nullable per `rule.forbid.undefined-inputs` — "no filter" is a real answer
   *        that must be stated, never inferred from an omitted property
   */
  env: string | null;

  /**
   * .what = the org the human SPELLED, or null when the flag was absent
   * .note = the spelled org, never the expanded one, so a human sees back the flag they typed.
   *         `--org @this` must read as `@this` here even though the filter ran on `ehmpathy`
   */
  org: string | null;

  /**
   * .what = how many keys the daemon holds BEFORE any narrow
   * .why = this is the whole guard. `> 0` means a filter is at fault; `0` means it is innocent,
   *        and to blame it would send a human to check a flag that was never the cause
   */
  countBefore: number;

  /** .what = the composed `try --env …` clause, or null when no peer env holds keys */
  fixEnv: string | null;

  /** .what = the composed `try --org …` clause, or null when no peer org holds keys */
  fixOrg: string | null;
}): string => {
  const spelled = [
    input.env ? `--env ${input.env}` : null,
    input.org ? `--org ${input.org}` : null,
  ]
    .filter((one): one is string => one !== null)
    .join(' ');

  // no filter was spelled, or the daemon is genuinely empty ⇒ blame no filter
  if (!spelled || input.countBefore === 0) return '(no keys unlocked)';

  const fixes = [input.fixEnv, input.fixOrg].filter(
    (one): one is string => one !== null,
  );
  const fixSaid = fixes.length ? `, ${fixes.join(', ')}` : '';
  return `(no keys in ${spelled}${fixSaid})`;
};
