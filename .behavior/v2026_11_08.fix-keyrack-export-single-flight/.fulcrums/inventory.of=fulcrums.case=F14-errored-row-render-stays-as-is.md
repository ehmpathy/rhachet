# F14 — the unlock's errored row shows an export malfunction's hint after its retry

- **fork** — change `asKeyrackErroredKeyTip` to show a MalfunctionError's hint (it showed a hint only
  for a ConstraintError), or leave that shared render and only make sure the export's errors reach it
  unburied
- **taken** — both, scoped by opt-in. the vault's pre-warm passes our own HelpfulError through whole,
  and a non-constraint fault that sets `hintAfterRetry: true` renders as
  `— retry: <keyed unlock>; if it recurs, <hint>`. the keyed retry stays first, since a transient fault
  cures on re-run; the hint follows for the fault that recurs (a hand-run command). the four export
  malfunctions of `genAwsProfileExport` set it. every other fault, in every other vault, renders exactly
  as on main, and a ConstraintError's row is unchanged
- **reach** — aws.config's export faults only. an earlier form applied the suffix to every malfunction
  and moved the aws.params ssm row; two l3 reviewers named that a leak past the nano bound, so the
  suffix became opt-in and the aws.params snap is back to main's bytes
- **rework** — clean. one opt-in flag read in `asKeyrackErroredKeyTip`, the flag on four throws, the unit
  cases
- **confidence 85%, short because** — a metadata flag is a soft contract: a future fault that wants the
  suffix must know to set it
- **verdict** — done in this pr, at the reviewer's ask (rule.forbid.deferrals-short-of-a-dedicated-pr)
