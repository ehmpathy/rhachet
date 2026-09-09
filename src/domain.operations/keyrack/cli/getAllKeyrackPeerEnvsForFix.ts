/**
 * .what = the OTHER envs whose keys are unlocked, for a `--env` narrow that came back empty
 *
 * .why = when `status --env prep` renders an empty rack, a human's next question is always
 *        "then where ARE my keys?" — so the empty render names the envs that do hold some.
 *        an empty answer with no next move is the friction `rule.require.errors-name-the-fix`
 *        exists to close
 *
 * .why.named = the call site is an orchestrator, and a map + set-dedupe + filter chain there
 *        must be simulated to learn it means "which peer envs hold keys"
 *        (`rule.forbid.inline-decode-friction`). it is also the twin of
 *        `getAllKeyrackStatusKeysForFilter` one block up — that narrow got a name this round,
 *        so its own pipeline reads as the residue it is
 *
 * ⚠️ .note.term = `…ForFix`, never `…ForHint`. `fix` is the canonical word for the third beat
 *        of a helpful failure — the concrete next move — and `hint` / `tip` are its two live
 *        synonyms, recorded as an OPEN dispute (`domain.terms/term=fix._.choice._.md`). while a
 *        dispute is open a NEW contract takes the canonical term, so the sprawl stops where it
 *        stands even before the extant sites are reconciled
 *        (`rule.forbid.domain-term-synonyms`)
 *
 * ⚠️ .note.sudo = `sudo` is excluded by design, never by accident. a sudo key is unlocked by an
 *        explicit `--env sudo --key <name>` and is never swept, so to advertise it as a place to
 *        look would send a human toward a narrow that cannot serve them
 */
export const getAllKeyrackPeerEnvsForFix = (input: {
  /** the unlocked keys the rack holds, across every env */
  keys: { env: string }[];
  /** the env the human asked for — the one excluded from the answer */
  env: string;
}): string[] => {
  const envsHeld = new Set(input.keys.map((key) => key.env));
  return [...envsHeld].filter((env) => env !== input.env && env !== 'sudo');
};
